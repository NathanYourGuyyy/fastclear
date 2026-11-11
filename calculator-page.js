const CONVEX_SITE_URL = "https://PASTE_PRODUCTION_CONVEX_SITE_URL";

const SUPPORT_EMAIL = "nathanyourguyyy@gmail.com";
const STORAGE_KEY = "fastclearCalculatorLead";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");

const emailGate = document.getElementById("email-gate");
const calculatorPanel = document.getElementById("calculator-panel");
const emailForm = document.getElementById("email-form");
const quoteForm = document.getElementById("quote-form");
const emailInput = document.getElementById("email-input");
const honeypotInput = document.getElementById("company-website");
const unlockButton = document.getElementById("unlock-button");
const estimateButton = document.getElementById("estimate-button");
const emailError = document.getElementById("email-error");
const quoteError = document.getElementById("quote-error");
const weightHint = document.getElementById("weight-hint");
const registeredEmail = document.getElementById("registered-email");
const weightInput = document.getElementById("weight-input");
const quoteResult = document.getElementById("quote-result");
const resultTotal = document.getElementById("result-total");
const resultBreakdown = document.getElementById("result-breakdown");
const resultEmailMessage = document.getElementById("result-email-message");

let currentEmail = "";
let destination = "UK";

function validEmail(value) {
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : "";
}

function setMessage(element, message) {
  element.textContent = message;
  element.hidden = message === "";
}

function setButtonLoading(button, isLoading, idleText, loadingText) {
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : idleText;
}

function storeRegisteredEmail(email) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ registered: true, email }));
  } catch (error) {
    console.warn("Could not save calculator email in this browser.", error);
  }
}

function clearRegisteredEmail() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Could not clear the saved calculator email.", error);
  }
}

function getRegisteredEmail() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || saved.registered !== true || typeof saved.email !== "string") {
      return "";
    }
    return validEmail(saved.email);
  } catch (error) {
    console.warn("Could not read the saved calculator email.", error);
    return "";
  }
}

function setPanel(panelToShow, panelToHide) {
  panelToShow.hidden = false;
  panelToShow.classList.add("is-entering");
  panelToShow.setAttribute("aria-hidden", "false");
  panelToHide.setAttribute("aria-hidden", "true");

  if (REDUCED_MOTION.matches) {
    panelToShow.classList.remove("is-entering");
    panelToHide.hidden = true;
    return;
  }

  const finishEntrance = () => panelToShow.classList.remove("is-entering");
  requestAnimationFrame(finishEntrance);
  window.setTimeout(finishEntrance, 100);

  window.setTimeout(() => {
    panelToHide.hidden = true;
  }, 210);
}

function showCalculator(email) {
  currentEmail = email;
  registeredEmail.textContent = email;
  setMessage(emailError, "");
  setPanel(calculatorPanel, emailGate);
}

function showEmailGate() {
  currentEmail = "";
  emailInput.value = "";
  setMessage(quoteError, "");
  quoteResult.hidden = true;
  clearRegisteredEmail();
  setPanel(emailGate, calculatorPanel);
  emailInput.focus();
}

async function callFunction(path, payload) {
  const configuredUrl = CONVEX_SITE_URL.trim().replace(/\/+$/, "");
  const isLocalPage = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const siteUrl = configuredUrl === "https://PASTE_PRODUCTION_CONVEX_SITE_URL" && isLocalPage
    ? `http://${window.location.hostname}:3211`
    : configuredUrl;
  const isLocalDevelopmentUrl = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(siteUrl);
  if (!siteUrl.startsWith("https://") && !isLocalDevelopmentUrl) {
    throw new Error("The calculator is not connected yet. Please contact support.");
  }

  let response;
  try {
    response = await fetch(`${siteUrl}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("We could not reach the calculator service. Check your connection and try again.");
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("We could not read the server response. Please try again.");
  }

  if (!response.ok || !result || result.ok !== true) {
    throw new Error(typeof result?.error === "string" ? result.error : "The request could not be completed.");
  }

  return result;
}

function formatNaira(amount) {
  return `₦${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(amount)}`;
}

emailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(emailError, "");

  const email = validEmail(emailInput.value);
  if (!email) {
    setMessage(emailError, "Enter a valid email address.");
    emailInput.focus();
    return;
  }

  setButtonLoading(unlockButton, true, "Unlock calculator", "Unlocking...");
  try {
    await callFunction("register-email", {
      email,
      website: honeypotInput.value,
    });
    storeRegisteredEmail(email);
    showCalculator(email);
  } catch (error) {
    setMessage(emailError, error instanceof Error ? error.message : "We could not register your email. Please try again.");
  } finally {
    setButtonLoading(unlockButton, false, "Unlock calculator", "Unlocking...");
  }
});

document.getElementById("change-email").addEventListener("click", showEmailGate);

document.querySelectorAll("[data-destination]").forEach((button) => {
  button.addEventListener("click", () => {
    destination = button.dataset.destination;
    document.querySelectorAll("[data-destination]").forEach((option) => {
      const selected = option === button;
      option.classList.toggle("is-selected", selected);
      option.setAttribute("aria-pressed", String(selected));
    });
    quoteResult.hidden = true;
    setMessage(quoteError, "");
  });
});

document.querySelectorAll("[data-weight-step]").forEach((button) => {
  button.addEventListener("click", () => {
    const step = Number(button.dataset.weightStep);
    const current = Number(weightInput.value);
    const base = Number.isFinite(current) && current > 0 ? current : 0.1;
    const next = Math.min(10000, Math.max(0.1, Math.round((base + step * 0.1) * 10) / 10));
    weightInput.value = next.toFixed(1);
    weightHint.textContent = "Enter a weight greater than 0 and no more than 10,000 kg.";
    weightInput.focus();
  });
});

weightInput.addEventListener("input", () => {
  weightHint.textContent = "Enter a weight greater than 0 and no more than 10,000 kg.";
});

document.querySelectorAll('input[name="method"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    document.querySelectorAll(".calculator-method").forEach((card) => {
      card.classList.toggle("is-selected", card.querySelector("input").checked);
    });
    quoteResult.hidden = true;
    setMessage(quoteError, "");
  });
});

quoteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(quoteError, "");

  const weightKg = Number(weightInput.value);
  if (
    !weightInput.value.trim() ||
    !Number.isFinite(weightKg) ||
    weightKg <= 0 ||
    weightKg > 10000
  ) {
    quoteResult.hidden = true;
    weightHint.textContent = "Please enter a weight from 0.1 to 10,000 kg to get an estimate.";
    weightInput.focus();
    return;
  }

  const method = quoteForm.querySelector('input[name="method"]:checked')?.value;
  if (method !== "sea" && method !== "express") {
    setMessage(quoteError, "Choose a shipping method.");
    return;
  }

  setButtonLoading(estimateButton, true, "Get my estimate", "Preparing estimate...");
  quoteResult.hidden = true;
  try {
    const result = await callFunction("send-quote", {
      email: currentEmail,
      destination,
      method,
      weightKg,
    });

    if (
      !Number.isSafeInteger(result.totalNgn) ||
      result.totalNgn <= 0 ||
      !Number.isFinite(result.ratePerKg) ||
      result.ratePerKg <= 0 ||
      !Number.isFinite(result.weightKg) ||
      result.weightKg <= 0
    ) {
      throw new Error("The server returned an invalid estimate. Please try again.");
    }

    const destinationName = result.destination === "UK" ? "UK" : result.destination === "US" ? "US" : "";
    const methodName = result.method === "sea" ? "Sea" : result.method === "express" ? "Express" : "";
    if (!destinationName || !methodName) {
      throw new Error("The server returned an invalid estimate. Please try again.");
    }

    const formattedWeight = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2 }).format(result.weightKg);
    resultTotal.textContent = formatNaira(result.totalNgn);
    resultBreakdown.textContent = `${formattedWeight} kg x ${formatNaira(result.ratePerKg)}/kg, ${methodName}, Nigeria to ${destinationName}`;
    resultEmailMessage.textContent = result.emailSent === true
      ? "We have sent this estimate to your email."
      : `We could not send this estimate by email. Please contact support at ${SUPPORT_EMAIL}.`;
    quoteResult.hidden = false;
    quoteResult.focus({ preventScroll: true });
  } catch (error) {
    setMessage(quoteError, error instanceof Error ? error.message : "We could not prepare your estimate. Please try again.");
  } finally {
    setButtonLoading(estimateButton, false, "Get my estimate", "Preparing estimate...");
  }
});

const savedEmail = getRegisteredEmail();
if (savedEmail) {
  emailGate.hidden = true;
  showCalculator(savedEmail);
} else {
  emailGate.setAttribute("aria-hidden", "false");
  calculatorPanel.setAttribute("aria-hidden", "true");
}
