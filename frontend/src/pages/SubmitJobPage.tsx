import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { JobSubmitForm } from '@/components/jobs/JobSubmitForm';

export function SubmitJobPage() {
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
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Submit a Job</h1>
        <p className="mt-1 text-sm text-slate-500">
          Fill in the details below to queue a new compute job.
        </p>
      </div>

      <JobSubmitForm />
    </div>
  );
}
