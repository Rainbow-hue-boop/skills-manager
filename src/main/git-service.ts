import { execSync, ExecSyncOptions } from 'child_process'
import { GitStatus, GitLogEntry } from '../shared/types'

function git(args: string[], cwd: string): string {
  const opts: ExecSyncOptions = { cwd, encoding: 'utf-8', timeout: 30000, stdio: 'pipe' }
  try {
    return execSync(`git ${args.join(' ')}`, opts).toString().trim()
  } catch (e: any) {
    const stderr = e.stderr?.toString() || ''
    throw new Error(stderr.trim() || e.message)
  }
}

export function isGitRepo(dir: string): boolean {
  try {
    git(['rev-parse', '--git-dir'], dir)
    return true
  } catch {
    return false
  }
}

export function gitInit(dir: string): void {
  git(['init'], dir)
}

export function setRemote(dir: string, url: string): void {
  try {
    git(['remote', 'remove', 'origin'], dir)
  } catch { /* no remote yet */ }
  git(['remote', 'add', 'origin', url], dir)
}

export function getStatus(dir: string): GitStatus {
  const output = git(['status', '--porcelain', '-b'], dir)
  const lines = output.split('\n')
  const branchLine = lines[0] || ''

  let ahead = 0
  let behind = 0
  const aheadMatch = branchLine.match(/\[ahead (\d+)/)
  const behindMatch = branchLine.match(/\[behind (\d+)/)
  if (aheadMatch) ahead = parseInt(aheadMatch[1])
  if (behindMatch) behind = parseInt(behindMatch[1])

  const changes = lines.slice(1).filter(l => l.trim().length > 0)

  let remoteUrl: string | null = null
  try {
    remoteUrl = git(['remote', 'get-url', 'origin'], dir)
  } catch { /* no remote */ }

  return {
    clean: changes.length === 0,
    ahead,
    behind,
    hasConflicts: output.includes('UU ') || output.includes('DD ') || output.includes('AA '),
    currentBranch: branchLine.split(' ').pop()?.replace('...', '') || 'main',
    remoteUrl,
    lastSync: null
  }
}

export function gitPull(dir: string): string {
  return git(['pull', '--rebase', 'origin'], dir)
}

export function gitPush(dir: string): string {
  return git(['push', 'origin'], dir)
}

export function gitAddAll(dir: string): void {
  git(['add', '-A'], dir)
}

export function gitCommit(dir: string, message: string): string {
  return git(['commit', '-m', message], dir)
}

export function gitLog(dir: string, count: number = 10): GitLogEntry[] {
  const format = '--format=%H@@@%ad@@@%s@@@%an'
  const output = git(['log', `-${count}`, format, '--date=iso'], dir)
  return output.split('\n').filter(Boolean).map(line => {
    const [hash, date, message, author] = line.split('@@@')
    return { hash, date, message, author }
  })
}
