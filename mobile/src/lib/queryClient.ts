import { QueryClient } from '@tanstack/react-query';

/**
 * One shared QueryClient. On mobile we keep data fresh for 30s and retry
 * network blips once — devices flip between wifi/cellular constantly.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 60,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
