// Rates are in Nigerian Naira per 1 kg, shipping from Nigeria.
// A null air rate keeps Air unavailable until a rate is set.
const RATES = {
  UK: { sea: 8500, express: 20000, air: null },
  US: { sea: 17000, express: 28000, air: null }
};

const METHOD_DETAILS = {
  sea: {
    name: 'Sea / Cargo',
    breakdownName: 'Sea',
    description: 'Most affordable, longer transit',
    icon: 'M3 17h18l-2 4H5l-2-4Zm1-2V8l8-5 8 5v7h-2V9l-6-3.75L6 9v6H4Zm5-5h2v5H9v-5Zm4 0h2v5h-2v-5Z'
  },
  express: {
    name: 'Express (DHL)',
    breakdownName: 'Express',
    description: 'Fastest delivery',
    icon: 'M13 2 4 14h6l-1 8 11-13h-7l1-7Z'
  },
  air: {
    name: 'Air',
    breakdownName: 'Air',
    description: 'Air shipping',
    icon: 'm2 21 20-9L2 3v7l14 2-14 2v7Z'
  }
};

const MIN_WEIGHT = 0.1;
const WEIGHT_STEP = 0.1;

const calculator = document.getElementById('shipping-estimator');
if (!calculator) {
  throw new Error('Shipping calculator markup was not found.');
}

const destinationToggle = calculator.querySelector('.calculator-destination');
const methodOptions = calculator.querySelector('#method-options');
const weightInput = calculator.querySelector('#weight');
const priceOutput = calculator.querySelector('#price-output');
const resultHint = calculator.querySelector('#result-hint');
const breakdownOutput = calculator.querySelector('#breakdown-output');

if (!destinationToggle || !methodOptions || !weightInput || !priceOutput || !resultHint || !breakdownOutput) {
  throw new Error('Shipping calculator is missing required controls.');
}

let destination = 'UK';
let method = 'sea';
let displayedPrice = '';
let priceAnimationId = 0;

function formatCurrency(amount) {
  return `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(amount)}`;
}

function createMethodOption(methodName, rate) {
  const details = METHOD_DETAILS[methodName];
  const label = document.createElement('label');
  label.className = 'calculator-method';
  label.classList.toggle('is-selected', method === methodName);

  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.name = 'shipping-method';
  radio.value = methodName;
  radio.checked = method === methodName;
  radio.addEventListener('change', () => {
    method = methodName;
    updateMethodSelection();
    updateResult();
  });

  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.classList.add('calculator-method__icon');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('fill', 'currentColor');
  icon.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', details.icon);
  icon.append(path);

  const copy = document.createElement('span');
  const name = document.createElement('span');
  name.className = 'calculator-method__name';
  name.textContent = details.name;
  const description = document.createElement('span');
  description.className = 'calculator-method__description';
  description.textContent = details.description;
  copy.append(name, description);

  const rateText = document.createElement('span');
  rateText.className = 'calculator-method__rate';
  rateText.textContent = `${formatCurrency(rate)}/kg`;

  label.append(radio, icon, copy, rateText);
  return label;
}

function renderMethods() {
  methodOptions.replaceChildren();
  Object.entries(RATES[destination]).forEach(([methodName, rate]) => {
    if (rate === null) {
      return;
    }

    methodOptions.append(createMethodOption(methodName, rate));
  });
}

function updateMethodSelection() {
  methodOptions.querySelectorAll('.calculator-method').forEach((option) => {
    const radio = option.querySelector('input[type="radio"]');
    option.classList.toggle('is-selected', radio.checked);
  });
}

function updateDestinationButtons() {
  destinationToggle.dataset.destination = destination;
  destinationToggle.querySelectorAll('[data-destination-option]').forEach((button) => {
    const isSelected = button.dataset.destinationOption === destination;
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
  });
}

function hideEstimate() {
  priceAnimationId += 1;
  priceOutput.hidden = true;
  priceOutput.textContent = '';
  priceOutput.classList.remove('is-changing');
  breakdownOutput.hidden = true;
  breakdownOutput.textContent = '';
  resultHint.hidden = false;
  displayedPrice = '';
}

function updateResult() {
  const rawWeight = weightInput.value.trim();
  const weightKg = Number(rawWeight);
  const ratePerKg = RATES[destination][method];

  if (!rawWeight || !Number.isFinite(weightKg) || weightKg < MIN_WEIGHT || typeof ratePerKg !== 'number') {
    hideEstimate();
    return;
  }

  const total = Math.round(weightKg * ratePerKg);
  if (!Number.isFinite(total) || total <= 0) {
    hideEstimate();
    return;
  }

  const formattedTotal = formatCurrency(total);
  const shouldAnimate = displayedPrice !== '' &&
    displayedPrice !== formattedTotal &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  resultHint.hidden = true;
  priceOutput.hidden = false;

  if (shouldAnimate) {
    const animationId = ++priceAnimationId;
    priceOutput.classList.add('is-changing');
    window.setTimeout(() => {
      if (animationId !== priceAnimationId || priceOutput.hidden) {
        return;
      }

      priceOutput.textContent = formattedTotal;
      requestAnimationFrame(() => {
        if (animationId === priceAnimationId) {
          priceOutput.classList.remove('is-changing');
        }
      });
    }, 100);
  } else {
    priceAnimationId += 1;
    priceOutput.classList.remove('is-changing');
    priceOutput.textContent = formattedTotal;
  }

  displayedPrice = formattedTotal;
  breakdownOutput.textContent = `${weightKg} kg x ${formatCurrency(ratePerKg)}/kg - ${METHOD_DETAILS[method].breakdownName}, Nigeria to ${destination}`;
  breakdownOutput.hidden = false;
}

destinationToggle.addEventListener('click', (event) => {
  const button = event.target.closest('[data-destination-option]');
  if (!button || button.dataset.destinationOption === destination) {
    return;
  }

  destination = button.dataset.destinationOption;
  if (typeof RATES[destination][method] !== 'number') {
    method = Object.keys(RATES[destination]).find((name) => typeof RATES[destination][name] === 'number');
  }

  updateDestinationButtons();
  renderMethods();
  updateResult();
});

calculator.querySelectorAll('[data-weight-step]').forEach((button) => {
  button.addEventListener('click', () => {
    const currentWeight = Number(weightInput.value);
    const baseWeight = Number.isFinite(currentWeight) ? currentWeight : 0;
    const direction = Number(button.dataset.weightStep);
    const nextWeight = Math.max(MIN_WEIGHT, Math.round((baseWeight + direction * WEIGHT_STEP) * 10) / 10);
    weightInput.value = nextWeight.toFixed(1);
    weightInput.dispatchEvent(new Event('input', { bubbles: true }));
  });
});

weightInput.addEventListener('input', updateResult);

updateDestinationButtons();
renderMethods();
updateResult();
