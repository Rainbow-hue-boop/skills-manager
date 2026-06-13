import { useEffect, useState } from 'react'
import GroupCard from '../components/GroupCard'
import TagPill from '../components/TagPill'
import { TagEntry } from '../../shared/types'

interface GroupInfo {
  name: string
  skillCount: number
  tags: TagEntry[]
  source: string
}

export default function GroupList() {
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [folderPath, setFolderPath] = useState('')
  const [addMsg, setAddMsg] = useState('')
  const [addOk, setAddOk] = useState(true)

  useEffect(() => { reloadGroups() }, [])

  async function reloadGroups() {
    const data = await window.skillsApi.getGroups()
    setGroups(Object.values(data) as unknown as GroupInfo[])
  }

  async function handleBrowse() {
    try {
      const paths = await window.skillsApi.selectFolder()
      if (paths && paths.length > 0) {
        setFolderPath(paths.join(';'))
      }
    } catch (err) {
      console.error('selectFolder failed:', err)
    }
  }

  function handleOpenAdd() {
    setFolderPath('')
    setNewGroupName('')
    setAddMsg('')
    setShowAdd(true)
  }

  async function handleAddGroup() {
    if (!newGroupName.trim() || !folderPath.trim()) return
    setAddMsg('')
    try {
      const paths = folderPath.split(';').map(p => p.trim()).filter(Boolean)
      let total = 0
      for (const srcPath of paths) {
        const r = await window.skillsApi.addGroup(srcPath, newGroupName.trim()) as any
        if (!r.success) {
          setAddMsg(`失败：${r.error || srcPath}`)
          setAddOk(false)
          return
        }
        total += (r as any).copied || 0
      }
      setAddMsg(`添加成功，${total} 个技能`)
      setAddOk(true)
      setShowAdd(false)
      reloadGroups()
    } catch (err: any) {
      setAddMsg(`错误：${err.message || err}`)
      setAddOk(false)
    }
  }

  const allTags = [...new Set(groups.flatMap(g => g.tags.map(t => t.name)))].sort()
  const filtered = groups.filter(g => {
    if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false
    if (tagFilter && !g.tags.some(t => t.name === tagFilter)) return false
    return true
  })

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">技能组</h1>
          <p className="page-subtitle">{groups.length} 个技能组</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 1v10M1 6h10" />
          </svg>
          添加技能组
        </button>
      </div>

      <div className="search-bar">
        <input className="input" placeholder="搜索技能组..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="tag-pills" style={{ alignItems: 'center' }}>
          <TagPill label="全部" color={tagFilter === null ? 'var(--accent)' : undefined} onRemove={tagFilter ? () => setTagFilter(null) : undefined} />
          {allTags.map(tag => (
            <TagPill key={tag} label={tag} onRemove={tagFilter === tag ? () => setTagFilter(null) : undefined} />
          ))}
        </div>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 16, padding: 20 }}>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>添加技能组</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label className="settings-label">文件夹路径</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <input
                  className="input"
                  value={folderPath}
                  onChange={e => setFolderPath(e.target.value)}
                  placeholder="如 D:\skills\superpowers（包含 SKILL.md 子文件夹）"
                  style={{ flex: 1 }}
                />
                <button className="btn btn-secondary" onClick={handleBrowse} style={{ whiteSpace: 'nowrap' }}>
                  浏览...
                </button>
              </div>
            </div>
            <div>
              <label className="settings-label">技能组名称</label>
              <input className="input" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="如 superpowers" style={{ marginTop: 4 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleAddGroup}>确认添加</button>
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>取消</button>
            </div>
            {addMsg && (
              <div style={{ fontSize: 12, color: addOk ? 'var(--status-green)' : 'var(--status-red)' }}>
                {addMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <h3>暂无技能组</h3>
          <p>通过「添加技能组」导入包含 SKILL.md 的文件夹</p>
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map((g, i) => (
            <div key={g.name} className="card-enter" style={{ animationDelay: `${i * 60}ms` }}>
              <GroupCard name={g.name} skillCount={g.skillCount} tags={g.tags} source={g.source} />
            </div>
          ))}
        </div>
      )}
    </>
  )
}
