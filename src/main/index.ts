import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { startIpcServer, onOpen, stopIpcServer } from './ipc-server'
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

  ipcMain.handle('get-manager-path', () => managerDir)

  ipcMain.handle('select-folder', () => {
    const result = dialog.showOpenDialogSync(mainWindow!, {
      properties: ['openDirectory', 'multiSelections'],
      title: '选择包含 SKILL.md 的文件夹'
    })
    return result || []
  })
}
