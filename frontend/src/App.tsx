import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { JobsPage } from '@/pages/JobsPage';
import { SubmitJobPage } from '@/pages/SubmitJobPage';
import { JobDetailPage } from '@/pages/JobDetailPage';
import { BillingSummaryPage } from '@/pages/BillingSummaryPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/jobs" replace />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/submit" element={<SubmitJobPage />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} />
            <Route path="/billing" element={<BillingSummaryPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
