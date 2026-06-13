# Skills Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-platform Electron desktop app for managing opencode skills — organize in groups, install via symlink, sync via Git, with CLI launcher.

**Architecture:** Electron main process hosts an IPC HTTP server (localhost random port) that receives CLI requests. Core logic (SkillManager for file ops, GitService for git sync) runs in main. React renderer provides the GUI with dark premium styling.

**Tech Stack:** Electron 33 + React 18 + TypeScript 5 + electron-vite + Vitest + Playwright, system Git CLI, electron-builder for packaging.

---

## File Structure

```
skills-manager/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.web.json
├── electron-builder.yml
├── electron.vite.config.ts
├── src/
│   ├── main/
│   │   ├── index.ts              # Electron app entry, window management
│   │   ├── ipc-server.ts         # HTTP server on random port, handles /open
│   │   ├── skill-manager.ts      # Core: scan groups, symlink/copy, install
│   │   └── git-service.ts        # Git pull/push/status via child_process
│   ├── preload/
│   │   └── index.ts              # contextBridge: expose ipcRenderer APIs
│   ├── renderer/
│   │   ├── index.html
│   │   ├── main.tsx              # React entry
│   │   ├── App.tsx               # Sidebar layout + router
│   │   ├── pages/
│   │   │   ├── GroupList.tsx     # Home page: card grid, search, add group
│   │   │   ├── GroupDetail.tsx   # Skill list + install to project
│   │   │   ├── SyncPage.tsx      # Git status, pull, push, log
│   │   │   └── Settings.tsx      # Repo path, remote URL, auto-sync
│   │   ├── components/
│   │   │   ├── Sidebar.tsx       # Navigation + status dot
│   │   │   ├── TagPill.tsx       # Colored tag badge
│   │   │   ├── SkillCard.tsx     # Skill item row with checkbox
│   │   │   ├── GroupCard.tsx     # Group card for grid
│   │   │   ├── Toast.tsx         # Bottom-right notification
│   │   │   └── StatusDot.tsx     # Green/yellow/red indicator
│   │   └── styles/
│   │       └── globals.css       # Dark premium theme, CSS variables
│   └── shared/
│       └── types.ts              # Shared TypeScript types
├── cli/
│   └── skills.ts                 # CLI entry (compiled to skills.exe via pkg)
├── resources/
│   └── icon.png
└── tests/
    ├── unit/
    │   ├── skill-manager.test.ts
    │   └── git-service.test.ts
    ├── integration/
    │   └── install-flow.test.ts
    └── e2e/
        └── install.spec.ts
```

---

### Task 0: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`, `electron.vite.config.ts`, `electron-builder.yml`

- [ ] **Step 1: Initialize project**

Create `package.json`:
```json
{
  "name": "skills-manager",
  "version": "1.0.0",
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "package": "electron-builder",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {},
  "devDependencies": {}
}
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install electron @electron-toolkit/preload @electron-toolkit/utils
npm install -D electron-vite @vitejs/plugin-react react react-dom react-router-dom @types/react @types/react-dom typescript electron-builder vitest @playwright/test
```

- [ ] **Step 3: Create tsconfig files**

Create `tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

Create `tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "outDir": "./out",
    "rootDir": "./src",
    "strict": true,
    "target": "ESNext",
    "lib": ["ESNext"],
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/main/**/*", "src/preload/**/*", "src/shared/**/*", "electron.vite.config.ts"]
}
```

Create `tsconfig.web.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "outDir": "./out",
    "rootDir": "./src",
    "strict": true,
    "target": "ESNext",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/renderer/**/*", "src/shared/**/*"]
}
```

- [ ] **Step 4: Create electron-vite config**

Create `electron.vite.config.ts`:
```typescript
import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') }
      }
    }
  },
  preload: {
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/renderer/index.html') }
      }
    },
    plugins: [react()]
  }
})
```

- [ ] **Step 5: Create electron-builder config**

Create `electron-builder.yml`:
```yaml
appId: com.skills-manager.app
productName: Skills Manager
directories:
  output: dist
files:
  - out/**/*
  - resources/**/*
extraResources:
  - from: cli/
    to: cli/
win:
  target: nsis
  icon: resources/icon.png
mac:
  target: dmg
  icon: resources/icon.png
  extendInfo:
    LSEnvironment:
      PATH: /usr/local/bin:/usr/bin:/bin
```

- [ ] **Step 6: Create entry files (stubs)**

Create `src/renderer/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Skills Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

Create `src/renderer/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 7: Verify scaffold**

Run:
```bash
npx electron-vite build
```
Expected: builds without errors.

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json tsconfig.node.json tsconfig.web.json electron.vite.config.ts electron-builder.yml src/renderer/index.html src/renderer/main.tsx
git commit -m "scaffold: Electron + React + TypeScript project with electron-vite"
```

---

### Task 1: Shared Types

**Files:**
- Create: `src/shared/types.ts`

- [ ] **Step 1: Write types file**

Create `src/shared/types.ts`:
```typescript
export interface SkillEntry {
  group: string
  source: string
  skillPath: string
  computedHash: string
}

export interface GroupEntry {
  source: string
  sourceType: 'github'
  installedAt: string
  tags: string[]
}

export interface SkillsLockFile {
  version: number
  groups: Record<string, GroupEntry>
  skills: Record<string, SkillEntry>
}

export interface InstalledSkill {
  group: string
  target: string
  linkType: 'symlink' | 'junction' | 'copy'
}

export interface SkillsInstalledFile {
  installedAt: string
  groups: string[]
  skills: Record<string, InstalledSkill>
}

export interface InstallResult {
  skillName: string
  group: string
  status: 'success' | 'copied' | 'skipped' | 'failed'
  linkType: 'symlink' | 'junction' | 'copy' | null
  error?: string
}

export interface GitStatus {
  clean: boolean
  ahead: number
  behind: number
  hasConflicts: boolean
  currentBranch: string
  remoteUrl: string | null
  lastSync: string | null
}

export interface GitLogEntry {
  hash: string
  date: string
  message: string
  author: string
}

export type SyncStatus = 'clean' | 'dirty' | 'conflict'
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npx tsc --noEmit -p tsconfig.node.json
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

### Task 2: SkillManager — Scan & Lock File

**Files:**
- Create: `src/main/skill-manager.ts`
- Create: `tests/unit/skill-manager.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/unit/skill-manager.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { scanGroups, readLockFile, writeLockFile, getSkillManagerDir } from '../../src/main/skill-manager'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('scanGroups', () => {
  it('returns empty object for empty dir', () => {
    const result = scanGroups(tmpDir)
    expect(result).toEqual({})
  })

  it('detects groups with SKILL.md files', () => {
    fs.mkdirSync(path.join(tmpDir, 'superpowers', 'brainstorming'), { recursive: true })
    fs.writeFileSync(path.join(tmpDir, 'superpowers', 'brainstorming', 'SKILL.md'), '# Skill')
    fs.mkdirSync(path.join(tmpDir, 'superpowers', 'using-superpowers'), { recursive: true })
    fs.writeFileSync(path.join(tmpDir, 'superpowers', 'using-superpowers', 'SKILL.md'), '# Skill')

    const result = scanGroups(tmpDir)
    expect(result).toHaveProperty('superpowers')
    expect(result.superpowers).toHaveLength(2)
    const names = result.superpowers.map(s => s.name)
    expect(names).toContain('brainstorming')
    expect(names).toContain('using-superpowers')
  })

  it('ignores dirs without SKILL.md', () => {
    fs.mkdirSync(path.join(tmpDir, 'empty-group', 'empty-skill'), { recursive: true })
    const result = scanGroups(tmpDir)
    expect(result).toEqual({})
  })
})

describe('readLockFile', () => {
  it('returns null if file does not exist', () => {
    const result = readLockFile(tmpDir)
    expect(result).toBeNull()
  })

  it('parses valid lock file', () => {
    const content = {
      version: 1,
      groups: { superpowers: { source: 'obra/superpowers', sourceType: 'github', installedAt: '2026-01-01T00:00:00Z', tags: [] } },
      skills: { brainstorming: { group: 'superpowers', source: 'obra/superpowers', skillPath: 'skills/brainstorming/SKILL.md', computedHash: 'abc' } }
    }
    fs.writeFileSync(path.join(tmpDir, 'skills-lock.json'), JSON.stringify(content))
    const result = readLockFile(tmpDir)
    expect(result).not.toBeNull()
    expect(result!.groups.superpowers.tags).toEqual([])
  })

  it('returns null and backs up corrupted file', () => {
    fs.writeFileSync(path.join(tmpDir, 'skills-lock.json'), 'not json {{{')
    const result = readLockFile(tmpDir)
    expect(result).toBeNull()
    expect(fs.existsSync(path.join(tmpDir, 'skills-lock.json.corrupted'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npx vitest run tests/unit/skill-manager.test.ts
```
Expected: FAIL (module not found)

- [ ] **Step 3: Implement SkillManager — scan & lock file**

Create `src/main/skill-manager.ts`:
```typescript
import fs from 'fs'
import path from 'path'
import os from 'os'
import { SkillsLockFile } from '../shared/types'

export function getSkillManagerDir(): string {
  const home = os.homedir()
  return path.join(home, '.skills-manager')
}

export interface ScannedSkill {
  name: string
  path: string
  hasHash?: string
}

export function scanGroups(managerDir: string): Record<string, ScannedSkill[]> {
  const groups: Record<string, ScannedSkill[]> = {}
  if (!fs.existsSync(managerDir)) return groups

  const groupDirs = fs.readdirSync(managerDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))

  for (const groupDir of groupDirs) {
    const groupPath = path.join(managerDir, groupDir.name)
    const skillDirs = fs.readdirSync(groupPath, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.'))

    const skills: ScannedSkill[] = []
    for (const skillDir of skillDirs) {
      const skillMdPath = path.join(groupPath, skillDir.name, 'SKILL.md')
      if (fs.existsSync(skillMdPath)) {
        skills.push({ name: skillDir.name, path: path.join(groupPath, skillDir.name) })
      }
    }

    if (skills.length > 0) {
      groups[groupDir.name] = skills
    }
  }

  return groups
}

export function readLockFile(managerDir: string): SkillsLockFile | null {
  const lockPath = path.join(managerDir, 'skills-lock.json')
  if (!fs.existsSync(lockPath)) return null

  try {
    const raw = fs.readFileSync(lockPath, 'utf-8')
    return JSON.parse(raw) as SkillsLockFile
  } catch {
    const backupPath = path.join(managerDir, 'skills-lock.json.corrupted')
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(lockPath, backupPath)
    }
    return null
  }
}

export function writeLockFile(managerDir: string, data: SkillsLockFile): void {
  const lockPath = path.join(managerDir, 'skills-lock.json')
  fs.writeFileSync(lockPath, JSON.stringify(data, null, 2), 'utf-8')
}
```

- [ ] **Step 4: Run tests**

Run:
```bash
npx vitest run tests/unit/skill-manager.test.ts
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/skill-manager.ts tests/unit/skill-manager.test.ts
git commit -m "feat: SkillManager — scan groups, read/write lock file"
```

---

### Task 3: SkillManager — Install (symlink/copy)

**Files:**
- Modify: `src/main/skill-manager.ts`
- Modify: `tests/unit/skill-manager.test.ts`

- [ ] **Step 1: Write failing test for install**

Append to `tests/unit/skill-manager.test.ts`:
```typescript
import { installSkills, isCrossVolume } from '../../src/main/skill-manager'

describe('installSkills', () => {
  it('creates directory symlinks on same volume', () => {
    fs.mkdirSync(path.join(tmpDir, 'superpowers', 'brainstorming'), { recursive: true })
    fs.writeFileSync(path.join(tmpDir, 'superpowers', 'brainstorming', 'SKILL.md'), '# Skill')

    const projectDir = path.join(tmpDir, 'project')
    fs.mkdirSync(projectDir, { recursive: true })

    const results = installSkills(tmpDir, projectDir, 'superpowers')
    expect(results.length).toBe(1)
    expect(results[0].skillName).toBe('brainstorming')
    expect(results[0].status).toBe('success')

    const linkPath = path.join(projectDir, '.agents', 'skills', 'brainstorming')
    expect(fs.existsSync(linkPath)).toBe(true)
    expect(fs.lstatSync(linkPath).isSymbolicLink()).toBe(true)
    expect(fs.existsSync(path.join(linkPath, 'SKILL.md'))).toBe(true)
  })

  it('skips if skill already exists', () => {
    fs.mkdirSync(path.join(tmpDir, 'superpowers', 'brainstorming'), { recursive: true })
    fs.writeFileSync(path.join(tmpDir, 'superpowers', 'brainstorming', 'SKILL.md'), '# Skill')

    const projectDir = path.join(tmpDir, 'project')
    const skillsDir = path.join(projectDir, '.agents', 'skills', 'brainstorming')
    fs.mkdirSync(skillsDir, { recursive: true })

    const results = installSkills(tmpDir, projectDir, 'superpowers')
    expect(results[0].status).toBe('skipped')
  })

  it('writes .skills-installed.json', () => {
    fs.mkdirSync(path.join(tmpDir, 'superpowers', 'brainstorming'), { recursive: true })
    fs.writeFileSync(path.join(tmpDir, 'superpowers', 'brainstorming', 'SKILL.md'), '# Skill')

    const projectDir = path.join(tmpDir, 'project')

    installSkills(tmpDir, projectDir, 'superpowers')

    const installedPath = path.join(projectDir, '.agents', 'skills', '.skills-installed.json')
    expect(fs.existsSync(installedPath)).toBe(true)
    const data = JSON.parse(fs.readFileSync(installedPath, 'utf-8'))
    expect(data.skills.brainstorming).toBeDefined()
    expect(data.skills.brainstorming.group).toBe('superpowers')
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:
```bash
npx vitest run tests/unit/skill-manager.test.ts
```
Expected: FAIL (installSkills, isCrossVolume not exported)

- [ ] **Step 3: Implement installSkills**

Append to `src/main/skill-manager.ts`:
```typescript
import child_process from 'child_process'
import { InstallResult, SkillsInstalledFile } from '../shared/types'

export function isCrossVolume(sourcePath: string, targetPath: string): boolean {
  if (process.platform === 'win32') {
    const sourceDrive = path.parse(sourcePath).root
    const targetDrive = path.parse(targetPath).root
    return sourceDrive !== targetDrive
  }
  try {
    const sourceStat = fs.statSync(sourcePath)
    const targetStat = fs.statSync(path.parse(targetPath).root)
    return sourceStat.dev !== targetStat.dev
  } catch {
    return false
  }
}

function createSymlink(source: string, target: string): { success: boolean; linkType: 'symlink' | 'junction' } {
  try {
    if (process.platform === 'win32') {
      child_process.execSync(`mklink /J "${target}" "${source}"`, { stdio: 'pipe' })
      return { success: true, linkType: 'junction' }
    } else {
      fs.symlinkSync(source, target, 'dir')
      return { success: true, linkType: 'symlink' }
    }
  } catch {
    return { success: false, linkType: 'junction' }
  }
}

function copyDirectory(source: string, target: string): boolean {
  try {
    fs.cpSync(source, target, { recursive: true })
    return true
  } catch {
    return false
  }
}

export function installSkills(
  managerDir: string,
  projectDir: string,
  groupName: string
): InstallResult[] {
  const results: InstallResult[] = []
  const skillsDir = path.join(projectDir, '.agents', 'skills')
  fs.mkdirSync(skillsDir, { recursive: true })

  const scanned = scanGroups(managerDir)
  const skills = scanned[groupName]
  if (!skills) return results

  for (const skill of skills) {
    const targetPath = path.join(skillsDir, skill.name)
    const sourcePath = skill.path

    if (fs.existsSync(targetPath)) {
      results.push({
        skillName: skill.name,
        group: groupName,
        status: 'skipped',
        linkType: null
      })
      continue
    }

    const crossVolume = isCrossVolume(sourcePath, targetPath)

    if (!crossVolume) {
      const linkResult = createSymlink(sourcePath, targetPath)
      if (linkResult.success) {
        results.push({
          skillName: skill.name,
          group: groupName,
          status: 'success',
          linkType: linkResult.linkType
        })
        continue
      }
    }

    const copied = copyDirectory(sourcePath, targetPath)
    results.push({
      skillName: skill.name,
      group: groupName,
      status: copied ? 'copied' : 'failed',
      linkType: 'copy',
      error: copied ? undefined : 'Failed to copy directory'
    })
  }

  writeInstalledFile(projectDir, managerDir, groupName, results)
  return results
}

function writeInstalledFile(
  projectDir: string,
  managerDir: string,
  groupName: string,
  results: InstallResult[]
): void {
  const installedPath = path.join(projectDir, '.agents', 'skills', '.skills-installed.json')
  let existing: SkillsInstalledFile = { installedAt: '', groups: [], skills: {} }

  if (fs.existsSync(installedPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(installedPath, 'utf-8'))
    } catch { /* use default */ }
  }

  existing.installedAt = new Date().toISOString()
  if (!existing.groups.includes(groupName)) {
    existing.groups.push(groupName)
  }

  for (const result of results) {
    if (result.status === 'success' || result.status === 'copied') {
      existing.skills[result.skillName] = {
        group: groupName,
        target: path.join(managerDir, groupName, result.skillName),
        linkType: result.linkType || 'copy'
      }
    }
  }

  fs.writeFileSync(installedPath, JSON.stringify(existing, null, 2), 'utf-8')
}
```

- [ ] **Step 4: Run tests**

Run:
```bash
npx vitest run tests/unit/skill-manager.test.ts
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/skill-manager.ts tests/unit/skill-manager.test.ts
git commit -m "feat: SkillManager — install skills via symlink/copy"
```

---

### Task 4: GitService

**Files:**
- Create: `src/main/git-service.ts`
- Create: `tests/unit/git-service.test.ts`

- [ ] **Step 1: Write git-service module**

Create `src/main/git-service.ts`:
```typescript
import { execSync, ExecSyncOptions } from 'child_process'
import { GitStatus, GitLogEntry } from '../shared/types'

function git(args: string[], cwd: string): string {
  const opts: ExecSyncOptions = { cwd, encoding: 'utf-8', timeout: 30000, stdio: 'pipe' }
  try {
    return execSync(`git ${args.join(' ')}`, opts).trim()
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
  const format = '--format=%H|||%ad|||%s|||%an'
  const output = git(['log', `-${count}`, format, '--date=iso'], dir)
  return output.split('\n').filter(Boolean).map(line => {
    const [hash, date, message, author] = line.split('|||')
    return { hash, date, message, author }
  })
}
```

- [ ] **Step 2: Write unit test (mocked)**

Create `tests/unit/git-service.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'

function runGit(args: string, cwd: string): string {
  return execSync(`git ${args}`, { cwd, encoding: 'utf-8', stdio: 'pipe' }).trim()
}

// Integration-style test using real git in temp dir
describe('GitService (with real git)', () => {
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
    runGit('push -u origin master', tmpDir)
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
})
```

- [ ] **Step 3: Run test to verify git works**

Run:
```bash
npx vitest run tests/unit/git-service.test.ts
```
Expected: all PASS

- [ ] **Step 4: Commit**

```bash
git add src/main/git-service.ts tests/unit/git-service.test.ts
git commit -m "feat: GitService — status, pull, push, log via system git CLI"
```

---

### Task 5: IPC Server

**Files:**
- Create: `src/main/ipc-server.ts`

- [ ] **Step 1: Write IPC server**

Create `src/main/ipc-server.ts`:
```typescript
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
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npx tsc --noEmit -p tsconfig.node.json
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/main/ipc-server.ts
git commit -m "feat: IPC HTTP server on random port with /open endpoint"
```

---

### Task 6: Electron Main Process

**Files:**
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`

- [ ] **Step 1: Write preload script**

Create `src/preload/index.ts`:
```typescript
import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getGroups: () => ipcRenderer.invoke('get-groups'),
  getGroupSkills: (groupName: string) => ipcRenderer.invoke('get-group-skills', groupName),
  installSkills: (projectPath: string, groupNames: string[]) =>
    ipcRenderer.invoke('install-skills', projectPath, groupNames),
  getProjectPath: () => ipcRenderer.invoke('get-project-path'),
  getGitStatus: () => ipcRenderer.invoke('get-git-status'),
  gitSync: () => ipcRenderer.invoke('git-sync'),
  gitLog: () => ipcRenderer.invoke('git-log'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: { remoteUrl: string; autoSync: boolean }) =>
    ipcRenderer.invoke('save-settings', settings),
  addGroup: (sourcePath: string, groupName: string) =>
    ipcRenderer.invoke('add-group', sourcePath, groupName),
  onOpenFromCli: (callback: (path: string) => void) => {
    ipcRenderer.on('open-from-cli', (_event, path: string) => callback(path))
  },
  onInstallProgress: (callback: (data: { current: number; total: number }) => void) => {
    ipcRenderer.on('install-progress', (_event, data) => callback(data))
  }
}

contextBridge.exposeInMainWorld('skillsApi', api)

export type SkillsApi = typeof api
```

- [ ] **Step 2: Write main process**

Create `src/main/index.ts`:
```typescript
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { startIpcServer, onOpen, stopIpcServer, getIpcPort } from './ipc-server'
import { scanGroups, getSkillManagerDir, installSkills, readLockFile } from './skill-manager'
import { getStatus, gitPull, gitPush, gitAddAll, gitCommit, gitLog, isGitRepo, gitInit, setRemote } from './git-service'
import fs from 'fs'
import os from 'os'

let mainWindow: BrowserWindow | null = null
let cliProjectPath: string = ''

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 680,
    minWidth: 780,
    minHeight: 500,
    title: 'Skills Manager',
    backgroundColor: '#0d0d0d',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  startIpcServer()

  onOpen((projectPath: string) => {
    cliProjectPath = projectPath
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('open-from-cli', projectPath)
    }
  })

  registerIpcHandlers()
})

app.on('window-all-closed', () => {
  stopIpcServer()
  app.quit()
})

function registerIpcHandlers(): void {
  const managerDir = getSkillManagerDir()

  ipcMain.handle('get-groups', () => {
    const lockFile = readLockFile(managerDir)
    const scanned = scanGroups(managerDir)
    const groups: Record<string, { name: string; skillCount: number; tags: string[]; source: string }> = {}

    for (const [groupName, skills] of Object.entries(scanned)) {
      const lockGroup = lockFile?.groups[groupName]
      groups[groupName] = {
        name: groupName,
        skillCount: skills.length,
        tags: lockGroup?.tags || [],
        source: lockGroup?.source || 'local'
      }
    }
    return groups
  })

  ipcMain.handle('get-group-skills', (_event, groupName: string) => {
    const scanned = scanGroups(managerDir)
    const lockFile = readLockFile(managerDir)
    const skills = scanned[groupName] || []
    return skills.map(s => ({
      name: s.name,
      hash: lockFile?.skills[s.name]?.computedHash || '',
      source: lockFile?.skills[s.name]?.source || ''
    }))
  })

  ipcMain.handle('install-skills', async (_event, projectPath: string, groupNames: string[]) => {
    const allResults: any[] = []
    for (let i = 0; i < groupNames.length; i++) {
      const results = installSkills(managerDir, projectPath, groupNames[i])
      allResults.push(...results)
      if (mainWindow) {
        mainWindow.webContents.send('install-progress', { current: i + 1, total: groupNames.length })
      }
    }
    return allResults
  })

  ipcMain.handle('get-project-path', () => cliProjectPath)

  ipcMain.handle('get-git-status', () => {
    try {
      return getStatus(managerDir)
    } catch {
      return { clean: true, ahead: 0, behind: 0, hasConflicts: false, currentBranch: '', remoteUrl: null, lastSync: null }
    }
  })

  ipcMain.handle('git-sync', async () => {
    gitAddAll(managerDir)
    try { gitCommit(managerDir, 'sync: auto commit') } catch { /* nothing to commit */ }
    try { gitPull(managerDir) } catch (e: any) { return { success: false, error: e.message } }
    try { gitPush(managerDir) } catch (e: any) { return { success: false, error: e.message } }
    return { success: true }
  })

  ipcMain.handle('git-log', () => {
    try {
      return gitLog(managerDir)
    } catch {
      return []
    }
  })

  ipcMain.handle('get-settings', () => {
    const settingsPath = path.join(managerDir, '.settings.json')
    try {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    } catch {
      return { remoteUrl: '', autoSync: false }
    }
  })

  ipcMain.handle('save-settings', (_event, settings: { remoteUrl: string; autoSync: boolean }) => {
    const settingsPath = path.join(managerDir, '.settings.json')
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')

    if (settings.remoteUrl) {
      if (!isGitRepo(managerDir)) {
        gitInit(managerDir)
      }
      setRemote(managerDir, settings.remoteUrl)
    }
    return { success: true }
  })

  ipcMain.handle('add-group', (_event, sourcePath: string, groupName: string) => {
    const targetPath = path.join(managerDir, groupName)
    fs.cpSync(sourcePath, targetPath, { recursive: true })
    return { success: true }
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/main/index.ts src/preload/index.ts
git commit -m "feat: Electron main process with IPC handlers"
```

---

### Task 7: Dark Premium Theme

**Files:**
- Create: `src/renderer/styles/globals.css`

- [ ] **Step 1: Write CSS**

Create `src/renderer/styles/globals.css`:
```css
:root {
  --bg-primary: #0d0d0d;
  --bg-secondary: #111111;
  --bg-tertiary: #0a0a0a;
  --bg-card: #111;
  --bg-card-hover: #161616;
  --border-primary: #1a1a1a;
  --border-secondary: #222;
  --border-active: #333;
  --text-primary: #eee;
  --text-secondary: #999;
  --text-tertiary: #666;
  --text-muted: #444;
  --accent: #fff;
  --accent-dim: #aaa;
  --tag-bg: rgba(255,255,255,0.06);
  --tag-text: #aaa;
  --tag-border: #333;
  --status-green: #22c55e;
  --status-yellow: #eab308;
  --status-red: #ef4444;
  --toast-bg: #1a1a1a;
  --toast-border: #333;
  --sidebar-width: 220px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 100px;
  --shadow-sm: 0 0 1px rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.3);
  --shadow-md: 0 0 1px rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.4);
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
}

*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 13px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}

button {
  font-family: inherit;
  cursor: pointer;
  border: none;
  outline: none;
}

input {
  font-family: inherit;
  outline: none;
}

/* Layout */
.app-layout {
  display: flex;
  height: 100%;
}

.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-tertiary);
  border-right: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 20px 16px 12px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--text-primary);
}

.sidebar-nav {
  flex: 1;
  padding: 0 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  font-size: 12.5px;
  text-decoration: none;
  transition: all 0.15s ease;
}

.sidebar-link:hover {
  color: var(--text-secondary);
  background: rgba(255,255,255,0.03);
}

.sidebar-link.active {
  color: var(--text-primary);
  background: rgba(255,255,255,0.06);
}

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--text-muted);
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}

/* Page headers */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.3px;
}

.page-subtitle {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

/* Cards */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  padding: 20px;
  transition: all 0.15s ease;
}

.card:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-secondary);
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.card-meta {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: 10px;
}

/* Tags */
.tag-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  border: 1px solid var(--tag-border);
  color: var(--tag-text);
  font-size: 10.5px;
  background: var(--tag-bg);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.btn-primary {
  background: var(--accent);
  color: #000;
}

.btn-primary:hover {
  background: #e5e5e5;
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--border-active);
  color: var(--text-secondary);
}

.btn-secondary:hover {
  background: rgba(255,255,255,0.04);
  border-color: #555;
}

/* Input */
.input {
  background: var(--bg-secondary);
  border: 1px solid var(--border-secondary);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  color: var(--text-primary);
  font-size: 12px;
  width: 100%;
  transition: border-color 0.15s;
}

.input:focus {
  border-color: var(--border-active);
}

.input::placeholder {
  color: var(--text-muted);
}

/* Search bar */
.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
}

.search-bar .input {
  max-width: 300px;
}

/* Skill list */
.skill-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skill-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
}

.skill-row:hover {
  border-color: var(--border-secondary);
}

.skill-row .checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
}

/* Status dot */
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.clean { background: var(--status-green); }
.status-dot.dirty { background: var(--status-yellow); }
.status-dot.conflict { background: var(--status-red); }

/* Toast */
.toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 9999;
}

.toast {
  background: var(--toast-bg);
  border: 1px solid var(--toast-border);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  min-width: 280px;
  box-shadow: var(--shadow-md);
  animation: toastIn 0.2s ease;
}

@keyframes toastIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.toast-title {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
}

.toast-body {
  font-size: 11px;
  color: var(--text-secondary);
}

/* Git log */
.log-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-entry {
  padding: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
}

.log-entry .hash {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.log-entry .message {
  font-size: 12px;
  margin-bottom: 2px;
}

.log-entry .meta {
  font-size: 10px;
  color: var(--text-tertiary);
}

/* Settings form */
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 480px;
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.settings-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.settings-hint {
  font-size: 11px;
  color: var(--text-muted);
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-tertiary);
}

.empty-state h3 {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/styles/globals.css
git commit -m "feat: Dark Premium CSS theme"
```

---

### Task 8: Sidebar Component

**Files:**
- Create: `src/renderer/components/Sidebar.tsx`
- Create: `src/renderer/components/StatusDot.tsx`

- [ ] **Step 1: Write StatusDot component**

Create `src/renderer/components/StatusDot.tsx`:
```tsx
import { SyncStatus } from '../../shared/types'

interface StatusDotProps {
  status: SyncStatus
}

export default function StatusDot({ status }: StatusDotProps) {
  return <span className={`status-dot ${status}`} title={status} />
}
```

- [ ] **Step 2: Write Sidebar component**

Create `src/renderer/components/Sidebar.tsx`:
```tsx
import { NavLink } from 'react-router-dom'
import StatusDot from './StatusDot'
import { SyncStatus } from '../../shared/types'
import { useEffect, useState } from 'react'

export default function Sidebar() {
  const [gitStatus, setGitStatus] = useState<SyncStatus>('clean')

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await window.skillsApi.getGitStatus()
        if (status.hasConflicts) setGitStatus('conflict')
        else if (!status.clean || status.ahead > 0) setGitStatus('dirty')
        else setGitStatus('clean')
      } catch {
        setGitStatus('clean')
      }
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <aside className="sidebar">
      <div className="sidebar-header">skills</div>
      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
          所有技能组
        </NavLink>
        <NavLink to="/sync" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
          同步状态
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
          设置
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        <StatusDot status={gitStatus} />
        {gitStatus === 'clean' ? '已同步' : gitStatus === 'dirty' ? '有变更' : '冲突'}
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/Sidebar.tsx src/renderer/components/StatusDot.tsx
git commit -m "feat: Sidebar component with git status indicator"
```

---

### Task 9: App Shell & Routing

**Files:**
- Create: `src/renderer/App.tsx`
- Create: `src/renderer/pages/GroupList.tsx` (stub)
- Create: `src/renderer/pages/GroupDetail.tsx` (stub)
- Create: `src/renderer/pages/SyncPage.tsx` (stub)
- Create: `src/renderer/pages/Settings.tsx` (stub)

- [ ] **Step 1: Write App shell**

Create `src/renderer/App.tsx`:
```tsx
import { HashRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import GroupList from './pages/GroupList'
import GroupDetail from './pages/GroupDetail'
import SyncPage from './pages/SyncPage'
import Settings from './pages/Settings'
import { useEffect, useState } from 'react'

export default function App() {
  const [cliPath, setCliPath] = useState('')

  useEffect(() => {
    const fetchPath = async () => {
      const p = await window.skillsApi.getProjectPath()
      if (p) setCliPath(p)
    }
    fetchPath()
    window.skillsApi.onOpenFromCli((path: string) => {
      setCliPath(path)
    })
  }, [])

  return (
    <HashRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<GroupList />} />
            <Route path="/group/:groupName" element={<GroupDetail cliPath={cliPath} />} />
            <Route path="/sync" element={<SyncPage />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
```

- [ ] **Step 2: Write page stubs**

Create `src/renderer/pages/GroupList.tsx`:
```tsx
export default function GroupList() {
  return (
    <div className="page-header">
      <h1 className="page-title">技能组</h1>
    </div>
  )
}
```

Create `src/renderer/pages/GroupDetail.tsx`:
```tsx
interface GroupDetailProps {
  cliPath: string
}

export default function GroupDetail({ cliPath }: GroupDetailProps) {
  return (
    <div className="page-header">
      <h1 className="page-title">技能组详情</h1>
    </div>
  )
}
```

Create `src/renderer/pages/SyncPage.tsx`:
```tsx
export default function SyncPage() {
  return (
    <div className="page-header">
      <h1 className="page-title">同步状态</h1>
    </div>
  )
}
```

Create `src/renderer/pages/Settings.tsx`:
```tsx
export default function Settings() {
  return (
    <div className="page-header">
      <h1 className="page-title">设置</h1>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck and build**

Run:
```bash
npx tsc --noEmit -p tsconfig.web.json
npx electron-vite build
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/App.tsx src/renderer/pages/GroupList.tsx src/renderer/pages/GroupDetail.tsx src/renderer/pages/SyncPage.tsx src/renderer/pages/Settings.tsx
git commit -m "feat: App shell with sidebar layout and page stubs"
```

---

### Task 10: Type Declaration for Window API

**Files:**
- Create: `src/renderer/types.d.ts`

- [ ] **Step 1: Write type declaration**

Create `src/renderer/types.d.ts`:
```typescript
import { SkillsApi } from '../preload/index'

declare global {
  interface Window {
    skillsApi: SkillsApi
  }
}

export {}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/types.d.ts
git commit -m "fix: add window.skillsApi type declaration"
```

---

### Task 11: GroupList Page

**Files:**
- Create: `src/renderer/components/GroupCard.tsx`
- Create: `src/renderer/components/TagPill.tsx`
- Modify: `src/renderer/pages/GroupList.tsx`
- Modify: `src/preload/index.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 0: Add getManagerPath to preload and main**

Append to `src/preload/index.ts` inside the `api` object:
```typescript
  getManagerPath: () => ipcRenderer.invoke('get-manager-path'),
```

Append to `src/main/index.ts` inside `registerIpcHandlers()`:
```typescript
  ipcMain.handle('get-manager-path', () => managerDir)
```

Add to `src/renderer/types.d.ts` inside `SkillsApi`:
```typescript
    getManagerPath: () => Promise<string>
```

- [ ] **Step 1: Write TagPill component**

Create `src/renderer/components/TagPill.tsx`:
```tsx
interface TagPillProps {
  label: string
  onRemove?: () => void
}

export default function TagPill({ label, onRemove }: TagPillProps) {
  return (
    <span className="tag-pill">
      {label}
      {onRemove && (
        <button onClick={onRemove} style={{ marginLeft: 4, background: 'none', color: 'inherit', fontSize: 10, padding: 0, lineHeight: 1 }}>
          ×
        </button>
      )}
    </span>
  )
}
```

- [ ] **Step 2: Write GroupCard component**

Create `src/renderer/components/GroupCard.tsx`:
```tsx
import { useNavigate } from 'react-router-dom'
import TagPill from './TagPill'

interface GroupCardProps {
  name: string
  skillCount: number
  tags: string[]
  source: string
}

export default function GroupCard({ name, skillCount, tags, source }: GroupCardProps) {
  const navigate = useNavigate()

  return (
    <div className="card" onClick={() => navigate(`/group/${name}`)} style={{ cursor: 'pointer' }}>
      <div className="card-title">{name}</div>
      <div className="card-meta">{skillCount} skills · {source}</div>
      <div className="tag-pills">
        {tags.map(tag => (
          <TagPill key={tag} label={tag} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write GroupList page**

Modify `src/renderer/pages/GroupList.tsx`:
```tsx
import { useEffect, useState, useRef } from 'react'
import GroupCard from '../components/GroupCard'
import TagPill from '../components/TagPill'

interface GroupInfo {
  name: string
  skillCount: number
  tags: string[]
  source: string
}

export default function GroupList() {
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedFolders, setSelectedFolders] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    reloadGroups()
  }, [])

  async function reloadGroups() {
    const data = await window.skillsApi.getGroups()
    setGroups(Object.values(data))
  }

  async function handleSelectFolder() {
    const paths = await window.skillsApi.selectFolder()
    if (paths && paths.length > 0) {
      setSelectedFolders(paths)
      setShowAdd(true)
    }
  }

  async function handleAddGroup() {
    if (!newGroupName.trim() || selectedFolders.length === 0) return
    for (const srcPath of selectedFolders) {
      await window.skillsApi.addGroup(srcPath, newGroupName.trim())
    }
    setShowAdd(false)
    setNewGroupName('')
    setSelectedFolders([])
    reloadGroups()
  }

  const allTags = [...new Set(groups.flatMap(g => g.tags))].sort()
  const filtered = groups.filter(g => {
    if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false
    if (tagFilter && !g.tags.includes(tagFilter)) return false
    return true
  })

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">技能组</h1>
          <p className="page-subtitle">{groups.length} 个技能组</p>
        </div>
        <button className="btn btn-primary" onClick={handleSelectFolder}>
          + 添加技能组
        </button>
      </div>

      <div className="search-bar">
        <input
          className="input"
          placeholder="搜索技能组..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="tag-pills" style={{ alignItems: 'center' }}>
          <TagPill
            label="全部"
            onRemove={tagFilter ? () => setTagFilter(null) : undefined}
          />
          {allTags.map(tag => (
            <TagPill
              key={tag}
              label={tag}
              onRemove={tagFilter === tag ? () => setTagFilter(null) : undefined}
            />
          ))}
        </div>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 16, padding: 20 }}>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>添加技能组</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label className="settings-label">已选文件夹</label>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                {selectedFolders.join(', ')}
              </div>
            </div>
            <div>
              <label className="settings-label">技能组名称</label>
              <input
                className="input"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="如 superpowers"
                style={{ marginTop: 4 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleAddGroup}>确认添加</button>
              <button className="btn btn-secondary" onClick={() => { setShowAdd(false); setSelectedFolders([]) }}>取消</button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <h3>暂无技能组</h3>
          <p>通过「添加技能组」导入包含 SKILL.md 的文件夹</p>
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map(g => (
            <GroupCard
              key={g.name}
              name={g.name}
              skillCount={g.skillCount}
              tags={g.tags}
              source={g.source}
            />
          ))}
        </div>
      )}
    </>
  )
}
```

Add to `src/preload/index.ts` inside the `api` object:
```typescript
  selectFolder: () => ipcRenderer.invoke('select-folder'),
```

Add to `src/main/index.ts` (before `registerIpcHandlers`):
```typescript
import { dialog } from 'electron'
```

Add inside `registerIpcHandlers()`:
```typescript
  ipcMain.handle('select-folder', async () => {
    if (!mainWindow) return []
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'multiSelections'],
      title: '选择包含 SKILL.md 的文件夹'
    })
    return result.filePaths
  })
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/TagPill.tsx src/renderer/components/GroupCard.tsx src/renderer/pages/GroupList.tsx src/preload/index.ts src/main/index.ts src/renderer/types.d.ts
git commit -m "feat: GroupList page with search, tag filter, and add group dialog"
```

---

### Task 12: GroupDetail Page

**Files:**
- Create: `src/renderer/components/SkillCard.tsx`
- Modify: `src/renderer/pages/GroupDetail.tsx`

- [ ] **Step 1: Write SkillCard component**

Create `src/renderer/components/SkillCard.tsx`:
```tsx
interface SkillCardProps {
  name: string
  hash: string
  source: string
  checked: boolean
  onToggle: () => void
}

export default function SkillCard({ name, hash, source, checked, onToggle }: SkillCardProps) {
  return (
    <div className="skill-row" onClick={onToggle} style={{ cursor: 'pointer' }}>
      <input
        type="checkbox"
        className="checkbox"
        checked={checked}
        onChange={onToggle}
        onClick={e => e.stopPropagation()}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
          {hash.slice(0, 16)} · {source}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write GroupDetail page**

Modify `src/renderer/pages/GroupDetail.tsx`:
```tsx
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import SkillCard from '../components/SkillCard'
import { InstallResult } from '../../shared/types'

interface SkillInfo {
  name: string
  hash: string
  source: string
}

interface GroupDetailProps {
  cliPath: string
}

export default function GroupDetail({ cliPath }: GroupDetailProps) {
  const { groupName } = useParams<{ groupName: string }>()
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [projectPath, setProjectPath] = useState(cliPath)
  const [results, setResults] = useState<InstallResult[]>([])
  const [installing, setInstalling] = useState(false)
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null)

  useEffect(() => {
    if (groupName) {
      window.skillsApi.getGroupSkills(groupName).then(setSkills)
    }
  }, [groupName])

  useEffect(() => {
    setProjectPath(cliPath)
  }, [cliPath])

  const toggleSkill = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(skills.map(s => s.name)))
  const deselectAll = () => setSelected(new Set())

  const handleInstall = useCallback(async () => {
    if (!projectPath || !groupName) return
    setInstalling(true)
    const res = await window.skillsApi.installSkills(projectPath, [groupName])
    setResults(res)
    setInstalling(false)

    const success = res.filter(r => r.status === 'success' || r.status === 'copied').length
    const failed = res.filter(r => r.status === 'failed').length
    const skipped = res.filter(r => r.status === 'skipped').length

    const parts: string[] = []
    if (success > 0) parts.push(`${success} 成功`)
    if (skipped > 0) parts.push(`${skipped} 跳过`)
    if (failed > 0) parts.push(`${failed} 失败`)

    setToast({
      title: `安装完成：${groupName}`,
      body: parts.join(' / ')
    })
    setTimeout(() => setToast(null), 4000)
  }, [projectPath, groupName])

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{groupName}</h1>
          <p className="page-subtitle">{skills.length} 个技能</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <input
          className="input"
          placeholder="项目路径，如 /path/to/project"
          value={projectPath}
          onChange={e => setProjectPath(e.target.value)}
        />
        <button className="btn btn-primary" onClick={handleInstall} disabled={installing || !projectPath}>
          {installing ? '安装中...' : '安装到项目'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className="btn btn-secondary" onClick={selectAll}>全选</button>
        <button className="btn btn-secondary" onClick={deselectAll}>取消全选</button>
      </div>

      <div className="skill-list">
        {skills.map(s => (
          <SkillCard
            key={s.name}
            name={s.name}
            hash={s.hash}
            source={s.source}
            checked={selected.has(s.name)}
            onToggle={() => toggleSkill(s.name)}
          />
        ))}
      </div>

      {results.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 14, marginBottom: 10 }}>安装结果</h3>
          <div className="skill-list">
            {results.map(r => (
              <div key={r.skillName} className="skill-row" style={{ justifyContent: 'space-between' }}>
                <span>{r.skillName}</span>
                <span style={{
                  fontSize: 11,
                  color: r.status === 'success' || r.status === 'copied' ? 'var(--status-green)'
                    : r.status === 'skipped' ? 'var(--text-tertiary)'
                    : 'var(--status-red)'
                }}>
                  {r.status === 'success' ? `已链接 (${r.linkType})`
                    : r.status === 'copied' ? '已拷贝'
                    : r.status === 'skipped' ? '已跳过'
                    : r.error || '失败'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className="toast">
            <div className="toast-title">{toast.title}</div>
            <div className="toast-body">{toast.body}</div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/SkillCard.tsx src/renderer/pages/GroupDetail.tsx
git commit -m "feat: GroupDetail page with skill selection and install"
```

---

### Task 13: SyncPage

**Files:**
- Modify: `src/renderer/pages/SyncPage.tsx`

- [ ] **Step 1: Write SyncPage**

Modify `src/renderer/pages/SyncPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { GitStatus, GitLogEntry } from '../../shared/types'

export default function SyncPage() {
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [log, setLog] = useState<GitLogEntry[]>([])
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const s = await window.skillsApi.getGitStatus()
    setStatus(s)
    const l = await window.skillsApi.gitLog()
    setLog(l)
  }

  async function handleSync() {
    setSyncing(true)
    setMessage('')
    const result = await window.skillsApi.gitSync()
    setSyncing(false)
    if (result.success) {
      setMessage('同步成功')
      loadData()
    } else {
      setMessage(`同步失败：${result.error}`)
    }
    setTimeout(() => setMessage(''), 4000)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">同步状态</h1>
          <p className="page-subtitle">Git 仓库同步</p>
        </div>
        <button className="btn btn-primary" onClick={handleSync} disabled={syncing}>
          {syncing ? '同步中...' : '立即同步'}
        </button>
      </div>

      {message && (
        <div style={{ marginBottom: 16, fontSize: 12, color: message.includes('失败') ? 'var(--status-red)' : 'var(--status-green)' }}>
          {message}
        </div>
      )}

      {status && (
        <div className="card-grid" style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-meta">分支</div>
            <div className="card-title">{status.currentBranch}</div>
          </div>
          <div className="card">
            <div className="card-meta">远程仓库</div>
            <div className="card-title" style={{ fontSize: 12, wordBreak: 'break-all' }}>
              {status.remoteUrl || '未配置'}
            </div>
          </div>
          <div className="card">
            <div className="card-meta">状态</div>
            <div className="card-title" style={{
              color: status.hasConflicts ? 'var(--status-red)'
                : status.clean ? 'var(--status-green)'
                : 'var(--status-yellow)'
            }}>
              {status.hasConflicts ? '有冲突'
                : status.clean ? '干净'
                : status.ahead > 0 ? `领先 ${status.ahead}` : `落后 ${status.behind}`}
            </div>
          </div>
        </div>
      )}

      <h3 style={{ fontSize: 14, marginBottom: 12 }}>提交历史</h3>
      <div className="log-list">
        {log.length === 0 ? (
          <div className="empty-state" style={{ padding: 20 }}>
            <p>暂无提交记录</p>
          </div>
        ) : (
          log.map(entry => (
            <div key={entry.hash} className="log-entry">
              <div className="hash">{entry.hash.slice(0, 7)}</div>
              <div className="message">{entry.message}</div>
              <div className="meta">{entry.author} · {entry.date}</div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/pages/SyncPage.tsx
git commit -m "feat: SyncPage with git status and log"
```

---

### Task 14: Settings Page

**Files:**
- Modify: `src/renderer/pages/Settings.tsx`

- [ ] **Step 1: Write Settings page**

Modify `src/renderer/pages/Settings.tsx`:
```tsx
import { useEffect, useState } from 'react'

export default function Settings() {
  const [remoteUrl, setRemoteUrl] = useState('')
  const [autoSync, setAutoSync] = useState(false)
  const [saved, setSaved] = useState(false)
  const [managerPath, setManagerPath] = useState('')

  useEffect(() => {
    window.skillsApi.getSettings().then(s => {
      setRemoteUrl(s.remoteUrl || '')
      setAutoSync(s.autoSync || false)
    })
    window.skillsApi.getManagerPath().then(setManagerPath)
  }, [])

  async function handleSave() {
    await window.skillsApi.saveSettings({ remoteUrl, autoSync })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">设置</h1>
          <p className="page-subtitle">管理仓库和同步配置</p>
        </div>
      </div>

      <div className="settings-form">
        <div className="settings-group">
          <label className="settings-label">管理仓库路径</label>
          <input className="input" value={managerPath} disabled style={{ opacity: 0.5 }} />
          <span className="settings-hint">skills 存放的固定路径，不可更改</span>
        </div>

        <div className="settings-group">
          <label className="settings-label">Git Remote URL</label>
          <input
            className="input"
            placeholder="git@github.com:user/skills.git"
            value={remoteUrl}
            onChange={e => setRemoteUrl(e.target.value)}
          />
          <span className="settings-hint">私有 Git 仓库地址，用于跨设备同步</span>
        </div>

        <div className="settings-group">
          <label className="settings-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={autoSync}
              onChange={e => setAutoSync(e.target.checked)}
              style={{ accentColor: 'var(--accent)' }}
            />
            启动时自动同步
          </label>
          <span className="settings-hint">打开应用时自动执行 git pull</span>
        </div>

        {process.platform === 'win32' && (
          <div className="settings-group">
            <div className="card" style={{ borderColor: 'var(--status-yellow)', opacity: 0.8 }}>
              <div style={{ fontSize: 12, color: 'var(--status-yellow)', marginBottom: 4 }}>
                Windows 符号链接提示
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                如果 symlink 创建失败，请在 Windows 设置中开启「开发者模式」，或右键以管理员身份运行本应用。
              </div>
            </div>
          </div>
        )}

        <div>
          <button className="btn btn-primary" onClick={handleSave}>
            保存设置
          </button>
          {saved && <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--status-green)' }}>已保存</span>}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/pages/Settings.tsx
git commit -m "feat: Settings page with repo and sync config"
```

---

### Task 15: CLI Script

**Files:**
- Create: `cli/skills.ts`

- [ ] **Step 1: Write CLI script**

Create `cli/skills.ts`:
```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add cli/skills.ts
git commit -m "feat: CLI script for launching GUI and passing project path"
```

---

### Task 16: Integration Test

**Files:**
- Create: `tests/integration/install-flow.test.ts`

- [ ] **Step 1: Write integration test**

Create `tests/integration/install-flow.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { scanGroups, installSkills } from '../../src/main/skill-manager'

let tmpDir: string
let projectDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-int-'))
  projectDir = path.join(tmpDir, 'my-project')
  fs.mkdirSync(projectDir, { recursive: true })

  // Create a group with two skills
  fs.mkdirSync(path.join(tmpDir, 'superpowers', 'brainstorming'), { recursive: true })
  fs.writeFileSync(path.join(tmpDir, 'superpowers', 'brainstorming', 'SKILL.md'), '# Brainstorming\n\nContent')
  fs.writeFileSync(path.join(tmpDir, 'superpowers', 'brainstorming', 'helper.md'), '# Helper')

  fs.mkdirSync(path.join(tmpDir, 'superpowers', 'using-superpowers'), { recursive: true })
  fs.writeFileSync(path.join(tmpDir, 'superpowers', 'using-superpowers', 'SKILL.md'), '# Using Superpowers')
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('full install flow', () => {
  it('scans, installs, and writes installed manifest', () => {
    const scanned = scanGroups(tmpDir)
    expect(scanned.superpowers).toHaveLength(2)

    const results = installSkills(tmpDir, projectDir, 'superpowers')
    expect(results).toHaveLength(2)

    const successCount = results.filter(r => r.status === 'success').length
    expect(successCount).toBeGreaterThanOrEqual(1)

    const skillsDir = path.join(projectDir, '.agents', 'skills')
    expect(fs.existsSync(skillsDir)).toBe(true)

    const brainstormingLink = path.join(skillsDir, 'brainstorming')
    expect(fs.existsSync(brainstormingLink)).toBe(true)
    expect(fs.existsSync(path.join(brainstormingLink, 'SKILL.md'))).toBe(true)
    expect(fs.existsSync(path.join(brainstormingLink, 'helper.md'))).toBe(true)

    const installedPath = path.join(skillsDir, '.skills-installed.json')
    expect(fs.existsSync(installedPath)).toBe(true)

    const installed = JSON.parse(fs.readFileSync(installedPath, 'utf-8'))
    expect(installed.groups).toContain('superpowers')
    expect(installed.skills.brainstorming).toBeDefined()
    expect(installed.skills.brainstorming.group).toBe('superpowers')
  })

  it('handles empty group', () => {
    const results = installSkills(tmpDir, projectDir, 'nonexistent')
    expect(results).toHaveLength(0)
  })

  it('writes skills without group name prefix', () => {
    installSkills(tmpDir, projectDir, 'superpowers')

    const skillsDir = path.join(projectDir, '.agents', 'skills')
    const skillDirs = fs.readdirSync(skillsDir).filter(d => !d.startsWith('.'))
    expect(skillDirs).toContain('brainstorming')
    expect(skillDirs).toContain('using-superpowers')
    expect(skillDirs).not.toContain('superpowers')
  })
})
```

- [ ] **Step 2: Run integration tests**

Run:
```bash
npx vitest run tests/integration/install-flow.test.ts
```
Expected: all PASS

- [ ] **Step 3: Commit**

```bash
git add tests/integration/install-flow.test.ts
git commit -m "test: integration test for full install flow"
```

---

### Task 17: E2E Test

**Files:**
- Create: `tests/e2e/install.spec.ts`
- Create: `playwright.config.ts`

- [ ] **Step 1: Write Playwright config**

Create `playwright.config.ts`:
```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
  },
})
```

- [ ] **Step 2: Write E2E test**

Create `tests/e2e/install.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test('app renders group list', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.sidebar')).toBeVisible()
  await expect(page.locator('.sidebar-header')).toHaveText('skills')
  await expect(page.locator('.page-title')).toHaveText('技能组')
})

test('sidebar navigation works', async ({ page }) => {
  await page.goto('/')
  await page.locator('a:has-text("同步状态")').click()
  await expect(page.locator('.page-title')).toHaveText('同步状态')

  await page.locator('a:has-text("设置")').click()
  await expect(page.locator('.page-title')).toHaveText('设置')

  await page.locator('a:has-text("所有技能组")').click()
  await expect(page.locator('.page-title')).toHaveText('技能组')
})
```

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/install.spec.ts playwright.config.ts
git commit -m "test: E2E tests for app shell and navigation"
```

---

### Task 18: Electron Packaging

**Files:**
- Modify: `package.json`
- Modify: `electron-builder.yml`

- [ ] **Step 1: Update package.json scripts**

Modify `package.json`:
```json
{
  "name": "skills-manager",
  "version": "1.0.0",
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "package:win": "electron-builder --win",
    "package:mac": "electron-builder --mac",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.web.json"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.46.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0",
    "electron-vite": "^2.3.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "chore: update build scripts and dependencies"
```

---

### Task 19: Final Verification

- [ ] **Step 1: Typecheck**

Run:
```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 2: Unit tests**

Run:
```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 3: Build**

Run:
```bash
npm run build
```
Expected: builds without errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: final verification — all tests pass, build succeeds"
```
