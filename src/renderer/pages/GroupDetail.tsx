import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import SkillCard from '../components/SkillCard'
import TagPill from '../components/TagPill'
import { InstallResult, TagEntry } from '../../shared/types'

interface SkillInfo { name: string; hash: string; source: string }

interface GroupDetailProps { cliPath: string }

export default function GroupDetail({ cliPath }: GroupDetailProps) {
  const { groupName } = useParams<{ groupName: string }>()
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [projectPath, setProjectPath] = useState(cliPath)
  const [results, setResults] = useState<InstallResult[]>([])
  const [installing, setInstalling] = useState(false)
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null)
  const [tags, setTags] = useState<TagEntry[]>([])
  const [newTag, setNewTag] = useState('')
  const [tagColor, setTagColor] = useState('#6b8cff')
  const COLORS = ['#6b8cff', '#ff6b6b', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b', '#20c997', '#f06595']

  useEffect(() => {
    if (groupName) {
      window.skillsApi.getGroupSkills(groupName).then(setSkills)
      ;(window as any).skillsApi.getGroupTags(groupName).then(setTags)
    }
  }, [groupName])

  useEffect(() => { setProjectPath(cliPath) }, [cliPath])

  async function addTag() {
    if (!newTag.trim() || !groupName) return
    try {
      const updated = [...tags, { name: newTag.trim(), color: tagColor }]
      await (window as any).skillsApi.saveGroupTags(groupName, updated)
      setTags(updated)
      setNewTag('')
    } catch (err) {
      console.error('saveGroupTags failed:', err)
    }
  }

  async function removeTag(tagName: string) {
    if (!groupName) return
    try {
      const updated = tags.filter(t => t.name !== tagName)
      await (window as any).skillsApi.saveGroupTags(groupName, updated)
      setTags(updated)
    } catch (err) {
      console.error('saveGroupTags failed:', err)
    }
  }

  const toggleSkill = (name: string) => {
    setSelected(prev => { const next = new Set(prev); next.has(name) ? next.delete(name) : next.add(name); return next })
  }

  const selectAll = () => setSelected(new Set(skills.map(s => s.name)))
  const deselectAll = () => setSelected(new Set())

  const handleInstall = useCallback(async () => {
    if (!projectPath || !groupName) return
    setInstalling(true)
    const res = await window.skillsApi.installSkills(projectPath, [groupName])
    setResults(res)
    setInstalling(false)
    const success = res.filter(r => r.status === 'success' || r.status === 'copied').length
    const failed = res.filter(r => r.status === 'failed').length
    const skipped = res.filter(r => r.status === 'skipped').length
    const parts: string[] = []
    if (success > 0) parts.push(`${success} 成功`)
    if (skipped > 0) parts.push(`${skipped} 跳过`)
    if (failed > 0) parts.push(`${failed} 失败`)
    setToast({ title: `安装完成：${groupName}`, body: parts.join(' / ') })
    setTimeout(() => setToast(null), 4000)
  }, [projectPath, groupName])

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{groupName}</h1>
          <p className="page-subtitle">{skills.length} 个技能</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>标签：</span>
          <div className="tag-pills">
            {tags.map(t => (
              <TagPill key={t.name} label={t.name} color={t.color} onRemove={() => removeTag(t.name)} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {COLORS.map(c => (
              <div
                key={c}
                onClick={() => setTagColor(c)}
                style={{
                  width: 16, height: 16, borderRadius: 4, background: c, cursor: 'pointer',
                  border: tagColor === c ? '2px solid #fff' : '2px solid transparent',
                  boxSizing: 'border-box'
                }}
              />
            ))}
          </div>
          <input
            className="input"
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag()}
            placeholder="新标签..."
            style={{ width: 100, padding: '3px 8px', fontSize: 11 }}
          />
          <button className="btn btn-secondary" onClick={addTag} style={{ padding: '3px 10px', fontSize: 11 }}>+</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <input className="input" placeholder="项目路径，如 /path/to/project" value={projectPath} onChange={e => setProjectPath(e.target.value)} />
        <button className="btn btn-primary" onClick={handleInstall} disabled={installing || !projectPath}>
          {installing ? '安装中...' : '安装到项目'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className="btn btn-secondary" onClick={selectAll}>全选</button>
        <button className="btn btn-secondary" onClick={deselectAll}>取消全选</button>
      </div>

      <div className="skill-list">
        {skills.map(s => <SkillCard key={s.name} name={s.name} hash={s.hash} source={s.source} checked={selected.has(s.name)} onToggle={() => toggleSkill(s.name)} />)}
      </div>

      {results.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 14, marginBottom: 10 }}>安装结果</h3>
          <div className="skill-list">
            {results.map(r => (
              <div key={r.skillName} className="skill-row" style={{ justifyContent: 'space-between' }}>
                <span>{r.skillName}</span>
                <span style={{ fontSize: 11, color: r.status === 'success' || r.status === 'copied' ? 'var(--status-green)' : r.status === 'skipped' ? 'var(--text-tertiary)' : 'var(--status-red)' }}>
                  {r.status === 'success' ? `已链接 (${r.linkType})` : r.status === 'copied' ? '已拷贝' : r.status === 'skipped' ? '已跳过' : r.error || '失败'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className="toast">
            <div className="toast-title">{toast.title}</div>
            <div className="toast-body">{toast.body}</div>
          </div>
        </div>
      )}
    </>
  )
}
