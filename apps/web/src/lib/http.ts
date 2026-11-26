import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type z } from "zod";
import { AiServiceError } from "@focuspath/shared/ai-client";
import { auth } from "./auth";
import { AppError, badRequest, tooManyRequests } from "./errors";
import { consume, type Rule } from "./rate-limit";
import { redis } from "./redis";

/** The authenticated caller, resolved once per request by `route()`. */
export interface RouteUser {
  id: string;
  name: string;
}

export interface RouteContext<P> {
  req: Request;
  /** Shorthand for `user.id`. Every handler must scope its queries to it. */
  userId: string;
  user: RouteUser;
  params: P;
}

export type RouteHandler<P> = (ctx: RouteContext<P>) => Promise<unknown>;

/**
 * Wraps a route handler (decorator): resolves the session (401 if none), serialises the result
 * as JSON and maps thrown errors to responses via `errorResponse`. Handlers stay thin — parse
 * input, call the DAL, return a plain object.
 */
export function route<P = Record<string, string>>(handler: RouteHandler<P>) {
  return async (req: Request, segment: { params: Promise<P> }) => {
    try {
      const session = await auth().api.getSession({ headers: req.headers });
      if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
      const user = { id: session.user.id, name: session.user.name };
      const result = await handler({ req, userId: user.id, user, params: await segment.params });
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (err) {
      return errorResponse(err);
    }
  };
}

/** Single place that translates errors into HTTP responses. Unknown errors never leak details. */
export function errorResponse(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json({ error: err.message, ...err.extra }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json({ error: "Invalid request", issues: err.issues }, { status: 400 });
  }
  if (err instanceof AiServiceError) {
    console.error(err);
    return NextResponse.json(
      { error: "The AI tutor is unavailable right now. Please try again in a moment." },
      { status: err.status === 429 ? 429 : 503 },
    );
  }
  console.error(err);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw badRequest("Body must be JSON");
  }
  return schema.parse(json);
}

/** Per-user rate limit for a named bucket. Throws a 429 `AppError` when exceeded. */
export async function rateLimit(userId: string, bucket: string, rule: Rule) {
  if (process.env.DISABLE_RATE_LIMIT === "1") return;
  const res = await consume(redis(), `${bucket}:${userId}`, rule);
  if (!res.allowed) throw tooManyRequests(res.retryAfter);
}
