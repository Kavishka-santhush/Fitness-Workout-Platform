'use client';
import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Unwrap the API envelope: axios -> { success, data, meta } -> data */
async function unwrap<T>(p: Promise<{ data: any }>): Promise<T> {
  const res = await p;
  return (res.data?.data ?? res.data) as T;
}

type QK = (string | number | undefined | null)[];

/** Generic GET query. */
export function useGet<T>(key: QK, path: string, opts?: Partial<UseQueryOptions<T>>) {
  return useQuery<T>({
    queryKey: key,
    queryFn: () => unwrap<T>(api.get(path)),
    ...opts,
  });
}

/** Generic mutation over an arbitrary method+path factory. */
export function useSend<TData, TVars>(
  fn: (vars: TVars) => Promise<{ data: any }>,
  invalidate: QK[] = []
) {
  const qc = useQueryClient();
  return useMutation<TData, Error, TVars>({
    mutationFn: (vars) => unwrap<TData>(fn(vars)),
    onSuccess: () => invalidate.forEach((k) => qc.invalidateQueries({ queryKey: k })),
  });
}

export const usePost = <TData = any, TVars = any>(path: string, invalidate: QK[] = []) =>
  useSend<TData, TVars>((v) => api.post(path, v), invalidate);

// ---------------------------------------------------------------------------
// Users / dashboard
// ---------------------------------------------------------------------------
export const useDashboard = () => useGet(['dashboard'], '/users/dashboard');
export const useUserProfile = (username: string) => useGet(['user', username], `/users/u/${username}`);
export const useSearchUsers = (q: string) =>
  useGet(['users', 'search', q], `/users/search?q=${encodeURIComponent(q)}`, { enabled: q.length > 1 });

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------
export const useExercises = (params = '') => useGet(['exercises', params], `/exercises?${params}`);
export const useExercise = (id: string) => useGet(['exercise', id], `/exercises/${id}`);
export const useFavoriteExercises = () => useGet(['exercises', 'favorites'], '/exercises/favorites');
export const useToggleExerciseFavorite = (id: string) =>
  usePost(`/exercises/${id}/favorite`, [['exercises'], ['exercise', id]]);

// ---------------------------------------------------------------------------
// Workouts
// ---------------------------------------------------------------------------
export const useWorkouts = (params = '') => useGet(['workouts', params], `/workouts?${params}`);
export const useWorkout = (id: string) => useGet(['workout', id], `/workouts/${id}`);
export const useCreateWorkout = () => usePost('/workouts', [['workouts']]);
export const useDeleteWorkout = () => useSend((id: string) => api.delete(`/workouts/${id}`), [['workouts']]);

// ---------------------------------------------------------------------------
// Programs
// ---------------------------------------------------------------------------
export const usePrograms = (params = '') => useGet(['programs', params], `/programs?${params}`);
export const useFeaturedPrograms = () => useGet(['programs', 'featured'], '/programs/featured');
export const useProgram = (id: string) => useGet(['program', id], `/programs/${id}`);
export const useMyPrograms = () => useGet(['programs', 'mine'], '/programs/mine');
export const useEnrollProgram = (id: string) => usePost(`/programs/${id}/enroll`, [['program', id], ['programs']]);
export const useUnenrollProgram = () => useSend((id: string) => api.delete(`/programs/${id}/enroll`), [['programs']]);

// ---------------------------------------------------------------------------
// Sessions (active workout tracking)
// ---------------------------------------------------------------------------
export const useSessionHistory = () => useGet(['sessions', 'history'], '/sessions/history');
export const useStartSession = () => usePost('/sessions/start', [['sessions']]);
export const useCompleteSession = () => usePost<any, string>('/sessions/complete', [['sessions'], ['workouts']]);

// ---------------------------------------------------------------------------
// Nutrition / meals / foods
// ---------------------------------------------------------------------------
export const useFoods = (params = '') => useGet(['foods', params], `/foods?${params}`);
export const useFavoriteFoods = () => useGet(['foods', 'favorites'], '/foods/favorites');
export const useNutritionGoal = () => useGet(['nutrition', 'goal'], '/nutrition/goal');
export const useTargetToday = () => useGet(['nutrition', 'target-today'], '/nutrition/target-today');
export const useMealDay = (date: string) => useGet(['meals', date], `/meals/day?date=${date}`);
export const useLogMealEntry = () => useSend((v: any) => api.post('/meals/entries', v), [['meals']]);
export const useWaterToday = (date: string) => useGet(['water', date], `/meals/day?date=${date}`);
export const useLogWater = () => usePost('/meals/water', [['meals']]);

// ---------------------------------------------------------------------------
// Body stats & progress
// ---------------------------------------------------------------------------
export const useBodyStats = () => useGet(['body-stats'], '/body-stats');
export const useCurrentBodyStat = () => useGet(['body-stats', 'current'], '/body-stats/current');
export const useAddBodyStat = () => usePost('/body-stats', [['body-stats'], ['progress']]);
export const useProgressPhotos = () => useGet(['progress', 'photos'], '/progress/photos');
export const useWeightChart = () => useGet(['progress', 'charts', 'weight'], '/progress/charts/weight');
export const useWorkoutChart = () => useGet(['progress', 'charts', 'workouts'], '/progress/charts/workouts');
export const usePersonalRecords = () => useGet(['progress', 'prs'], '/progress/prs');

// ---------------------------------------------------------------------------
// Social
// ---------------------------------------------------------------------------
export const useFeed = () => useGet(['social', 'feed'], '/social/feed');
export const useCreatePost = () => usePost('/social/posts', [['social', 'feed']]);
export const useGiveKudos = (id: string) => useSend(() => api.post(`/social/posts/${id}/kudos`), [['social', 'feed']]);
export const useSuggestions = () => useGet(['social', 'suggestions'], '/social/suggestions');
export const useGroups = () => useGet(['social', 'groups'], '/social/groups');

// ---------------------------------------------------------------------------
// Trainers & bookings
// ---------------------------------------------------------------------------
export const useTrainers = (params = '') => useGet(['trainers', params], `/trainers?${params}`);
export const useTrainer = (userId: string) => useGet(['trainer', userId], `/trainers/${userId}`);
export const useTrainerAvailability = (userId: string) =>
  useGet(['trainer', userId, 'availability'], `/trainers/${userId}/availability`);

// ---------------------------------------------------------------------------
// Live classes
// ---------------------------------------------------------------------------
export const useLiveClasses = (params = '') => useGet(['classes', params], `/classes?${params}`);
export const useLiveClass = (id: string) => useGet(['class', id], `/classes/${id}`);
export const useEnrollClass = (id: string) => usePost(`/classes/${id}/enroll`, [['class', id], ['classes']]);

// ---------------------------------------------------------------------------
// Challenges & leaderboard
// ---------------------------------------------------------------------------
export const useChallenges = (params = '') => useGet(['challenges', params], `/challenges?${params}`);
export const useChallenge = (id: string) => useGet(['challenge', id], `/challenges/${id}`);
export const useEnrollChallenge = (id: string) => usePost(`/challenges/${id}/enroll`, [['challenge', id]]);
export const useLeaderboard = (params = '') => useGet(['leaderboard', params], `/leaderboard?${params}`);

// ---------------------------------------------------------------------------
// Schedule & achievements & notifications
// ---------------------------------------------------------------------------
export const useScheduleWeek = () => useGet(['schedule', 'week'], '/schedule/week');
export const useAchievements = () => useGet(['achievements'], '/achievements/mine');
export const useNotifications = () => useGet(['notifications'], '/notifications');
export const useUnreadCount = () => useGet(['notifications', 'unread'], '/notifications/unread-count');
export const useMarkAllRead = () => useSend(() => api.patch('/notifications/read-all'), [['notifications']]);

// ---------------------------------------------------------------------------
// Payments / AI
// ---------------------------------------------------------------------------
export const usePlans = () => useGet(['plans'], '/payments/plans');
export const useSubscribe = () => usePost('/payments/subscribe', [['payments'], ['plans']]);
export const useAiQuota = () => useGet(['ai', 'quota'], '/ai/quota');
export const useCoachChat = () => usePost('/ai/coach-chat', [['ai', 'conversations']]);
