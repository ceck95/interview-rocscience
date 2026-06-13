import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { JobList } from '@/components/jobs/JobList';

export function JobsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cloud Jobs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor and manage your compute jobs. Auto-refreshes every 5 seconds.
          </p>
        </div>
        <Button asChild>
          <Link to="/jobs/submit" className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4 shrink-0" />
            Submit Job
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Jobs</CardTitle>
          <CardDescription>Click View to see full details of any job.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <JobList />
        </CardContent>
      </Card>
    </div>
  );
}
