import http from 'http'
import fs from 'fs'
import path from 'path'
import os from 'os'

const PORT_FILE = path.join(os.homedir(), '.skills-manager', '.ipc-port')

let server: http.Server | null = null
let onOpenCallback: ((projectPath: string) => void) | null = null

export function startIpcServer(): number {
  if (server) return (server.address() as any).port

  const managerDir = path.join(os.homedir(), '.skills-manager')
  fs.mkdirSync(managerDir, { recursive: true })

  server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url?.startsWith('/open')) {
      const url = new URL(req.url, `http://${req.headers.host}`)
      const projectPath = url.searchParams.get('path') || ''
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok' }))
      if (onOpenCallback) onOpenCallback(projectPath)
    } else {
      res.writeHead(404)
      res.end('not found')
    }
  })

  server.listen(0, '127.0.0.1', () => {
    const port = (server!.address() as any).port
    fs.writeFileSync(PORT_FILE, port.toString(), 'utf-8')
  })

  return (server.address() as any).port
}

export function onOpen(callback: (projectPath: string) => void): void {
  onOpenCallback = callback
}

export function stopIpcServer(): void {
  if (server) {
    server.close()
    server = null
  }
  try { fs.unlinkSync(PORT_FILE) } catch { /* ignore */ }
}

export function getIpcPort(): number | null {
  try {
    const portStr = fs.readFileSync(PORT_FILE, 'utf-8').trim()
    const port = parseInt(portStr)
    return Number.isNaN(port) ? null : port
  } catch {
    return null
  }
}
