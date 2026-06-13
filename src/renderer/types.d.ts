interface SkillsManagerApi {
  getGroups(): Promise<Record<string, any>>
  getGroupSkills(groupName: string): Promise<{ name: string; hash: string; source: string }[]>
  installSkills(projectPath: string, groupNames: string[]): Promise<any[]>
  getProjectPath(): Promise<string>
  getGitStatus(): Promise<any>
  gitSync(): Promise<{ success: boolean; error?: string }>
  gitLog(): Promise<{ hash: string; date: string; message: string; author: string }[]>
  getSettings(): Promise<{ remoteUrl: string; autoSync: boolean }>
  saveSettings(settings: { remoteUrl: string; autoSync: boolean }): Promise<{ success: boolean }>
  addGroup(sourcePath: string, groupName: string): Promise<{ success: boolean; error?: string; copied?: number }>
  onOpenFromCli(callback: (path: string) => void): void
  onInstallProgress(callback: (data: { current: number; total: number }) => void): void
  getManagerPath(): Promise<string>
  setupCli(): Promise<{ success: boolean; message: string; needSudo: boolean }>
  getCliStatus(): Promise<{ installed: boolean; target: string | null; linkPath: string }>
  selectFolder(): Promise<string[]>
  getGroupTags(groupName: string): Promise<any[]>
  saveGroupTags(groupName: string, tags: any[]): Promise<{ success: boolean }>
}

declare global {
  interface Window {
    skillsApi: SkillsManagerApi
  }
}

export {}
