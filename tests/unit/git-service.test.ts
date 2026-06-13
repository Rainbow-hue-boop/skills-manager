import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'

function runGit(args: string, cwd: string): string {
  return execSync(`git ${args}`, { cwd, encoding: 'utf-8', stdio: 'pipe' }).trim()
}

let tmpDir: string
let remoteDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-'))
  remoteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-remote-'))

  runGit('init --bare', remoteDir)

  runGit('init', tmpDir)
  runGit('config user.email "test@test.com"', tmpDir)
  runGit('config user.name "Test"', tmpDir)
  fs.writeFileSync(path.join(tmpDir, 'test.txt'), 'hello')
  runGit('add -A', tmpDir)
  runGit('commit -m "init"', tmpDir)
  runGit(`remote add origin ${remoteDir}`, tmpDir)
  runGit('push -u origin HEAD', tmpDir)
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
  fs.rmSync(remoteDir, { recursive: true, force: true })
})

it('detects git repo', async () => {
  const { isGitRepo } = await import('../../src/main/git-service')
  expect(isGitRepo(tmpDir)).toBe(true)
  expect(isGitRepo(path.join(tmpDir, 'nonexistent'))).toBe(false)
})

it('reports clean status', async () => {
  const { getStatus } = await import('../../src/main/git-service')
  const status = getStatus(tmpDir)
  expect(status.clean).toBe(true)
  expect(status.hasConflicts).toBe(false)
})

it('reports dirty status after file change', async () => {
  const { getStatus } = await import('../../src/main/git-service')
  fs.writeFileSync(path.join(tmpDir, 'test.txt'), 'changed')
  const status = getStatus(tmpDir)
  expect(status.clean).toBe(false)
})

it('returns log entries', async () => {
  const { gitLog } = await import('../../src/main/git-service')
  const log = gitLog(tmpDir)
  expect(log.length).toBeGreaterThan(0)
  expect(log[0].hash).toBeTruthy()
})
