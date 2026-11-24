import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import env from "../config/env";

// DeepSeek V4 defaults to thinking mode, which requires replaying reasoning_content
// on every later turn. @ai-sdk/deepseek@0.2.x predates V4, so flip it off in the
// request body rather than relying on provider-level options.
const deepSeek = createDeepSeek({
  apiKey: env.DEEPSEEK_API_KEY ?? "",
  fetch: (input, init) => {
    if (typeof init?.body === "string") {
      try {
        const body = JSON.parse(init.body);
        body.thinking = { type: "disabled" };
        init = { ...init, body: JSON.stringify(body) };
      } catch {
        // non-JSON body: pass through untouched
      }
    }
    return fetch(input, init);
  },
});

/** Chat model used by every agent. Swap providers here and nowhere else. */
export const chatModel = deepSeek(env.DEEPSEEK_MODEL);

const google = createGoogleGenerativeAI({
  apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
});

/** DeepSeek has no embeddings endpoint; memory keeps a separate embedder. */
export const embedder = google.textEmbeddingModel("text-embedding-004");
