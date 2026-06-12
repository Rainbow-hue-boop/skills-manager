import { useEffect, useState } from 'react'

export default function Settings() {
  const [remoteUrl, setRemoteUrl] = useState('')
  const [autoSync, setAutoSync] = useState(false)
  const [saved, setSaved] = useState(false)
  const [managerPath, setManagerPath] = useState('')

  useEffect(() => {
    window.skillsApi.getSettings().then(s => {
      setRemoteUrl(s.remoteUrl || '')
      setAutoSync(s.autoSync || false)
    })
    window.skillsApi.getManagerPath().then(setManagerPath)
  }, [])

  async function handleSave() {
    await window.skillsApi.saveSettings({ remoteUrl, autoSync })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">设置</h1>
          <p className="page-subtitle">管理仓库和同步配置</p>
        </div>
      </div>

      <div className="settings-form">
        <div className="settings-group">
          <label className="settings-label">管理仓库路径</label>
          <input className="input" value={managerPath} disabled style={{ opacity: 0.5 }} />
          <span className="settings-hint">skills 存放的固定路径，不可更改</span>
        </div>

        <div className="settings-group">
          <label className="settings-label">Git Remote URL</label>
          <input className="input" placeholder="git@github.com:user/skills.git" value={remoteUrl} onChange={e => setRemoteUrl(e.target.value)} />
          <span className="settings-hint">私有 Git 仓库地址，用于跨设备同步</span>
        </div>

        <div className="settings-group">
          <label className="settings-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={autoSync} onChange={e => setAutoSync(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
            启动时自动同步
          </label>
          <span className="settings-hint">打开应用时自动执行 git pull</span>
        </div>

        {navigator.platform?.startsWith('Win') && (
          <div className="settings-group">
            <div className="card" style={{ borderColor: 'var(--status-yellow)', opacity: 0.8 }}>
              <div style={{ fontSize: 12, color: 'var(--status-yellow)', marginBottom: 4 }}>Windows 符号链接提示</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                如果 symlink 创建失败，请在 Windows 设置中开启「开发者模式」，或右键以管理员身份运行本应用。
              </div>
            </div>
          </div>
        )}

        <div>
          <button className="btn btn-primary" onClick={handleSave}>保存设置</button>
          {saved && <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--status-green)' }}>已保存</span>}
        </div>
      </div>
    </>
  )
}
