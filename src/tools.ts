// File: src/tools.ts

import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

export interface Tool {
  name: string;
  run(args: string): Promise<string>;
  logFullOutput(toolName: string, args: string, output: string): Promise<string>;
}

async function logOutputToFile(toolName: string, args: string, output: string): Promise<string> {
  const logsDir = path.join(process.cwd(), "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${toolName}-${timestamp}.log`;
  const filePath = path.join(logsDir, fileName);

  const logData = `Tool: ${toolName}\nArgs: ${args}\n\n${output}`;
  fs.writeFileSync(filePath, logData, "utf8");
  return filePath;
}

export const findTool: Tool = {
  name: "find",
  async run(args: string) {
    // macOS find can be slightly different from GNU find, but usually usage is similar
    // For example, if the agent says: find . -name "*.js"
    // We'll just pass the entire args string. The user/LLM needs to craft correct find syntax.
    try {
      const { stdout, stderr } = await execAsync(`find ${args}`);
      if (stderr) return stderr;
      return stdout;
    } catch (error: any) {
      return error.message;
    }
  },
  async logFullOutput(toolName: string, args: string, output: string) {
    return logOutputToFile(toolName, args, output);
  },
};

export const catTool: Tool = {
  name: "cat",
  async run(args: string) {
    // We assume the LLM will pass a file path in "args"
    // For safety, you may want to sanitize or validate the path
    try {
      const fileContent = fs.readFileSync(args, "utf8");
      return fileContent;
    } catch (error: any) {
      return error.message;
    }
  },
  async logFullOutput(toolName: string, args: string, output: string) {
    return logOutputToFile(toolName, args, output);
  },
};

export const grepTool: Tool = {
  name: "grep",
  async run(args: string) {
    // The LLM might do something like: grep "import React" -r .
    // On macOS, grep usage is typically the same as on Linux, but watch out for BSD vs GNU differences
    try {
      const { stdout, stderr } = await execAsync(`grep ${args}`);
      if (stderr) return stderr;
      return stdout;
    } catch (error: any) {
      return error.message;
    }
  },
  async logFullOutput(toolName: string, args: string, output: string) {
    return logOutputToFile(toolName, args, output);
  },
};
