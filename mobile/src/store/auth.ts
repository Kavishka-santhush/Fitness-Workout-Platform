import { create } from 'zustand';
import type { User } from '@/lib/types';

/**
 * App-level auth mirror. Clerk owns real authentication; this store just holds
 * the resolved in-app user profile (role, subscription, onboarding state) and
 * a token provider so non-React code (socket reconnect) can mint a session
 * token on demand.
 */
interface AuthState {
  user: User | null;
  isReady: boolean;
  onboarded: boolean;
  tokenProvider: (() => Promise<string | null>) | null;
  setUser: (user: User | null) => void;
  setReady: (ready: boolean) => void;
  setOnboarded: (v: boolean) => void;
  registerTokenProvider: (fn: () => Promise<string | null>) => void;
  getToken: () => Promise<string | null>;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isReady: false,
  onboarded: false,
  tokenProvider: null,
  setUser: (user) => set({ user, onboarded: !!user?.username }),
  setReady: (isReady) => set({ isReady }),
  setOnboarded: (onboarded) => set({ onboarded }),
  registerTokenProvider: (tokenProvider) => set({ tokenProvider }),
  getToken: async () => {
    const p = get().tokenProvider;
    return p ? await p() : null;
  },
  clear: () => set({ user: null, onboarded: false }),
}));

export const isAdminRole = (role?: User['role'] | null) =>
  role === 'ADMIN' || role === 'SUPER_ADMIN';
export const isTrainerRole = (role?: User['role'] | null) => role === 'TRAINER';
export const isPremium = (u?: User | null) =>
  !!u && u.subscriptionType !== 'FREE';
