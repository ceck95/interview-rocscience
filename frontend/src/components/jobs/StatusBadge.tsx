import type { JobStatus } from '@/types/job.types';
import { cn } from '@/lib/utils';

const statusConfig: Record<JobStatus, { label: string; className: string }> = {
  queued: { label: 'Queued', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  running: { label: 'Running', className: 'bg-blue-100 text-blue-700 border-blue-200 animate-pulse' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700 border-green-200' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700 border-red-200' },
};

interface StatusBadgeProps {
  status: JobStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
