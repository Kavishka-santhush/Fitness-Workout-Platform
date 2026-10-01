'use client';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useAuth } from '@clerk/nextjs';
import { attachAuthInterceptor } from '@/lib/api';

let interceptorAttached = false;

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const { getToken } = useAuth();

  // Wire Clerk's session token into the shared axios instance once, on mount.
  React.useEffect(() => {
    if (!interceptorAttached) {
      attachAuthInterceptor(() => getToken());
      interceptorAttached = true;
    }
  }, [getToken]);

  return (
    <QueryClientProvider client={client}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
