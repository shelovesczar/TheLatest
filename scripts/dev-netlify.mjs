import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const preferredNetlifyPort = 8888;
const preferredTargetPort = 5173;
const shutdownSignals = ["SIGINT", "SIGTERM", "SIGHUP"];

function loadLocalEnv() {
  const values = {};

  try {
    const envPath = path.resolve(process.cwd(), ".env");
    const content = fs.readFileSync(envPath, "utf8");
    content
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach((line) => {
        const trimmed = String(line || "").trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("="))
          return;

        const separatorIndex = trimmed.indexOf("=");
        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim();

        if (key && !Object.prototype.hasOwnProperty.call(values, key)) {
          values[key] = value;
        }
      });
  } catch {
    return values;
  }

  return values;
}

function terminateChild(child) {
  if (!child || child.killed) {
    return;
  }

  child.kill("SIGTERM");

  setTimeout(() => {
    if (!child.killed) {
      child.kill("SIGKILL");
    }
  }, 2000).unref();
}

async function isPortAvailableOnHost(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", (error) => {
      if (error?.code === "EAFNOSUPPORT" || error?.code === "EADDRNOTAVAIL") {
        resolve(true);
        return;
      }

      resolve(false);
    });
    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}

async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", (error) => {
      if (error?.code === "EAFNOSUPPORT" || error?.code === "EADDRNOTAVAIL") {
        resolve(true);
        return;
      }

      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen({ port, exclusive: true });
  });
}

async function findAvailablePort(startPort, isAvailable, attempts = 20) {
  for (let offset = 0; offset < attempts; offset += 1) {
    const candidate = startPort + offset;
    if (await isAvailable(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to find an open port starting at ${startPort}.`);
}

async function resolveDevPorts({
  targetStartPort = preferredTargetPort,
  netlifyStartPort = preferredNetlifyPort,
  isAvailable = isPortAvailable,
} = {}) {
  const targetPort = await findAvailablePort(targetStartPort, isAvailable);
  const netlifyPort = await findAvailablePort(netlifyStartPort, isAvailable);
  return { targetPort, netlifyPort };
}

async function main() {
  const localEnv = loadLocalEnv();
  const { targetPort, netlifyPort } = await resolveDevPorts();

  console.log(
    `[dev:netlify] Starting Netlify dev on http://127.0.0.1:${netlifyPort}`,
  );
  if (
    netlifyPort !== preferredNetlifyPort ||
    targetPort !== preferredTargetPort
  ) {
    console.log(
      `[dev:netlify] Preferred ports were occupied. Using Netlify port ${netlifyPort} and target port ${targetPort}.`,
    );
  }

  const viteCommand = `npx vite --host 0.0.0.0 --port ${targetPort} --strictPort`;
  const netlifyProcess = spawn(
    `netlify dev --port ${netlifyPort} --target-port ${targetPort} --command "${viteCommand}"`,
    {
      stdio: "inherit",
      env: {
        ...process.env,
        ...localEnv,
      },
      shell: true,
    },
  );

  let shuttingDown = false;

  const shutdown = (code = 0) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    terminateChild(netlifyProcess);
    process.exit(code);
  };

  for (const signal of shutdownSignals) {
    process.on(signal, () => shutdown(0));
  }

  netlifyProcess.once("exit", (code) => {
    shutdown(code ?? 0);
  });
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export {
  findAvailablePort,
  isPortAvailable,
  isPortAvailableOnHost,
  loadLocalEnv,
  resolveDevPorts,
};
