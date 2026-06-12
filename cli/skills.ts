#!/usr/bin/env node
import http from 'http'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'

const PORT_FILE = path.join(os.homedir(), '.skills-manager', '.ipc-port')
const cwd = process.cwd()

function getStoredPort(): number | null {
  try {
    const portStr = fs.readFileSync(PORT_FILE, 'utf-8').trim()
    const port = parseInt(portStr)
    return Number.isNaN(port) ? null : port
  } catch {
    return null
  }
}

function sendOpenRequest(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const req = http.get(`http://127.0.0.1:${port}/open?path=${encodeURIComponent(cwd)}`, res => {
      let body = ''
      res.on('data', (chunk: Buffer) => { body += chunk.toString() })
      res.on('end', () => {
        try {
          const data = JSON.parse(body)
          resolve(data.status === 'ok')
        } catch {
          resolve(false)
        }
      })
    })
    req.on('error', () => resolve(false))
    req.setTimeout(3000, () => { req.destroy(); resolve(false) })
  })
}

function launchElectron(): void {
  const possiblePaths = [
    path.join(__dirname, '..', '..', 'node_modules', '.bin', 'electron'),
    path.join(__dirname, '..', '..', '..', 'node_modules', '.bin', 'electron'),
  ]

  for (const p of possiblePaths) {
    if (fs.existsSync(p) || fs.existsSync(p + '.cmd')) {
      execSync(`"${p}" "${path.join(__dirname, '..', '..')}"`, { stdio: 'inherit', cwd: path.join(__dirname, '..', '..') })
      return
    }
  }

  console.error('Cannot find Electron binary. Run from within skills-manager project or install globally.')
  process.exit(1)
}

async function main() {
  const port = getStoredPort()

  if (port) {
    const ok = await sendOpenRequest(port)
    if (ok) return
  }

  launchElectron()
}

main()
