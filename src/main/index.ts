import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { execSync } from 'child_process'
import { startIpcServer, onOpen, stopIpcServer } from './ipc-server'
import { scanGroups, getSkillManagerDir, installSkills, readLockFile, writeLockFile } from './skill-manager'
import { getStatus, gitPull, gitPush, gitAddAll, gitCommit, gitLog, isGitRepo, gitInit, setRemote } from './git-service'
import fs from 'fs'
import os from 'os'

let mainWindow: BrowserWindow | null = null
let cliProjectPath: string = ''

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 1020,
    minWidth: 1170,
    minHeight: 750,
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
  // Read pending CLI path (written by skills CLI before launch)
  const pendingFile = path.join(os.homedir(), '.skills-manager', '.pending-path')
  try {
    cliProjectPath = fs.readFileSync(pendingFile, 'utf-8').trim()
    fs.unlinkSync(pendingFile)
  } catch { /* no pending path */ }

  registerIpcHandlers()
  startIpcServer()
  createWindow()

  onOpen((projectPath: string) => {
    cliProjectPath = projectPath
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('open-from-cli', projectPath)
    }
  })
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
    const groups: Record<string, any> = {}

    for (const [groupName, skills] of Object.entries(scanned)) {
      const lockGroup = lockFile?.groups[groupName]
      groups[groupName] = {
        name: groupName,
        skillCount: skills.length,
        tags: (lockGroup?.tags || []) as any,
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
    try {
      // 1. Fetch latest from remote
      execSync('git fetch origin', { cwd: managerDir, encoding: 'utf-8', stdio: 'pipe' })

      // 2. Detect remote's default branch
      const remoteRefs = execSync('git branch -r', { cwd: managerDir, encoding: 'utf-8', stdio: 'pipe' }).trim()
      const remoteBranches = remoteRefs.split('\n').map(l => l.trim()).filter(l => l.startsWith('origin/') && !l.includes('HEAD'))
      const preferred = remoteBranches.find(h => h === 'origin/master') || remoteBranches.find(h => h === 'origin/main') || remoteBranches[0]

      // 3. If remote has a different branch, switch local to match
      if (preferred) {
        const remoteBranch = preferred.replace('origin/', '')
        const localBranch = (() => {
          try { return execSync('git rev-parse --abbrev-ref HEAD', { cwd: managerDir, encoding: 'utf-8', stdio: 'pipe' }).trim() } catch { return '' }
        })()
        if (localBranch !== remoteBranch) {
          try {
            execSync(`git checkout -b ${remoteBranch} --track ${preferred}`, { cwd: managerDir, encoding: 'utf-8', stdio: 'pipe' })
          } catch {
            execSync(`git checkout ${remoteBranch}`, { cwd: managerDir, encoding: 'utf-8', stdio: 'pipe' })
            execSync(`git branch --set-upstream-to=${preferred} ${remoteBranch}`, { cwd: managerDir, encoding: 'utf-8', stdio: 'pipe' })
          }
        }
      }

      // 4. If remote branch exists with commits, pull it down first
      if (preferred) {
        try {
          execSync(`git merge ${preferred} --allow-unrelated-histories --no-edit`, {
            cwd: managerDir, encoding: 'utf-8', stdio: 'pipe'
          })
        } catch {
          // If merge fails (local has no commits yet), just reset to remote state
          try {
            execSync(`git reset --hard ${preferred}`, { cwd: managerDir, encoding: 'utf-8', stdio: 'pipe' })
          } catch { /* remote might just have no commits */ }
        }
      }

      const branch = (() => {
        try {
          return execSync('git rev-parse --abbrev-ref HEAD', { cwd: managerDir, encoding: 'utf-8', stdio: 'pipe' }).trim()
        } catch { return 'master' }
      })()

      // 5. Stage and commit local changes
      gitAddAll(managerDir)
      try { gitCommit(managerDir, 'sync') } catch {
        execSync(`git commit --allow-empty -m "init: skills sync"`, {
          cwd: managerDir, encoding: 'utf-8', stdio: 'pipe'
        })
      }

      // 6. Push
      execSync(`git push -u origin ${branch}`, { cwd: managerDir, encoding: 'utf-8', stdio: 'pipe' })
      return { success: true }
    } catch (e: any) {
      const msg = (e.stderr || e.message || String(e)).toString().slice(0, 500)
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('get-group-tags', (_event, groupName: string) => {
    const lock = readLockFile(managerDir)
    return lock?.groups[groupName]?.tags || []
  })

  ipcMain.handle('save-group-tags', (_event, groupName: string, tags: any[]) => {
    const lock = readLockFile(managerDir) || { version: 1, groups: {}, skills: {} }
    if (!lock.groups[groupName]) {
      lock.groups[groupName] = { source: '', sourceType: 'github', installedAt: new Date().toISOString(), tags: [] }
    }
    lock.groups[groupName].tags = tags
    writeLockFile(managerDir, lock)
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

      // Fetch and checkout the remote's default branch so sync works immediately
      try {
        execSync('git fetch origin', { cwd: managerDir, encoding: 'utf-8', stdio: 'pipe' })
        // Find the remote HEAD (e.g. origin/master, origin/main)
        const refs = execSync('git branch -r', { cwd: managerDir, encoding: 'utf-8', stdio: 'pipe' }).trim()
        const remoteHeads = refs.split('\n').map(l => l.trim()).filter(l => l.startsWith('origin/') && !l.includes('HEAD'))
        const preferred = remoteHeads.find(h => h === 'origin/master') || remoteHeads.find(h => h === 'origin/main') || remoteHeads[0]
        if (preferred) {
          const branchName = preferred.replace('origin/', '')
          try {
            execSync(`git checkout -b ${branchName} --track ${preferred}`, {
              cwd: managerDir, encoding: 'utf-8', stdio: 'pipe'
            })
          } catch {
            // Branch might already exist; try switching
            try { execSync(`git checkout ${branchName}`, { cwd: managerDir, encoding: 'utf-8', stdio: 'pipe' }) } catch { /* ok */ }
          }
        }
      } catch { /* remote may be empty – ok, push on first sync will set up tracking */ }
    }
    return { success: true }
  })

  ipcMain.handle('add-group', (_event, sourcePath: string, groupName: string) => {
    try {
      const targetDir = path.join(managerDir, groupName)
      fs.mkdirSync(targetDir, { recursive: true })

      // Check if sourcePath directly contains SKILL.md subdirs (it's a complete group)
      const entries = fs.readdirSync(sourcePath, { withFileTypes: true })
      let copied = 0
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue
        const skillMd = path.join(sourcePath, entry.name, 'SKILL.md')
        if (fs.existsSync(skillMd)) {
          const dest = path.join(targetDir, entry.name)
          if (!fs.existsSync(dest)) {
            fs.cpSync(path.join(sourcePath, entry.name), dest, { recursive: true })
            copied++
          }
        }
      }

      if (copied === 0) {
        // Fallback: maybe it's a single skill folder (contains SKILL.md in root)
        const skillMd = path.join(sourcePath, 'SKILL.md')
        if (fs.existsSync(skillMd)) {
          const skillName = path.basename(sourcePath)
          const dest = path.join(targetDir, skillName)
          if (!fs.existsSync(dest)) {
            fs.cpSync(sourcePath, dest, { recursive: true })
            copied++
          }
        }
      }

      return { success: true, copied }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('get-manager-path', () => managerDir)

  ipcMain.handle('setup-cli', async () => {
    // Determine the CLI script path
    const cliPath = app.isPackaged
      ? path.join(process.resourcesPath, 'cli', 'skills.js')
      : path.resolve(__dirname, '..', '..', 'dist-cli', 'skills.js')

    if (!fs.existsSync(cliPath)) {
      return { success: false, message: `CLI script not found: ${cliPath}`, needSudo: false }
    }

    const linkPath = '/usr/local/bin/skills'

    // Remove existing symlink or stale file
    let needSudo = false
    try { fs.unlinkSync(linkPath) } catch (e: any) {
      if (e.code === 'EACCES' || e.code === 'EPERM') needSudo = true
      /* otherwise doesn't exist – ok */
    }

    if (needSudo) {
      return { success: false, message: `Permission denied. Run in terminal:\nsudo ln -sf "${cliPath}" "${linkPath}"`, needSudo: true }
    }

    // Ensure /usr/local/bin exists
    const binDir = path.dirname(linkPath)
    try { fs.mkdirSync(binDir, { recursive: true }) } catch { /* may exist */ }

    try {
      fs.symlinkSync(cliPath, linkPath)
      try { fs.chmodSync(linkPath, 0o755) } catch { /* ok */ }
      return { success: true, message: `CLI installed: ${linkPath}`, needSudo: false }
    } catch (e: any) {
      if (e.code === 'EEXIST') {
        return { success: false, message: `Permission denied. Run in terminal:\nsudo ln -sf "${cliPath}" "${linkPath}"`, needSudo: true }
      }
      if (e.code === 'EACCES' || e.code === 'EPERM') {
        return { success: false, message: `Permission denied. Run in terminal:\nsudo ln -sf "${cliPath}" "${linkPath}"`, needSudo: true }
      }
      return { success: false, message: `Failed: ${e.message}`, needSudo: false }
    }
  })

  ipcMain.handle('get-cli-status', () => {
    const linkPath = '/usr/local/bin/skills'
    try {
      const target = fs.readlinkSync(linkPath)
      const valid = fs.existsSync(target)
      return { installed: valid, target, linkPath }
    } catch {
      return { installed: false, target: null, linkPath }
    }
  })

  ipcMain.handle('select-folder', () => {
    const result = dialog.showOpenDialogSync(mainWindow!, {
      properties: ['openDirectory', 'multiSelections'],
      title: '选择包含 SKILL.md 的文件夹'
    })
    return result || []
  })
}
