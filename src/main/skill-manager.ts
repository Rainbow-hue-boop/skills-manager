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
