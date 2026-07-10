import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import './styles/globals.css';

// Create a QueryClient for TanStack Query.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Get the root element.
const rootElement = document.getElementById('rdcfe-root');

if (rootElement) {
  // Create React root and render.
  const root = ReactDOM.createRoot(rootElement);
  
  root.render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
} else {
  console.error('RDCFE: Root element not found');
}

