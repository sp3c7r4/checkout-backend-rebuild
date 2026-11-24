/**
 * Live smoke test for the bot's LLM path.
 *   npx tsx scripts/smoke-deepseek.ts
 * Requires DEEPSEEK_API_KEY in .env. Exits non-zero on any failure.
 */
import { z } from "zod";
import { generateText, jsonSchema, tool } from "ai";

const captured: any[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: any, init?: any) => {
  if (String(input).includes("api.deepseek.com") && typeof init?.body === "string") {
    captured.push(JSON.parse(init.body));
  }
  return realFetch(input, init);
}) as typeof fetch;

const { chatModel } = await import("../src/mastra/model");

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log(`PASS  ${name}`);
    pass++;
  } else {
    console.log(`FAIL  ${name}${extra === undefined ? "" : " -> " + JSON.stringify(extra).slice(0, 300)}`);
    fail++;
  }
}

const expectedModel = process.env.DEEPSEEK_MODEL || "deepseek-flash";

// 1. plain completion through the provider
const plain = await generateText({
  model: chatModel,
  prompt: "Reply with the single word: pong",
});
check("completion returns text", plain.text.trim().length > 0, plain.text);
check("request used the configured model", captured[0]?.model === expectedModel, captured[0]?.model);
check("thinking mode disabled in request", captured[0]?.thinking?.type === "disabled", captured[0]?.thinking);
check("no reasoning_content leaked to text", !plain.text.includes("reasoning"), plain.text.slice(0, 80));

// 2. tool calling round-trip
const stockTool = tool({
  description: "Look up stock for a product in the store",
  parameters: jsonSchema<{ product: string }>(
    z.toJSONSchema(z.object({ product: z.string().describe("product name") })) as any
  ),
  execute: async ({ product }) => ({ product, quantity: 42 }),
});

const withTool = await generateText({
  model: chatModel,
  prompt: 'Use the stock tool for "indomie" and tell me the quantity.',
  tools: { stock: stockTool },
  maxSteps: 3,
});

const toolCall = withTool.steps.flatMap((s) => s.toolCalls)[0];
const toolResult = withTool.steps.flatMap((s) => s.toolResults?.map((r: any) => r.result) ?? [])[0];
check("model issued a tool call", !!toolCall, withTool.toolCalls);
check("tool result reached the model", (toolResult as any)?.quantity === 42, toolResult);
check("final answer mentions the quantity", /42/.test(withTool.text), withTool.text);
check("tool request also disabled thinking", captured.at(-1)?.thinking?.type === "disabled", captured.at(-1)?.thinking);

// 3. agents module loads with memory wired up
try {
  const { mastra } = await import("../src/mastra");
  const checkoutAgent = mastra.getAgent("checkoutAgent");
  check("agent module constructs", !!checkoutAgent?.generate);
  check("workflow is registered", !!mastra.getWorkflow("userCheckWorkflow"));

  const threadId = `smoke-${Date.now()}`;
  const first = await checkoutAgent.generate("Hi! Remember that my favourite is jollof.", {
    threadId,
    resourceId: "smoke-user",
  });
  check("agent replies through memory", (first.text || "").length > 0, first.text?.slice(0, 120));

  const second = await checkoutAgent.generate("What did I say my favourite was?", {
    threadId,
    resourceId: "smoke-user",
  });
  check("agent recalls the earlier turn", /jollof/i.test(second.text || ""), second.text?.slice(0, 160));
} catch (error: any) {
  check("agent module constructs", false, error.message);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
