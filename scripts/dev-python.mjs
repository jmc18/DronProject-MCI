import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const analyzer = path.join(root, "services", "analyzer");

function pythonCommand() {
  const win = process.platform === "win32";
  const venvPython = win
    ? path.join(analyzer, ".venv", "Scripts", "python.exe")
    : path.join(analyzer, ".venv", "bin", "python");
  if (fs.existsSync(venvPython)) {
    return { command: venvPython, prefix: [] };
  }
  if (win) {
    return { command: "py", prefix: ["-3.14"] };
  }
  return { command: "python3", prefix: [] };
}

const { command, prefix } = pythonCommand();
const child = spawn(
  command,
  [...prefix, "-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"],
  { cwd: analyzer, stdio: "inherit" },
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
