interface TagPillProps {
  label: string
  color?: string
  onClick?: () => void
  onRemove?: () => void
  active?: boolean
}

export default function TagPill({ label, color, onClick, onRemove, active }: TagPillProps) {
  return (
    <span
      className="tag-pill"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        ...(active ? { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent)20' } : color ? { borderColor: color, color: color, background: color + '1A' } : {})
      }}
    >
      {label}
      {onRemove && (
        <button className="tag-remove" onClick={(e) => { e.stopPropagation(); onRemove() }}>×</button>
      )}
    </span>
  )
}
