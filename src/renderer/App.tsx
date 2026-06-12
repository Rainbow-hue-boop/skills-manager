import { HashRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import GroupList from './pages/GroupList'
import GroupDetail from './pages/GroupDetail'
import SyncPage from './pages/SyncPage'
import Settings from './pages/Settings'
import { useEffect, useState } from 'react'

export default function App() {
  const [cliPath, setCliPath] = useState('')

  useEffect(() => {
    const fetchPath = async () => {
      const p = await window.skillsApi.getProjectPath()
      if (p) setCliPath(p)
    }
    fetchPath()
    window.skillsApi.onOpenFromCli((path: string) => {
      setCliPath(path)
    })
  }, [])

  return (
    <HashRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<GroupList />} />
            <Route path="/group/:groupName" element={<GroupDetail cliPath={cliPath} />} />
            <Route path="/sync" element={<SyncPage />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
