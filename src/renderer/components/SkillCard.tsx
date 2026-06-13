interface SkillCardProps {
  name: string
  hash: string
  source: string
  checked: boolean
  onToggle: () => void
}

export default function SkillCard({ name, hash, source, checked, onToggle }: SkillCardProps) {
  return (
    <div className="skill-row" onClick={onToggle} style={{ cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={onToggle} onClick={e => e.stopPropagation()} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
          {hash.slice(0, 16)} · {source}
        </div>
      </div>
    </div>
  )
}
