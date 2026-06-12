interface TagPillProps {
  label: string
  color?: string
  onRemove?: () => void
}

export default function TagPill({ label, color, onRemove }: TagPillProps) {
  return (
    <span
      className="tag-pill"
      style={color ? { borderColor: color, color: color, background: color + '18' } : undefined}
    >
      {label}
      {onRemove && (
        <button onClick={onRemove} style={{ marginLeft: 4, background: 'none', color: 'inherit', fontSize: 10, padding: 0, lineHeight: 1 }}>
          ×
        </button>
      )}
    </span>
  )
}
