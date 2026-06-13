import { useQuery } from '@tanstack/react-query';
import { billingApi } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/jobs/StatusBadge';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CreditCard, Briefcase, CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/date';
import type { ComputeType } from '@/types/job.types';

const computeTypeLabels: Record<ComputeType, string> = {
  'cpu-small': 'CPU Small',
  'cpu-large': 'CPU Large',
  gpu: 'GPU',
};

export function BillingSummaryPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['billing', 'summary'],
    queryFn: billingApi.getSummary,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading billing data…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-red-600">
        <AlertCircle className="h-5 w-5" />
        Failed to load billing summary. Check that the API server is running.
      </div>
    );
  }

  const totalCredits = data.totalCredits ?? 0;
  const byComputeType = data.byComputeType ?? {};
  const byProject = data.byProject ?? {};

  const computeTypeEntries = (Object.entries(byComputeType) as [ComputeType, number][]).sort(
    ([, a], [, b]) => b - a
  );

  const projectEntries = Object.entries(byProject).sort(([, a], [, b]) => b - a);

  const completedJobs = (data.jobs ?? []).filter((j) => j.status === 'completed');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing Summary</h1>
        <p className="mt-1 text-sm text-slate-500">
          Credit usage across all projects and compute types.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Credits Used</p>
              <p className="text-2xl font-bold text-slate-900">{totalCredits.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
              <Briefcase className="h-6 w-6 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Jobs</p>
              <p className="text-2xl font-bold text-slate-900">{data.totalJobs}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Completed Jobs</p>
              <p className="text-2xl font-bold text-slate-900">{data.completedJobs}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credits by Compute Type</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {computeTypeEntries.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-slate-400">No data yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Compute Type</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                    <TableHead className="text-right">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {computeTypeEntries.map(([type, credits]) => (
                    <TableRow key={type}>
                      <TableCell>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {computeTypeLabels[type]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">{credits.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-slate-500">
                        {totalCredits > 0 ? `${((credits / totalCredits) * 100).toFixed(1)}%` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credits by Project</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {projectEntries.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-slate-400">No data yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project ID</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectEntries.map(([projectId, credits]) => (
                    <TableRow key={projectId}>
                      <TableCell className="font-mono text-xs">{projectId}</TableCell>
                      <TableCell className="text-right font-medium">{credits.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Completed Jobs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {completedJobs.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-slate-400">No completed jobs yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Name</TableHead>
                  <TableHead>Project ID</TableHead>
                  <TableHead>Compute Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedJobs.map((job) => (
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
                    <TableCell className="text-right font-semibold text-slate-900">
                      {job.creditCost?.toLocaleString() ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {job.completedAt ? formatDate(job.completedAt) : '—'}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
