import { useNavigate } from 'react-router-dom'
import TagPill from './TagPill'

interface GroupCardProps {
  name: string
  skillCount: number
  tags: string[]
  source: string
}

export default function GroupCard({ name, skillCount, tags, source }: GroupCardProps) {
  const navigate = useNavigate()

  return (
    <div className="card" onClick={() => navigate(`/group/${name}`)} style={{ cursor: 'pointer' }}>
      <div className="card-title">{name}</div>
      <div className="card-meta">{skillCount} skills · {source}</div>
      <div className="tag-pills">
        {tags.map(tag => (
          <TagPill key={tag} label={tag} />
        ))}
      </div>
    </div>
  )
}
