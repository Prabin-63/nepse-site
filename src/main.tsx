import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { nepseApi } from './lib/api';
import './index.css';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 2,
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 5000),
      networkMode: 'online',
    },
  },
});

// Warm critical queries before first paint
queryClient.prefetchQuery({ queryKey: ['dashboard'], queryFn: nepseApi.getDashboard });
queryClient.prefetchQuery({ queryKey: ['live-trading'], queryFn: nepseApi.getLiveTrading });
queryClient.prefetchQuery({ queryKey: ['company-list'], queryFn: nepseApi.getCompanyList });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
