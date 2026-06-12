import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { scanGroups, readLockFile, writeLockFile, getSkillManagerDir } from '../../src/main/skill-manager'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('scanGroups', () => {
  it('returns empty object for empty dir', () => {
    const result = scanGroups(tmpDir)
    expect(result).toEqual({})
  })

  it('detects groups with SKILL.md files', () => {
    fs.mkdirSync(path.join(tmpDir, 'superpowers', 'brainstorming'), { recursive: true })
    fs.writeFileSync(path.join(tmpDir, 'superpowers', 'brainstorming', 'SKILL.md'), '# Skill')
    fs.mkdirSync(path.join(tmpDir, 'superpowers', 'using-superpowers'), { recursive: true })
    fs.writeFileSync(path.join(tmpDir, 'superpowers', 'using-superpowers', 'SKILL.md'), '# Skill')

    const result = scanGroups(tmpDir)
    expect(result).toHaveProperty('superpowers')
    expect(result.superpowers).toHaveLength(2)
    const names = result.superpowers.map(s => s.name)
    expect(names).toContain('brainstorming')
    expect(names).toContain('using-superpowers')
  })

  it('ignores dirs without SKILL.md', () => {
    fs.mkdirSync(path.join(tmpDir, 'empty-group', 'empty-skill'), { recursive: true })
    const result = scanGroups(tmpDir)
    expect(result).toEqual({})
  })
})

describe('readLockFile', () => {
  it('returns null if file does not exist', () => {
    const result = readLockFile(tmpDir)
    expect(result).toBeNull()
  })

  it('parses valid lock file', () => {
    const content = {
      version: 1,
      groups: { superpowers: { source: 'obra/superpowers', sourceType: 'github', installedAt: '2026-01-01T00:00:00Z', tags: [] } },
      skills: { brainstorming: { group: 'superpowers', source: 'obra/superpowers', skillPath: 'skills/brainstorming/SKILL.md', computedHash: 'abc' } }
    }
    fs.writeFileSync(path.join(tmpDir, 'skills-lock.json'), JSON.stringify(content))
    const result = readLockFile(tmpDir)
    expect(result).not.toBeNull()
    expect(result!.groups.superpowers.tags).toEqual([])
  })

  it('returns null and backs up corrupted file', () => {
    fs.writeFileSync(path.join(tmpDir, 'skills-lock.json'), 'not json {{{')
    const result = readLockFile(tmpDir)
    expect(result).toBeNull()
    expect(fs.existsSync(path.join(tmpDir, 'skills-lock.json.corrupted'))).toBe(true)
  })
})
