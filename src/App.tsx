import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { adminRouter } from './router/AdminRouter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={adminRouter} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1A1A1A', color: '#fff', border: '1px solid #2A2A2A', fontSize: 13 },
          success: { iconTheme: { primary: '#D62B2B', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}
