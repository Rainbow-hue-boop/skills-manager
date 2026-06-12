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

  fs.mkdirSync(path.join(tmpDir, 'superpowers', 'brainstorming'), { recursive: true })
  fs.writeFileSync(path.join(tmpDir, 'superpowers', 'brainstorming', 'SKILL.md'), '# Brainstorming\n\nContent')
  fs.writeFileSync(path.join(tmpDir, 'superpowers', 'brainstorming', 'helper.md'), '# Helper')

  fs.mkdirSync(path.join(tmpDir, 'superpowers', 'using-superpowers'), { recursive: true })
  fs.writeFileSync(path.join(tmpDir, 'superpowers', 'using-superpowers', 'SKILL.md'), '# Using Superpowers')
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

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
