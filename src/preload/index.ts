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
  },
  getManagerPath: () => ipcRenderer.invoke('get-manager-path'),
  setupCli: () => ipcRenderer.invoke('setup-cli'),
  getCliStatus: () => ipcRenderer.invoke('get-cli-status'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getGroupTags: (groupName: string) => ipcRenderer.invoke('get-group-tags', groupName),
  saveGroupTags: (groupName: string, tags: string[]) => ipcRenderer.invoke('save-group-tags', groupName, tags)
}

contextBridge.exposeInMainWorld('skillsApi', api)

export type SkillsApi = typeof api
