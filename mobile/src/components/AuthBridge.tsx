import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useQueryClient } from '@tanstack/react-query';
import { attachAuthInterceptor } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth';
import { useCurrentUser } from '@/hooks/queries';
import { registerForPush } from '@/lib/push';

/**
 * Wires Clerk's session token into the axios interceptor + auth store, opens
 * the Socket.io connection for signed-in users, registers for push, and keeps
 * the resolved in-app profile in sync. Mounted once inside the root layout.
 */
let interceptorAttached = false;

export function AuthBridge() {
  const { isSignedIn, getToken } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const setReady = useAuthStore((s) => s.setReady);
  const registerProvider = useAuthStore((s) => s.registerTokenProvider);
  const queryClient = useQueryClient();
  const didRegisterPush = useRef(false);

  // 1) Attach the token provider + axios interceptor once.
  useEffect(() => {
    registerProvider(() => getToken());
    if (!interceptorAttached) {
      attachAuthInterceptor(() => getToken());
      interceptorAttached = true;
    }
  }, [getToken, registerProvider]);

  // 2) Sync the app user into the store + gate onboarding.
  const { data, isSuccess, isError } = useCurrentUser();
  useEffect(() => {
    if (!isSignedIn) {
      setUser(null);
      setReady(true);
      return;
    }
    if (isSuccess && data) {
      setUser(data);
      setReady(true);
    } else if (isError) {
      // Signed into Clerk but not yet synced to Postgres / onboarding pending.
      setUser({ id: '', username: '', displayName: '', avatarUrl: null, role: 'MEMBER', subscriptionType: 'FREE', level: 1, xpPoints: 0, streakCurrent: 0, streakLongest: 0 } as any);
      setReady(true);
    }
  }, [isSignedIn, isSuccess, isError, data, setUser, setReady]);

  // 3) Realtime + push for authenticated sessions.
  useEffect(() => {
    if (!isSignedIn) {
      disconnectSocket();
      return;
    }
    let cancelled = false;
    getToken().then((token) => {
      if (!cancelled && token) connectSocket(token);
    });
    if (!didRegisterPush.current) {
      didRegisterPush.current = true;
      registerForPush().catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, getToken]);

  // Reset cached data on sign-out.
  useEffect(() => {
    if (!isSignedIn) queryClient.clear();
  }, [isSignedIn, queryClient]);

  return null;
}
