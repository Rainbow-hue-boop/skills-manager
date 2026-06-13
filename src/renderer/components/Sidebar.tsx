import { NavLink } from 'react-router-dom'
import StatusDot from './StatusDot'
import { SyncStatus } from '../../shared/types'
import { useEffect, useState } from 'react'

export default function Sidebar() {
  const [gitStatus, setGitStatus] = useState<SyncStatus>('clean')

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await window.skillsApi.getGitStatus()
        if (status.hasConflicts) setGitStatus('conflict')
        else if (!status.clean || status.ahead > 0) setGitStatus('dirty')
        else setGitStatus('clean')
      } catch {
        setGitStatus('clean')
      }
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="5" y="0" width="4" height="4" rx="1" fill="var(--accent)" />
          <rect x="0" y="5" width="4" height="4" rx="1" fill="var(--accent)" opacity="0.5" />
          <rect x="10" y="5" width="4" height="4" rx="1" fill="var(--accent)" opacity="0.5" />
          <rect x="5" y="10" width="4" height="4" rx="1" fill="var(--accent)" opacity="0.3" />
        </svg>
        skills
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="1" width="5" height="5" rx="1" />
            <rect x="8" y="1" width="5" height="5" rx="1" />
            <rect x="1" y="8" width="5" height="5" rx="1" />
            <rect x="8" y="8" width="5" height="5" rx="1" />
          </svg>
          所有技能组
        </NavLink>
        <NavLink to="/sync" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="7" cy="7" r="5" />
            <path d="M7 2v3l2 2" />
          </svg>
          同步状态
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="7" cy="7" r="2.5" />
            <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13" />
          </svg>
          设置
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        <StatusDot status={gitStatus} />
        {gitStatus === 'clean' ? '已同步' : gitStatus === 'dirty' ? '有变更' : '冲突'}
      </div>
    </aside>
  )
}
