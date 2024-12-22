#!/usr/bin/env bun

import { runRepl } from "./src/repl";

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error("Usage: code-agent <command>");
    console.error("Available commands: REPL");
    process.exit(1);
  }

  const command = args[0].toLowerCase();
  switch (command) {
    case "repl":
      runRepl();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error("Available commands: REPL");
      process.exit(1);
  }
}

main();
