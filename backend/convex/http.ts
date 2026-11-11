import { httpRouter } from "convex/server";
import { httpAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { RATES, type Destination, type Method } from "./rates";

const http = httpRouter();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 10;
const FROM_EMAIL = "Fast Clear Cargo <quotes@fastclearcargo.com>";
const REPLY_TO_EMAIL = "nathanyourguyyy@gmail.com";
const SUBJECT = "Your shipping estimate - Fast Clear Cargo";

type JsonRecord = Record<string, unknown>;

function allowedOrigin(origin: string): boolean {
  const configuredOrigin = process.env.ALLOWED_ORIGIN?.trim().replace(/\/+$/, "");
  return origin === configuredOrigin || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin);
}

function jsonResponse(
  request: Request,
  body: unknown,
  status = 200,
): Response {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Vary": "Origin",
  });
  const origin = request.headers.get("origin");

  if (origin && allowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Max-Age", "86400");
  }

  return new Response(JSON.stringify(body), { status, headers });
}

function handleOptions(request: Request): Response {
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigin(origin)) {
    return jsonResponse(request, { ok: false, error: "Origin is not allowed." }, 403);
  }
  return new Response(null, {
    status: 204,
    headers: {
      ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    },
  });
}

function rejectDisallowedOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  return origin && !allowedOrigin(origin)
    ? jsonResponse(request, { ok: false, error: "Origin is not allowed." }, 403)
    : null;
}

async function readJson(request: Request): Promise<JsonRecord | null> {
  try {
    const value: unknown = await request.json();
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? value as JsonRecord
      : null;
  } catch {
    return null;
  }
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}

async function hash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function requestIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
}

function formatNaira(amount: number): string {
  return `₦${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(amount)}`;
}

function formatWeight(weightKg: number): string {
  return new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2 }).format(weightKg);
}

function methodName(method: Method): string {
  return method === "sea" ? "Sea/Cargo" : "Express/DHL";
}

function emailContent(
  destination: Destination,
  method: Method,
  weightKg: number,
  ratePerKg: number,
  totalNgn: number,
): { html: string; text: string } {
  const destinationName = destination === "UK" ? "United Kingdom (UK)" : "United States (US)";
  const methodLabel = methodName(method);
  const note = "This is an estimate. The final price is confirmed after your package is weighed.";
  const contact = `For questions, contact ${REPLY_TO_EMAIL}.`;
  const details = [
    `Destination: ${destinationName}`,
    `Method: ${methodLabel}`,
    `Weight: ${formatWeight(weightKg)} kg`,
    `Rate: ${formatNaira(ratePerKg)}/kg`,
    `Total: ${formatNaira(totalNgn)}`,
  ];

  return {
    html: `<div style="font-family:Arial,sans-serif;color:#102b3f;line-height:1.6"><h1 style="color:#075284">Your shipping estimate</h1>${details.map((line) => `<p>${line}</p>`).join("")}<p>${note}</p><p>${contact}</p></div>`,
    text: ["Your shipping estimate", ...details, note, contact].join("\n"),
  };
}

async function enforceRateLimit(
  ctx: ActionCtx,
  key: string,
): Promise<boolean> {
  return await ctx.runMutation(internal.rateLimits.consume, {
    key,
    maxRequests: MAX_REQUESTS,
    windowMs: WINDOW_MS,
  });
}

async function registerEmailHandler(
  ctx: ActionCtx,
  request: Request,
): Promise<Response> {
  const originError = rejectDisallowedOrigin(request);
  if (originError) return originError;

  if (request.method === "OPTIONS") return handleOptions(request);
  if (request.method !== "POST") {
    return jsonResponse(request, { ok: false, error: "Use POST to register an email." }, 405);
  }

  const body = await readJson(request);
  if (!body) {
    return jsonResponse(request, { ok: false, error: "Request body must be valid JSON." }, 400);
  }
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return jsonResponse(request, { ok: true });
  }
  if (body.website !== undefined && body.website !== null && typeof body.website !== "string") {
    return jsonResponse(request, { ok: false, error: "Request body is invalid." }, 400);
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return jsonResponse(request, { ok: false, error: "Enter a valid email address." }, 400);
  }

  try {
    const ipHash = await hash(requestIp(request));
    if (!await enforceRateLimit(ctx, `register:${ipHash}`)) {
      return jsonResponse(request, { ok: false, error: "Too many requests. Please try again in 10 minutes." }, 429);
    }

    await ctx.runMutation(internal.leads.upsert, { email });
    return jsonResponse(request, { ok: true });
  } catch (error) {
    console.error("Email registration failed:", error);
    return jsonResponse(request, { ok: false, error: "We could not register your email. Please try again." }, 500);
  }
}

async function sendQuoteHandler(
  ctx: ActionCtx,
  request: Request,
): Promise<Response> {
  const originError = rejectDisallowedOrigin(request);
  if (originError) return originError;

  if (request.method === "OPTIONS") return handleOptions(request);
  if (request.method !== "POST") {
    return jsonResponse(request, { ok: false, error: "Use POST to request an estimate." }, 405);
  }

  const body = await readJson(request);
  if (!body) {
    return jsonResponse(request, { ok: false, error: "Request body must be valid JSON." }, 400);
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return jsonResponse(request, { ok: false, error: "Enter a valid email address." }, 400);
  }
  if (body.destination !== "UK" && body.destination !== "US") {
    return jsonResponse(request, { ok: false, error: "Choose a supported destination." }, 400);
  }
  if (body.method !== "sea" && body.method !== "express") {
    return jsonResponse(request, { ok: false, error: "Choose a supported shipping method." }, 400);
  }
  if (
    typeof body.weightKg !== "number" ||
    !Number.isFinite(body.weightKg) ||
    body.weightKg <= 0 ||
    body.weightKg > 10000
  ) {
    return jsonResponse(request, { ok: false, error: "Weight must be greater than 0 and no more than 10,000 kg." }, 400);
  }

  try {
    const ipHash = await hash(requestIp(request));
    const emailHash = await hash(email);
    if (
      !await enforceRateLimit(ctx, `quote:ip:${ipHash}`) ||
      !await enforceRateLimit(ctx, `quote:email:${emailHash}`)
    ) {
      return jsonResponse(request, { ok: false, error: "Too many requests. Please try again in 10 minutes." }, 429);
    }

    const lead = await ctx.runQuery(internal.leads.getByEmail, { email });
    if (!lead) {
      return jsonResponse(request, { ok: false, error: "Register your email before requesting an estimate." }, 400);
    }

    const destination = body.destination as Destination;
    const method = body.method as Method;
    const weightKg = body.weightKg;
    const ratePerKg = RATES[destination][method];
    const totalNgn = Math.round(weightKg * ratePerKg);
    if (!Number.isSafeInteger(totalNgn) || totalNgn <= 0) {
      return jsonResponse(request, { ok: false, error: "This weight is outside the supported estimate range." }, 400);
    }

    const quoteId = await ctx.runMutation(internal.quotes.insert, {
      leadId: lead._id,
      email,
      destination,
      method,
      weightKg,
      totalNgn,
    });

    const apiKey = process.env.RESEND_API_KEY;
    let emailSent = false;
    if (!apiKey) {
      console.error("RESEND_API_KEY is not configured.");
    } else {
      try {
        const content = emailContent(destination, method, weightKg, ratePerKg, totalNgn);
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [email],
            reply_to: REPLY_TO_EMAIL,
            subject: SUBJECT,
            html: content.html,
            text: content.text,
          }),
        });
        if (!response.ok) {
          console.error("Resend rejected the email with status:", response.status);
        } else {
          emailSent = true;
        }
      } catch (error) {
        console.error("Resend request failed:", error);
      }
    }

    await ctx.runMutation(internal.quotes.updateEmailStatus, {
      id: quoteId,
      emailStatus: emailSent ? "sent" : "failed",
    });

    return jsonResponse(request, {
      ok: true,
      totalNgn,
      emailSent,
      weightKg,
      ratePerKg,
      destination,
      method,
    });
  } catch (error) {
    console.error("Quote request failed:", error);
    return jsonResponse(request, { ok: false, error: "We could not prepare your estimate. Please try again." }, 500);
  }
}

const registerEmail = httpAction(async (ctx, request) => await registerEmailHandler(ctx, request));
const sendQuote = httpAction(async (ctx, request) => await sendQuoteHandler(ctx, request));

http.route({ path: "/register-email", method: "POST", handler: registerEmail });
http.route({ path: "/register-email", method: "GET", handler: registerEmail });
http.route({ path: "/register-email", method: "OPTIONS", handler: registerEmail });
http.route({ path: "/send-quote", method: "POST", handler: sendQuote });
http.route({ path: "/send-quote", method: "GET", handler: sendQuote });
http.route({ path: "/send-quote", method: "OPTIONS", handler: sendQuote });

export default http;
