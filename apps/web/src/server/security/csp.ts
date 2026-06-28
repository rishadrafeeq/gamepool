/**
 * Content Security Policy tuned for Next.js, Firebase Auth (phone OTP / reCAPTCHA),
 * Google Fonts, Firebase Storage, and Sentry.
 */
export function buildContentSecurityPolicy(options?: { sentryDsn?: string }): string {
  const sentryConnect = options?.sentryDsn
    ? (() => {
        try {
          const host = new URL(options.sentryDsn).host;
          return ` https://${host}`;
        } catch {
          return " https://*.ingest.sentry.io https://*.ingest.us.sentry.io";
        }
      })()
    : " https://*.ingest.sentry.io https://*.ingest.us.sentry.io";

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      "https://www.gstatic.com",
      "https://www.google.com",
      "https://apis.google.com",
      "https://*.firebaseapp.com",
    ],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https://firebasestorage.googleapis.com",
      "https://*.googleusercontent.com",
    ],
    "connect-src": [
      "'self'",
      "https://*.googleapis.com",
      "https://*.firebaseio.com",
      "wss://*.firebaseio.com",
      "https://identitytoolkit.googleapis.com",
      "https://securetoken.googleapis.com",
      sentryConnect.trim(),
    ],
    "frame-src": [
      "https://www.google.com",
      "https://www.gstatic.com",
      "https://recaptcha.google.com",
      "https://*.firebaseapp.com",
    ],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  if (process.env.NODE_ENV === "production") {
    directives["upgrade-insecure-requests"] = [];
  }

  return Object.entries(directives)
    .map(([key, values]) =>
      values.length === 0 ? key : `${key} ${values.join(" ")}`,
    )
    .join("; ");
}

export function applyContentSecurityPolicy(
  response: Response,
  options?: { sentryDsn?: string },
): void {
  response.headers.set(
    "Content-Security-Policy",
    buildContentSecurityPolicy(options),
  );
}
