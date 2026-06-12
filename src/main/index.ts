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
    try {
      const branch = (() => {
        try {
          return execSync('git rev-parse --abbrev-ref HEAD', { cwd: managerDir, encoding: 'utf-8', stdio: 'pipe' }).trim()
        } catch { return 'master' }
      })()

      gitAddAll(managerDir)

      // Always commit (allow-empty for first sync)
      try { gitCommit(managerDir, 'sync') } catch {
        execSync(`git commit --allow-empty -m "init: skills sync"`, {
          cwd: managerDir, encoding: 'utf-8', stdio: 'pipe'
        })
      }

      // Pull
      try {
        execSync(`git pull origin ${branch} --allow-unrelated-histories`, {
          cwd: managerDir, encoding: 'utf-8', stdio: 'pipe'
        })
      } catch { /* empty remote ok */ }

      // Push
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

  ipcMain.handle('save-group-tags', (_event, groupName: string, tags: string[]) => {
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

  ipcMain.handle('select-folder', () => {
    const result = dialog.showOpenDialogSync(mainWindow!, {
      properties: ['openDirectory', 'multiSelections'],
      title: '选择包含 SKILL.md 的文件夹'
    })
    return result || []
  })
}
