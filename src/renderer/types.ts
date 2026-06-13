export {}

declare global {
  interface Window {
    skillsApi: {
      getGroups: () => Promise<Record<string, { name: string; skillCount: number; tags: string[]; source: string }>>
      getGroupSkills: (groupName: string) => Promise<{ name: string; hash: string; source: string }[]>
      installSkills: (projectPath: string, groupNames: string[]) => Promise<any[]>
      getProjectPath: () => Promise<string>
      getGitStatus: () => Promise<{ clean: boolean; ahead: number; behind: number; hasConflicts: boolean; currentBranch: string; remoteUrl: string | null; lastSync: string | null }>
      gitSync: () => Promise<{ success: boolean; error?: string }>
      gitLog: () => Promise<{ hash: string; date: string; message: string; author: string }[]>
      getSettings: () => Promise<{ remoteUrl: string; autoSync: boolean }>
      saveSettings: (settings: { remoteUrl: string; autoSync: boolean }) => Promise<{ success: boolean }>
      addGroup: (sourcePath: string, groupName: string) => Promise<{ success: boolean }>
      onOpenFromCli: (callback: (path: string) => void) => void
      onInstallProgress: (callback: (data: { current: number; total: number }) => void) => void
      getManagerPath: () => Promise<string>
      setupCli: () => Promise<{ success: boolean; message: string; needSudo: boolean }>
      getCliStatus: () => Promise<{ installed: boolean; target: string | null; linkPath: string }>
      selectFolder: () => Promise<string[]>
    }
  }
}

