import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '@/api';
import { StatusBadge } from './StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertCircle } from 'lucide-react';
import { formatDate, formatDuration } from '@/lib/date';

interface JobDetailProps {
  jobId: string;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start">
      <span className="w-44 shrink-0 text-sm font-medium text-slate-500">{label}</span>
      <span className="text-sm text-slate-900">{value ?? <span className="text-slate-400">—</span>}</span>
    </div>
  );
}

export function JobDetail({ jobId }: JobDetailProps) {
  const { data: job, isLoading, isError } = useQuery({
    queryKey: ['jobs', jobId],
    queryFn: () => jobsApi.getById(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'queued' || status === 'running' ? 3000 : false;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading job details…
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-red-600">
        <AlertCircle className="h-5 w-5" />
        Failed to load job. It may not exist.
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">{job.jobName}</CardTitle>
          <p className="mt-1 font-mono text-xs text-slate-400">{job.jobId}</p>
        </div>
        <StatusBadge status={job.status} />
      </CardHeader>

      <Separator />

      <CardContent className="pt-6">
        <div className="space-y-4">
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Job Info
            </h3>
            <div className="space-y-2.5">
              <DetailRow label="Project ID" value={<span className="font-mono text-xs">{job.projectId}</span>} />
              <DetailRow label="Compute Type" value={
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {job.computeType}
                </span>
              } />
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Files
            </h3>
            <div className="space-y-2.5">
              <DetailRow label="Input File" value={job.inputFileName} />
              <DetailRow label="Input File Key" value={<span className="font-mono text-xs">{job.inputFileKey}</span>} />
              {job.outputFileName && (
                <DetailRow label="Output File" value={job.outputFileName} />
              )}
              {job.outputFileKey && (
                <DetailRow label="Output File Key" value={<span className="font-mono text-xs">{job.outputFileKey}</span>} />
              )}
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Execution
            </h3>
            <div className="space-y-2.5">
              <DetailRow
                label="Duration"
                value={job.executionDuration != null ? formatDuration(job.executionDuration) : 'N/A'}
              />
              <DetailRow
                label="Credit Cost"
                value={
                  job.creditCost != null
                    ? <span className="font-semibold text-slate-900">{job.creditCost} credits</span>
                    : <span className="text-slate-400">Pending</span>
                }
              />
              {job.errorMessage && (
                <DetailRow
                  label="Error"
                  value={
                    <span className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                      {job.errorMessage}
                    </span>
                  }
                />
              )}
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Timestamps
            </h3>
            <div className="space-y-2.5">
              <DetailRow label="Created At" value={formatDate(job.createdAt)} />
              <DetailRow label="Updated At" value={formatDate(job.updatedAt)} />
              {job.completedAt && (
                <DetailRow label="Completed At" value={formatDate(job.completedAt)} />
              )}
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
