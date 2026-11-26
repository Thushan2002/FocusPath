import "server-only";
import { createAiClient, type AiClient } from "@focuspath/shared/ai-client";
import { env } from "./env";

let client: AiClient | undefined;

/** Server-to-server only. The shared secret never leaves the server. */
export function ai(): AiClient {
  client ??= createAiClient({ baseUrl: env().AI_SERVICE_URL, secret: env().AI_SERVICE_SECRET });
  return client;
}
