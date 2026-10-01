import axios, { AxiosError } from 'axios';
import { config } from './config';

/**
 * Single axios instance pointed at the backend `/api` namespace. The Clerk
 * session token is attached by an interceptor registered from the auth store /
 * providers at runtime, keeping this module side-effect free.
 */
export const api = axios.create({
  baseURL: `${config.apiUrl}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

export function attachAuthInterceptor(getToken: () => Promise<string | null>) {
  api.interceptors.request.use(async (cfg) => {
    const token = await getToken();
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
  });
}

export function ApiErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    return (
      err.response?.data?.message ||
      err.response?.data?.errors?.[0]?.message ||
      err.message ||
      'Request failed'
    );
  }
  return 'Something went wrong';
}

/** Unwrap the standard `{ success, data, meta }` envelope. */
export async function unwrap<T>(p: Promise<{ data: any }>): Promise<T> {
  const res = await p;
  return (res.data?.data ?? res.data) as T;
}

export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

/**
 * Multipart POST accepted by the server's Multer local-storage buckets. The
 * Clerk token is injected by the request interceptor, so callers only pass the
 * scalar fields plus the already-picked file descriptor.
 */
export async function upload<T>(path: string, fields: Record<string, string | number | undefined>, file?: UploadFile) {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined && v !== '') form.append(k, String(v));
  });
  if (file) form.append('photo', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  return unwrap<T>(api.post(path, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 }));
}

export default api;

/**
 * Multer serves local uploads from paths relative to the API host (e.g.
 * `/uploads/progressPhotos/x.jpg`); absolute CDN URLs pass straight through.
 */
export function assetUrl(uri?: string | null): string {
  if (!uri) return '';
  if (/^https?:\/\//i.test(uri)) return uri;
  return `${config.apiUrl.replace(/\/+$/, '')}${uri.startsWith('/') ? '' : '/'}${uri}`;
}
