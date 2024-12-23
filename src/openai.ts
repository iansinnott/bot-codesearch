// File: src/openai.ts

import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function openaiChat(
  messages: { role: "system" | "user" | "assistant"; content: string }[]
): Promise<string> {
  if (!openai.apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  const tools = [
    {
      type: "function" as const,
      function: {
        name: "find",
        description: "Search the filesystem",
        parameters: {
          type: "object",
          properties: {
            args: {
              type: "string",
              description: "Arguments to pass to the find command",
            },
          },
          required: ["args"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "cat",
        description: "Print file contents",
        parameters: {
          type: "object",
          properties: {
            args: {
              type: "string",
              description: "Path to the file to read",
            },
          },
          required: ["args"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "grep",
        description: "Search file contents",
        parameters: {
          type: "object",
          properties: {
            args: {
              type: "string",
              description: "Arguments to pass to the grep command",
            },
          },
          required: ["args"],
        },
      },
    },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4", // Note: gpt-4o is not a real model name
    messages: messages,
    temperature: 0.2,
    tools: tools,
    tool_choice: "auto",
  });

  const choice = response.choices[0];
  if (!choice?.message) {
    throw new Error("OpenAI did not return a valid message.");
  }

  // If the model wants to call a function
  if (choice.message.tool_calls?.length) {
    const toolCall = choice.message.tool_calls[0];
    const args = JSON.parse(toolCall.function.arguments);
    return JSON.stringify({
      action: "tool",
      tool: toolCall.function.name,
      args: args.args,
    });
  }

  // Otherwise return the content
  return choice.message.content?.trim() ?? "";
}
