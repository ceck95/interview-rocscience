import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '@/api';
import { StatusBadge } from './StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, AlertCircle, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from '@/lib/date';

const PAGE_SIZE = 10;

export function JobList() {
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([undefined]);
  const currentCursor = cursorStack[cursorStack.length - 1];
  const currentPage = cursorStack.length;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['jobs', currentCursor],
    queryFn: () => jobsApi.list({ limit: PAGE_SIZE, cursor: currentCursor }),
    refetchInterval: 5000,
  });

  const handleNext = () => {
    if (data?.nextCursor) {
      setCursorStack(prev => [...prev, data.nextCursor]);
    }
  };

  const handlePrev = () => {
    setCursorStack(prev => prev.slice(0, -1));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading jobs…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-red-600">
        <AlertCircle className="h-5 w-5" />
        Failed to load jobs. Check that the API server is running.
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Inbox className="mb-3 h-10 w-10" />
        <p className="text-sm">No jobs yet. Submit one to get started.</p>
      </div>
    );
  }

  const isFirstPage = cursorStack.length === 1;
  const hasNextPage = !!data.nextCursor;

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job Name</TableHead>
            <TableHead>Project ID</TableHead>
            <TableHead>Compute Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((job) => (
            <TableRow key={job.jobId}>
              <TableCell className="font-medium">{job.jobName}</TableCell>
              <TableCell className="font-mono text-xs text-slate-500">{job.projectId}</TableCell>
              <TableCell>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {job.computeType}
                </span>
              </TableCell>
              <TableCell>
                <StatusBadge status={job.status} />
              </TableCell>
              <TableCell className="text-slate-500 text-xs">
                {formatDistanceToNow(job.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <Button asChild variant="outline" size="sm">
                  <Link to={`/jobs/${job.jobId}`}>View</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {(!isFirstPage || hasNextPage) && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-xs text-slate-500">
            Page {currentPage} &mdash; {data.count} jobs on this page
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={isFirstPage}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={!hasNextPage}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
