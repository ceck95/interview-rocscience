import { useParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { JobDetail } from '@/components/jobs/JobDetail';

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="py-16 text-center text-slate-500">Invalid job ID.</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/jobs"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Jobs
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Job Details</h1>
        <p className="mt-1 text-sm text-slate-500">
          Auto-refreshes every 3 seconds while the job is queued or running.
        </p>
      </div>

      <JobDetail jobId={id} />
    </div>
  );
}
