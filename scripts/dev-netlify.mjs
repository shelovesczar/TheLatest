import { spawn } from 'node:child_process'
import net from 'node:net'
import process from 'node:process'

const isWindows = process.platform === 'win32'
const preferredNetlifyPort = 8888
const preferredTargetPort = 5173
const shutdownSignals = ['SIGINT', 'SIGTERM', 'SIGHUP']

function terminateChild(child) {
  if (!child || child.killed) {
    return
  }

  child.kill('SIGTERM')

  setTimeout(() => {
    if (!child.killed) {
      child.kill('SIGKILL')
    }
  }, 2000).unref()
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function isPortAvailable(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = net.createServer()

    server.once('error', () => resolve(false))
    server.once('listening', () => {
      server.close(() => resolve(true))
    })

    server.listen(port, host)
  })
}

async function findAvailablePort(startPort, host = '127.0.0.1', attempts = 20) {
  for (let offset = 0; offset < attempts; offset += 1) {
    const candidate = startPort + offset
    // eslint-disable-next-line no-await-in-loop
    if (await isPortAvailable(candidate, host)) {
      return candidate
    }
  }

  throw new Error(`Unable to find an open port starting at ${startPort}.`)
}

async function waitForPort(port, host = '127.0.0.1', timeoutMs = 45000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    // eslint-disable-next-line no-await-in-loop
    const available = await isPortAvailable(port, host)
    if (!available) {
      return
    }

    // eslint-disable-next-line no-await-in-loop
    await delay(250)
  }

  throw new Error(`Timed out waiting for port ${port} to accept connections.`)
}

async function main() {
  const targetPort = await findAvailablePort(preferredTargetPort)
  const netlifyPort = await findAvailablePort(preferredNetlifyPort)

  console.log(`[dev:netlify] Starting Vite on http://127.0.0.1:${targetPort}`)
  if (netlifyPort !== preferredNetlifyPort || targetPort !== preferredTargetPort) {
    console.log(`[dev:netlify] Preferred ports were occupied. Using Netlify port ${netlifyPort} and target port ${targetPort}.`)
  }

  const viteProcess = spawn(`npx vite --host 127.0.0.1 --port ${targetPort} --strictPort`, {
    stdio: 'inherit',
    env: process.env,
    shell: true,
  })

  await waitForPort(targetPort)

  console.log(`[dev:netlify] Starting Netlify dev on http://127.0.0.1:${netlifyPort}`)
  const netlifyProcess = spawn(`netlify dev --port ${netlifyPort} --framework vite --target-port ${targetPort}`, {
    stdio: 'inherit',
    env: process.env,
    shell: true,
  })

  let shuttingDown = false

  const shutdown = (code = 0) => {
    if (shuttingDown) {
      return
    }

    shuttingDown = true
    terminateChild(viteProcess)
    terminateChild(netlifyProcess)
    process.exit(code)
  }

  for (const signal of shutdownSignals) {
    process.on(signal, () => shutdown(0))
  }

  netlifyProcess.once('exit', (code) => {
    shutdown(code ?? 0)
  })

  viteProcess.once('exit', (code) => {
    if (!shuttingDown) {
      console.error(`[dev:netlify] Vite exited unexpectedly with code ${code ?? 0}.`)
      shutdown(code ?? 1)
    }
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
