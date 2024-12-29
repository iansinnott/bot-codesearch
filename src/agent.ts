import { openaiChat } from "./openai";
import type { Tool } from "./tools";
import { findTool, catTool, grepTool } from "./tools";

type AgentOptions = {
  onToolUsed?: (
    toolName: string,
    args: string,
    outputSnippet: string,
    fullOutputPath: string
  ) => void;
};

export class Agent {
  private conversation: { role: "system" | "user" | "assistant"; content: string }[] = [];
  private tools: Tool[];
  private onToolUsed?: (
    toolName: string,
    args: string,
    outputSnippet: string,
    fullOutputPath: string
  ) => void;

  constructor(options?: AgentOptions) {
    this.onToolUsed = options?.onToolUsed;

    // System prompt
    this.conversation.push({
      role: "system",
      content: `You are a code-searching AI agent. You have access to these tools:
- find: for searching the filesystem
- cat: for printing file contents
- grep: for searching file contents

You can use these tools freely without asking for permission since they are read-only.
Your job is to keep using these tools as needed until you have enough info to answer the user's query.
Then provide a final answer as plain text.

Never ask for user confirmation to run a read-only tool.`,
    });

    // Initialize the available tools:
    this.tools = [findTool, catTool, grepTool];
  }

  public async processInput(userQuery: string): Promise<string> {
    // Add the user query
    this.conversation.push({ role: "user", content: userQuery });

    // We'll attempt up to 20 tool calls in one user request before giving up.
    for (let i = 0; i < 20; i++) {
      // Call OpenAI with the entire conversation
      const assistantMessage = await openaiChat(this.conversation);

      // Check if the assistant is requesting a tool
      const toolInstruction = this.maybeParseToolInstruction(assistantMessage);

      // No tool usage => final answer, so we return it to the user
      if (!toolInstruction) {
        this.conversation.push({
          role: "assistant",
          content: assistantMessage,
        });
        return assistantMessage;
      }

      const { toolName, args } = toolInstruction;
      const tool = this.tools.find((t) => t.name === toolName);
      if (!tool) {
        const errorMessage = `Tool "${toolName}" not recognized.`;
        this.conversation.push({ role: "assistant", content: errorMessage });
        return errorMessage;
      }

      // Execute the tool
      const toolOutput = await tool.run(args);

      // Log usage
      const snippet = toolOutput.substring(0, 400);
      const logPath = await tool.logFullOutput(toolName, args, toolOutput);
      if (this.onToolUsed) {
        this.onToolUsed(toolName, args, snippet, logPath);
      }

      // Provide the tool output back to the agent
      this.conversation.push({
        role: "assistant",
        content: assistantMessage,
      });
      this.conversation.push({
        role: "assistant",
        content: `Tool Output:\n${toolOutput}`,
      });

      // Then continue the loop so the agent can incorporate the tool results
    }

    // If we exceeded 20 tool calls, let's bail
    return "I'm sorry, I've tried too many tool calls and seem to be stuck.";
  }

  private maybeParseToolInstruction(message: string): { toolName: string; args: string } | null {
    try {
      const parsed = JSON.parse(message);
      if (parsed.action === "tool") {
        return {
          toolName: parsed.tool,
          args: parsed.args,
        };
      }
    } catch (e) {
      // Not JSON, so not a tool call
    }
    return null;
  }
}
