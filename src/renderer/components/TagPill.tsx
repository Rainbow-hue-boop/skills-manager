interface TagPillProps {
  label: string
  color?: string
  onRemove?: () => void
}

export default function TagPill({ label, color, onRemove }: TagPillProps) {
  return (
    <span
      className="tag-pill"
      style={color ? { borderColor: color, color: color, background: color + '1A' } : undefined}
    >
      {label}
      {onRemove && (
        <button className="tag-remove" onClick={onRemove}>×</button>
      )}
    </span>
  )
}
