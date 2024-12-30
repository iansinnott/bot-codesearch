import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

export interface Tool {
  name: string;
  run(args: string): Promise<string>;
  logFullOutput(toolName: string, args: string, output: string): Promise<string>;
  openaiFunction: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: {
        args: {
          type: "string";
          description: string;
        };
      };
      required: string[];
    };
  };
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
    try {
      // Ensure we start from current directory by getting absolute path
      const cwd = process.cwd();

      // Common exclusions for directories to ignore
      const excludes = [
        "-not",
        "-path",
        "*/node_modules/*",
        "-not",
        "-path",
        "*/.git/*",
        "-not",
        "-path",
        "*/dist/*",
        "-not",
        "-path",
        "*/build/*",
        "-not",
        "-path",
        "*/coverage/*",
      ].join(" ");

      // On macOS, -P uses regex for -path, -E enables extended regex
      // Starting with . ensures we don't search above current directory
      const { stdout, stderr } = await execAsync(`cd "${cwd}" && find . ${args} ${excludes}`);

      if (stderr) return stderr;
      // Clean up the output to remove the leading ./
      return stdout.replace(/^\.\//gm, "");
    } catch (error: any) {
      return error.message;
    }
  },
  async logFullOutput(toolName: string, args: string, output: string) {
    return logOutputToFile(toolName, args, output);
  },
  openaiFunction: {
    name: "find",
    description:
      "Search the filesystem starting from the current directory downward (will not search parent directories). Optimized for macOS find command. Automatically excludes node_modules, .git, dist, build, and coverage directories.",
    parameters: {
      type: "object",
      properties: {
        args: {
          type: "string",
          description: "Arguments to pass to the find command. The search will always start from the current directory.",
        },
      },
      required: ["args"],
    },
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
  openaiFunction: {
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
  openaiFunction: {
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
};

// Export all tools in an array for convenience
export const allTools = [findTool, catTool, grepTool];
