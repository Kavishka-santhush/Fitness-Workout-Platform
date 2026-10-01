import axios, { AxiosError } from 'axios';
import { useAuth } from '@clerk/nextjs';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// A single axios instance. Clerk's session token is attached by the caller
// via an interceptor registered in <Providers/> (client component) so we keep
// this module side-effect free and usable from both RSC and client code.
export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

export function attachAuthInterceptor(getToken: () => Promise<string | null>) {
  api.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
}

export function ApiErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    return err.response?.data?.message || err.response?.data?.errors?.[0]?.message || err.message;
  }
  return 'Something went wrong';
}

// Convenience hook for components that need auth-token-aware requests.
export function useApi() {
  const { getToken } = useAuth();
  return { api, getToken };
}

export default api;
