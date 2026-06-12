export interface SkillEntry {
  group: string
  source: string
  skillPath: string
  computedHash: string
}

export interface TagEntry {
  name: string
  color: string
}

export interface GroupEntry {
  source: string
  sourceType: 'github'
  installedAt: string
  tags: TagEntry[]
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
