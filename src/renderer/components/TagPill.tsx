interface TagPillProps {
  label: string
  onRemove?: () => void
}

export default function TagPill({ label, onRemove }: TagPillProps) {
  return (
    <span className="tag-pill">
      {label}
      {onRemove && (
        <button onClick={onRemove} style={{ marginLeft: 4, background: 'none', color: 'inherit', fontSize: 10, padding: 0, lineHeight: 1 }}>
          ×
        </button>
      )}
    </span>
  )
}
