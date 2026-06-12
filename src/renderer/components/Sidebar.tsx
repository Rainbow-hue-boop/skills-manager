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
      <div className="sidebar-header">skills</div>
      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
          所有技能组
        </NavLink>
        <NavLink to="/sync" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
          同步状态
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
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
