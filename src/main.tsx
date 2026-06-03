import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { get, set, del } from 'idb-keyval';
import App from './App';
import { nepseApi } from './lib/api';
import './index.css';

// Create an IndexedDB persister
const idbPersister = {
  persistClient: async (client: any) => {
    await set('reactQueryCache', client);
  },
  restoreClient: async () => {
    return await get('reactQueryCache');
  },
  removeClient: async () => {
    await del('reactQueryCache');
  },
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 2,
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 5000),
      networkMode: 'online',
      gcTime: 1000 * 60 * 60 * 24, // Keep unused data in cache for 24 hours
      staleTime: 1000 * 60 * 5, // Data is fresh for 5 mins by default unless overridden
    },
  },
});

// Warm critical queries before first paint (only runs if cache is empty)
queryClient.prefetchQuery({ queryKey: ['dashboard'], queryFn: nepseApi.getDashboard });
queryClient.prefetchQuery({ queryKey: ['live-trading'], queryFn: nepseApi.getLiveTrading });
queryClient.prefetchQuery({ queryKey: ['company-list'], queryFn: nepseApi.getCompanyList });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider 
      client={queryClient} 
      persistOptions={{ persister: idbPersister, maxAge: 1000 * 60 * 60 * 24 }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PersistQueryClientProvider>
  </React.StrictMode>
);
