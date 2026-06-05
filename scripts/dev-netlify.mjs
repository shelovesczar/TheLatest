import { spawn } from 'node:child_process'
import net from 'node:net'
import process from 'node:process'

const isWindows = process.platform === 'win32'
const npmCommand = 'npm'
const netlifyCommand = 'netlify'
const targetPort = 5173
const shutdownSignals = ['SIGINT', 'SIGTERM', 'SIGHUP']

function waitForPort(port, timeoutMs = 30000) {
  const startedAt = Date.now()

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = new net.Socket()

      socket.setTimeout(1000)
      socket.once('connect', () => {
        socket.destroy()
        resolve()
      })

      const retry = () => {
        socket.destroy()

        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timed out waiting for port ${port} to open after ${timeoutMs}ms`))
          return
        }

        setTimeout(tryConnect, 500)
      }

      socket.once('timeout', retry)
      socket.once('error', retry)
      socket.connect(port, '127.0.0.1')
    }

    tryConnect()
  })
}

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

async function main() {
  const viteProcess = spawn(
    npmCommand,
    ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(targetPort), '--strictPort'],
    {
      stdio: 'inherit',
      shell: isWindows,
      env: process.env,
    },
  )

  let netlifyProcess
  let shuttingDown = false

  const shutdown = (code = 0) => {
    if (shuttingDown) {
      return
    }

    shuttingDown = true
    terminateChild(netlifyProcess)
    terminateChild(viteProcess)
    process.exit(code)
  }

  for (const signal of shutdownSignals) {
    process.on(signal, () => shutdown(0))
  }

  viteProcess.once('exit', (code) => {
    if (!shuttingDown) {
      shutdown(code ?? 1)
    }
  })

  try {
    await waitForPort(targetPort)
  } catch (error) {
    console.error(error.message)
    shutdown(1)
    return
  }

  netlifyProcess = spawn(
    netlifyCommand,
    ['dev', '--target-port', String(targetPort)],
    {
      stdio: 'inherit',
      shell: isWindows,
      env: process.env,
    },
  )

  netlifyProcess.once('exit', (code) => {
    shutdown(code ?? 0)
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
