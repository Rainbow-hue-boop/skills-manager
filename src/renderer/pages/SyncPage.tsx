import { useEffect, useState } from 'react'
import { GitStatus, GitLogEntry } from '../../shared/types'

export default function SyncPage() {
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [log, setLog] = useState<GitLogEntry[]>([])
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const s = await window.skillsApi.getGitStatus()
    setStatus(s)
    const l = await window.skillsApi.gitLog()
    setLog(l)
  }

  async function handleSync() {
    setSyncing(true)
    setMessage('')
    const result = await window.skillsApi.gitSync()
    setSyncing(false)
    if (result.success) { setMessage('同步成功'); loadData() }
    else { setMessage(`同步失败：${result.error}`) }
    setTimeout(() => setMessage(''), 4000)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">同步状态</h1>
          <p className="page-subtitle">Git 仓库同步</p>
        </div>
        <button className="btn btn-primary" onClick={handleSync} disabled={syncing}>
          {syncing ? '同步中...' : '立即同步'}
        </button>
      </div>

      {message && (
        <div style={{ marginBottom: 16, fontSize: 12, color: message.includes('失败') ? 'var(--status-red)' : 'var(--status-green)' }}>
          {message}
        </div>
      )}

      {status && (
        <div className="card-grid" style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-meta">分支</div>
            <div className="card-title">{status.currentBranch}</div>
          </div>
          <div className="card">
            <div className="card-meta">远程仓库</div>
            <div className="card-title" style={{ fontSize: 12, wordBreak: 'break-all' }}>{status.remoteUrl || '未配置'}</div>
          </div>
          <div className="card">
            <div className="card-meta">状态</div>
            <div className="card-title" style={{ color: status.hasConflicts ? 'var(--status-red)' : status.clean ? 'var(--status-green)' : 'var(--status-yellow)' }}>
              {status.hasConflicts ? '有冲突' : status.clean ? '干净' : status.ahead > 0 ? `领先 ${status.ahead}` : `落后 ${status.behind}`}
            </div>
          </div>
        </div>
      )}

      <h3 style={{ fontSize: 14, marginBottom: 12 }}>提交历史</h3>
      <div className="log-list">
        {log.length === 0 ? (
          <div className="empty-state" style={{ padding: 20 }}><p>暂无提交记录</p></div>
        ) : (
          log.map(entry => (
            <div key={entry.hash} className="log-entry">
              <div className="hash">{entry.hash.slice(0, 7)}</div>
              <div className="message">{entry.message}</div>
              <div className="meta">{entry.author} · {entry.date}</div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
