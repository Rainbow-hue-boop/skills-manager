import { SyncStatus } from '../../shared/types'

interface StatusDotProps {
  status: SyncStatus
}

export default function StatusDot({ status }: StatusDotProps) {
  return <span className={`status-dot ${status}`} title={status} />
}
