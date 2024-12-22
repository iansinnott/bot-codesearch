// File: src/repl.ts

import readline from "readline";
import { Agent } from "./agent";

export function runRepl() {
  console.log("Welcome to the Code Agent REPL!");
  console.log("Type your question or command. Press Ctrl+C to exit.\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });

  const agent = new Agent({
    onToolUsed: (toolName, args, outputSnippet, fullOutputPath) => {
      console.log(`\n[Tool used: ${toolName} ${args}]`);
      if (outputSnippet?.length) {
        console.log(`Snippet of result:\n${outputSnippet}\n`);
      }
      console.log(`Full output logged at: ${fullOutputPath}\n`);
    },
  });

  rl.prompt();

  rl.on("line", async (line) => {
    if (!line.trim()) {
      rl.prompt();
      return;
    }

    try {
      const response = await agent.processInput(line.trim());
      console.log(`\n${response}\n`);
    } catch (err) {
      console.error("Error processing input:", err);
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log("Exiting REPL. Goodbye!");
    process.exit(0);
  });
}
