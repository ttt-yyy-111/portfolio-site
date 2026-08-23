import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "portfolio_editor_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

const toBase64Url = (value) => Buffer.from(value).toString("base64url");
const fromBase64Url = (value) => Buffer.from(value, "base64url").toString("utf8");

function signature(payload) {
  return createHmac("sha256", process.env.EDITOR_SESSION_SECRET || "")
    .update(payload)
    .digest("base64url");
}

function readCookie(req, name) {
  const cookies = req.headers.cookie || "";
  const pair = cookies.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null;
}

export function hasEditorConfig() {
  return Boolean(process.env.EDITOR_PASSWORD && process.env.EDITOR_SESSION_SECRET);
}

export function passwordMatches(password) {
  if (!hasEditorConfig() || typeof password !== "string") return false;
  const given = createHash("sha256").update(password).digest();
  const expected = createHash("sha256").update(process.env.EDITOR_PASSWORD).digest();
  return timingSafeEqual(given, expected);
}

export function createEditorSession() {
  const payload = toBase64Url(JSON.stringify({ expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000 }));
  return `${payload}.${signature(payload)}`;
}

export function isEditorAuthenticated(req) {
  if (!hasEditorConfig()) return false;
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return false;
  const [payload, providedSignature] = token.split(".");
  if (!payload || !providedSignature) return false;
  const expectedSignature = signature(payload);
  if (providedSignature.length !== expectedSignature.length) return false;
  if (!timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))) return false;
  try {
    return JSON.parse(fromBase64Url(payload)).expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function sessionCookie(token, maxAge = SESSION_TTL_SECONDS) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}
