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
    // macOS find might differ from GNU find, but usually usage is similar
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
