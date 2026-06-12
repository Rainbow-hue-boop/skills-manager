import { useEffect, useState } from 'react'
import GroupCard from '../components/GroupCard'
import TagPill from '../components/TagPill'

interface GroupInfo {
  name: string
  skillCount: number
  tags: string[]
  source: string
}

export default function GroupList() {
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedFolders, setSelectedFolders] = useState<string[]>([])

  useEffect(() => { reloadGroups() }, [])

  async function reloadGroups() {
    const data = await window.skillsApi.getGroups()
    setGroups(Object.values(data))
  }

  async function handleSelectFolder() {
    const paths = await window.skillsApi.selectFolder()
    if (paths && paths.length > 0) {
      setSelectedFolders(paths)
      setShowAdd(true)
    }
  }

  async function handleAddGroup() {
    if (!newGroupName.trim() || selectedFolders.length === 0) return
    for (const srcPath of selectedFolders) {
      await window.skillsApi.addGroup(srcPath, newGroupName.trim())
    }
    setShowAdd(false)
    setNewGroupName('')
    setSelectedFolders([])
    reloadGroups()
  }

  const allTags = [...new Set(groups.flatMap(g => g.tags))].sort()
  const filtered = groups.filter(g => {
    if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false
    if (tagFilter && !g.tags.includes(tagFilter)) return false
    return true
  })

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">技能组</h1>
          <p className="page-subtitle">{groups.length} 个技能组</p>
        </div>
        <button className="btn btn-primary" onClick={handleSelectFolder}>
          + 添加技能组
        </button>
      </div>

      <div className="search-bar">
        <input className="input" placeholder="搜索技能组..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="tag-pills" style={{ alignItems: 'center' }}>
          <TagPill label="全部" onRemove={tagFilter ? () => setTagFilter(null) : undefined} />
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
              <label className="settings-label">已选文件夹</label>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                {selectedFolders.join(', ')}
              </div>
            </div>
            <div>
              <label className="settings-label">技能组名称</label>
              <input className="input" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="如 superpowers" style={{ marginTop: 4 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleAddGroup}>确认添加</button>
              <button className="btn btn-secondary" onClick={() => { setShowAdd(false); setSelectedFolders([]) }}>取消</button>
            </div>
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
          {filtered.map(g => (
            <GroupCard key={g.name} name={g.name} skillCount={g.skillCount} tags={g.tags} source={g.source} />
          ))}
        </div>
      )}
    </>
  )
}
