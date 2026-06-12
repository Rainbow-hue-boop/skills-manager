import fs from 'fs'
import path from 'path'
import os from 'os'
import child_process from 'child_process'
import { SkillsLockFile, InstallResult, SkillsInstalledFile } from '../shared/types'

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
      child_process.execSync(`cmd /c mklink /J "${target}" "${source}"`, { stdio: 'pipe' })
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
