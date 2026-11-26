/**
 * Application errors raised by the data-access layer.
 *
 * These carry an HTTP-compatible status so the transport layer (`http.ts`) can map them to
 * responses, but this module has no dependency on Next.js, auth or any transport — the DAL can
 * throw them from anywhere (route handlers, server components, scripts, tests).
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (msg: string) => new AppError(400, msg);
export const notFound = (what = "Not found") => new AppError(404, what);
export const conflict = (msg: string) => new AppError(409, msg);
export const tooManyRequests = (retryAfter: number | null) =>
  new AppError(429, "You're going a bit fast — try again shortly.", { retryAfter });
