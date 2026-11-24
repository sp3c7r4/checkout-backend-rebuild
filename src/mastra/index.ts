import { Mastra } from "@mastra/core";
import { checkoutAgent, recommendationAgent } from "./agents";
import { userCheckWorkflow } from "./workflows";

/**
 * The bot runs agents through this instance so tools can reach registered
 * workflows (e.g. the email/phone verification flow) via `mastra.getWorkflow`.
 */
export const mastra = new Mastra({
  agents: { checkoutAgent, recommendationAgent },
  workflows: { userCheckWorkflow },
});
