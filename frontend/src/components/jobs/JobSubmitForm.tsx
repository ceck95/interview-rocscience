import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { jobsApi } from '@/api';
import type { ComputeType, CreateJobPayload } from '@/types/job.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';

const computeTypes: { value: ComputeType; label: string }[] = [
  { value: 'cpu-small', label: 'CPU Small' },
  { value: 'cpu-large', label: 'CPU Large' },
  { value: 'gpu', label: 'GPU' },
];

const defaultForm: CreateJobPayload = {
  jobName: '',
  projectId: '',
  computeType: 'cpu-small',
  inputFileName: '',
};

export function JobSubmitForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState<CreateJobPayload>(defaultForm);

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: jobsApi.create,
    onSuccess: () => navigate('/jobs'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate(form);
  }

  function handleChange(field: keyof CreateJobPayload, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const errorMessage =
    isError && error instanceof Error
      ? error.message
      : isError
      ? 'An unexpected error occurred.'
      : null;

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Submit a Job</CardTitle>
        <CardDescription>Configure and launch a new compute job.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="jobName">Job Name</Label>
            <Input
              id="jobName"
              required
              placeholder="e.g. image-processing-run"
              value={form.jobName}
              onChange={(e) => handleChange('jobName', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="projectId">Project ID</Label>
            <Input
              id="projectId"
              required
              placeholder="e.g. proj-123"
              value={form.projectId}
              onChange={(e) => handleChange('projectId', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="computeType">Compute Type</Label>
            <Select
              id="computeType"
              value={form.computeType}
              onChange={(e) => handleChange('computeType', e.target.value)}
            >
              {computeTypes.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inputFileName">Input File Name</Label>
            <Input
              id="inputFileName"
              required
              placeholder="data.csv"
              value={form.inputFileName}
              onChange={(e) => handleChange('inputFileName', e.target.value)}
            />
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {errorMessage}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? 'Submitting…' : 'Submit Job'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/jobs')}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
