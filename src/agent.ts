// File: src/agent.ts

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
    // Provide a system prompt that helps the LLM figure out how to handle the conversation.
    this.conversation.push({
      role: "system",
      content: `You are a code-searching AI agent. You can answer questions about the codebase.
You have the following tools available:
- find: for searching the filesystem for files matching certain criteria
- cat: for printing out file contents
- grep: for searching file contents by regex

When you wish to use a tool, output JSON in the format:
  { "action": "tool", "tool": "<toolName>", "args": "<args>" }

Then wait for the tool output to be fed back to you. Do not add anything else outside of this JSON if you want to call a tool.

When you have sufficient information, provide your final answer by responding in plain text.`,
    });

    // Initialize the available tools:
    this.tools = [findTool, catTool, grepTool];
  }

  public async processInput(userQuery: string): Promise<string> {
    // Add the user query to the conversation
    this.conversation.push({ role: "user", content: userQuery });

    // We will loop until the LLM gives us a final answer (no tool usage requested).
    // The loop breaks when the LLM stops requesting tools.
    for (let i = 0; i < 20; i++) {
      // Send entire conversation to OpenAI
      const assistantMessage = await openaiChat(this.conversation);

      // Add the assistant message to the conversation
      this.conversation.push({
        role: "assistant",
        content: assistantMessage,
      });

      // Try to parse out a tool usage instruction from the LLM’s response
      const toolInstruction = this.maybeParseToolInstruction(assistantMessage);

      if (toolInstruction) {
        const { toolName, args } = toolInstruction;
        // Check if we have a known tool
        const tool = this.tools.find((t) => t.name === toolName);
        if (!tool) {
          // If we can’t find the tool, we’ll respond back that the tool is unknown
          const errorMessage = `Tool "${toolName}" is not recognized.`;
          this.conversation.push({
            role: "assistant",
            content: errorMessage,
          });
          return errorMessage;
        }

        // Execute the tool
        const toolOutput = await tool.run(args);

        // Log tool usage and create snippet of the output
        const snippet = toolOutput.substring(0, 400);
        const logPath = await tool.logFullOutput(toolName, args, toolOutput);

        if (this.onToolUsed) {
          this.onToolUsed(toolName, args, snippet, logPath);
        }

        // Now feed the tool’s output back into the conversation
        this.conversation.push({
          role: "assistant",
          content: `Tool Output:\n${toolOutput}`,
        });

        // Then continue the loop, so the LLM can incorporate this new info
      } else {
        // No tool usage indicated, so we assume the message is the final answer
        // Return that to the user
        return assistantMessage;
      }
    }

    // If we got here, it means we had too many iterations. Just bail out.
    return "I'm sorry, I'm stuck in a loop. Please try again.";
  }

  private maybeParseToolInstruction(message: string): { toolName: string; args: string } | null {
    // A simple approach to parse JSON that looks like: { "action": "tool", "tool": "cat", "args": "package.json" }
    // This can be made more robust, but for demonstration:
    const toolUsageRegex =
      /\{\s*"action"\s*:\s*"tool"\s*,\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"args"\s*:\s*"([^"]*)"\s*\}/;
    const match = message.match(toolUsageRegex);
    if (match) {
      return {
        toolName: match[1],
        args: match[2],
      };
    }
    return null;
  }
}
