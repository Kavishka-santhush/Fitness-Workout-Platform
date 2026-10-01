import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';

type QK = (string | number | undefined | null)[];

/** Generic GET query over the envelope-aware axios instance. */
export function useGet<T>(key: QK, path: string, opts?: Partial<UseQueryOptions<T>>) {
  return useQuery<T>({ queryKey: key, queryFn: () => unwrap<T>(api.get(path)), ...opts });
}

/** Generic mutation; invalidates the given query keys on success. */
export function useSend<TData = any, TVars = any>(
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
export const useCurrentUser = () => useGet<any>(['me'], '/auth/me');
export const useCompleteOnboarding = () => usePost('/auth/onboarding', [['me'], ['dashboard']]);
export const useDashboard = () => useGet<any>(['dashboard'], '/users/dashboard');
export const useSearchUsers = (q: string) =>
  useGet<any>(['users', 'search', q], `/users/search?q=${encodeURIComponent(q)}`, { enabled: q.length > 1 });
export const useUpdateProfile = () => useSend((v: any) => api.patch('/users/profile', v), [['dashboard'], ['me']]);

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------
export const useExercises = (params = '') => useGet<any>(['exercises', params], `/exercises?${params}`);
export const useExercise = (id: string) => useGet<any>(['exercise', id], `/exercises/${id}`);
export const useFavoriteExercises = () => useGet<any>(['exercises', 'favorites'], '/exercises/favorites');
export const useToggleExerciseFavorite = (id: string) =>
  usePost(`/exercises/${id}/favorite`, [['exercises'], ['exercise', id], ['exercises', 'favorites']]);
export const useRateExercise = (id: string) =>
  usePost(`/exercises/${id}/rate`, [['exercise', id]]);

// ---------------------------------------------------------------------------
// Workouts & programs
// ---------------------------------------------------------------------------
export const useWorkouts = (params = '') => useGet<any>(['workouts', params], `/workouts?${params}`);
export const useWorkout = (id: string) => useGet<any>(['workout', id], `/workouts/${id}`);
export const usePrograms = (params = '') => useGet<any>(['programs', params], `/programs?${params}`);
export const useFeaturedPrograms = () => useGet<any>(['programs', 'featured'], '/programs/featured');
export const useProgram = (id: string) => useGet<any>(['program', id], `/programs/${id}`);
export const useEnrollProgram = (id: string) => usePost(`/programs/${id}/enroll`, [['program', id], ['programs']]);
export const useUnenrollProgram = (id: string) =>
  useSend(() => api.delete(`/programs/${id}/enroll`), [['program', id], ['programs']]);

// ---------------------------------------------------------------------------
// Sessions (active workout tracking)
// ---------------------------------------------------------------------------
export const useStartSession = () => usePost<any, { workoutId?: string; programId?: string; name?: string }>('/sessions/start', [['sessions']]);
export const useLogSet = (sessionId: string) =>
  useSend((v: any) => api.post(`/sessions/${sessionId}/sets`, v), [['sessions'], ['dashboard']]);
export const useSkipExercise = (sessionId: string) =>
  useSend((v: { exerciseId: string; reason?: string }) => api.post(`/sessions/${sessionId}/skip`, v), [['sessions']]);
export const useSwapExercise = (sessionId: string) =>
  useSend((v: { fromExerciseId: string; toExerciseId: string }) => api.post(`/sessions/${sessionId}/swap`, v), [['sessions']]);
export const useAutoSaveSession = (sessionId: string) =>
  useSend(() => api.post(`/sessions/${sessionId}/auto-save`), []);
export const usePauseSession = (sessionId: string) =>
  useSend(() => api.post(`/sessions/${sessionId}/pause`), [['sessions']]);
export const useResumeSession = (sessionId: string) =>
  useSend(() => api.post(`/sessions/${sessionId}/resume`), [['sessions']]);
export const useCompleteSession = (sessionId: string) =>
  useSend(() => api.post(`/sessions/${sessionId}/complete`), [['sessions'], ['dashboard'], ['workouts'], ['progress']]);
export const useLogCardio = () => usePost('/sessions/cardio', [['sessions'], ['dashboard']]);
export const useSaveRoute = () => usePost('/sessions/routes', [['routes']]);

// ---------------------------------------------------------------------------
// Nutrition / meals / foods
// ---------------------------------------------------------------------------
export const useFoods = (params = '') => useGet<any>(['foods', params], `/foods?${params}`);
export const useFoodByBarcode = (barcode: string) =>
  useGet<any>(['foods', 'barcode', barcode], `/foods?barcode=${encodeURIComponent(barcode)}`, { enabled: barcode.length >= 6 });
export const useFavoriteFoods = () => useGet<any>(['foods', 'favorites'], '/foods/favorites');
export const useRecentFoods = () => useGet<any>(['foods', 'recent'], '/foods/recent');
export const useCreateCustomFood = () => usePost('/foods/custom', [['foods'], ['foods', 'recent']]);
export const useNutritionGoal = () => useGet<any>(['nutrition', 'goal'], '/nutrition/goal');
export const useTargetToday = () => useGet<any>(['nutrition', 'target-today'], '/nutrition/target-today');
export const useMealDay = (date: string) => useGet<any>(['meals', date], `/meals/day?date=${date}`);
export const useLogMealEntry = () => useSend((v: any) => api.post('/meals/entries', v), [['meals'], ['dashboard'], ['nutrition', 'target-today']]);
export const useDeleteMealEntry = () => useSend((id: string) => api.delete(`/meals/entries/${id}`), [['meals'], ['dashboard']]);
export const useLogWater = () => useSend((v: { date?: string; amountMl: number }) => api.post('/meals/water', v), [['meals'], ['dashboard']]);

// ---------------------------------------------------------------------------
// Body stats & progress
// ---------------------------------------------------------------------------
export const useBodyStats = () => useGet<any>(['body-stats'], '/body-stats');
export const useCurrentBodyStat = () => useGet<any>(['body-stats', 'current'], '/body-stats/current');
export const useAddBodyStat = () => usePost('/body-stats', [['body-stats'], ['progress'], ['dashboard']]);
export const useProgressPhotos = () => useGet<any>(['progress', 'photos'], '/progress/photos');
export const useBeforeAfter = (pose = '') =>
  useGet<any>(['progress', 'before-after', pose], `/progress/before-after${pose ? `?pose=${encodeURIComponent(pose)}` : ''}`);
export const useWeightChart = () => useGet<any>(['progress', 'charts', 'weight'], '/progress/charts/weight');
export const useWorkoutChart = () => useGet<any>(['progress', 'charts', 'workouts'], '/progress/charts/workouts');
export const usePersonalRecords = () => useGet<any>(['progress', 'prs'], '/progress/prs');

// ---------------------------------------------------------------------------
// Wearable / health
// ---------------------------------------------------------------------------
export const useWearableDaily = () => useGet<any>(['wearable', 'daily'], '/wearable/daily');
export const useSyncWearable = () => usePost('/wearable/sync', [['wearable', 'daily'], ['dashboard']]);

// ---------------------------------------------------------------------------
// Social
// ---------------------------------------------------------------------------
export const useFeed = () => useGet<any>(['social', 'feed'], '/social/feed');
export const useCreatePost = () => usePost('/social/posts', [['social', 'feed']]);
export const useGiveKudos = (id: string) => useSend(() => api.post(`/social/posts/${id}/kudos`), [['social', 'feed']]);
export const useSuggestions = () => useGet<any>(['social', 'suggestions'], '/social/suggestions');
export const usePostDetail = (id: string) => useGet<any>(['social', 'post', id], `/social/posts/${id}`);
export const usePostComments = (id: string) => useGet<any>(['social', 'post', id, 'comments'], `/social/posts/${id}/comments`);
export const useAddComment = (id: string) =>
  usePost(`/social/posts/${id}/comments`, [['social', 'post', id, 'comments'], ['social', 'post', id]]);
export const useUserPosts = (userId: string) => useGet<any>(['social', 'user', userId], `/social/users/${userId}/posts`);
export const useFollowUser = (userId: string) =>
  usePost(`/social/users/${userId}/follow`, [['social', 'feed'], ['social', 'suggestions'], ['trainer', userId]]);
export const useUnfollowUser = (userId: string) =>
  usePost(`/social/users/${userId}/unfollow`, [['social', 'feed'], ['social', 'suggestions'], ['trainer', userId]]);

// ---------------------------------------------------------------------------
// Trainers, classes, challenges, schedule
// ---------------------------------------------------------------------------
export const useTrainers = (params = '') => useGet<any>(['trainers', params], `/trainers?${params}`);
export const useTrainer = (userId: string) => useGet<any>(['trainer', userId], `/trainers/${userId}`);
export const useTrainerAvailability = (userId: string) =>
  useGet<any>(['trainer', userId, 'availability'], `/trainers/${userId}/availability`);
export const useBookSession = () => usePost('/trainers/bookings', [['trainer'], ['bookings']]);

export const useLiveClasses = (params = '') => useGet<any>(['classes', params], `/classes?${params}`);
export const useLiveClass = (id: string) => useGet<any>(['class', id], `/classes/${id}`);
export const useEnrollClass = (id: string) => usePost(`/classes/${id}/enroll`, [['class', id], ['classes']]);
export const useCancelClassEnrollment = (id: string) =>
  usePost(`/classes/${id}/cancel-enrollment`, [['class', id], ['classes']]);

export const useChallenges = (params = '') => useGet<any>(['challenges', params], `/challenges?${params}`);
export const useChallenge = (id: string) => useGet<any>(['challenge', id], `/challenges/${id}`);
export const useEnrollChallenge = (id: string) => usePost(`/challenges/${id}/enroll`, [['challenge', id], ['challenges']]);
export const useChallengeLeaderboard = (id: string) => useGet<any>(['challenge', id, 'leaderboard'], `/challenges/${id}/leaderboard`);

export const useScheduleToday = () => useGet<any>(['schedule', 'today'], '/schedule/today');
export const useScheduleWeek = () => useGet<any>(['schedule', 'week'], '/schedule/week');

// ---------------------------------------------------------------------------
// Achievements, notifications, payments, AI
// ---------------------------------------------------------------------------
export const useAchievements = () => useGet<any>(['achievements'], '/achievements/mine');
export const useNotifications = () => useGet<any>(['notifications'], '/notifications');
export const useUnreadCount = () => useGet<any>(['notifications', 'unread'], '/notifications/unread-count');
export const useMarkAllRead = () => useSend(() => api.patch('/notifications/read-all'), [['notifications']]);

export const usePlans = () => useGet<any>(['plans'], '/payments/plans');
export const useSubscribe = () => usePost('/payments/subscribe', [['payments'], ['plans']]);

export const useAiQuota = () => useGet<any>(['ai', 'quota'], '/ai/quota');
export const useCoachChat = () => usePost('/ai/coach-chat', [['ai', 'conversations']]);
export const useAiQuote = () => useGet<any>(['ai', 'quote'], '/ai/quote');
export const useAiCalorieEstimator = () => usePost('/ai/calorie-estimator', [['foods', 'recent']]);
export const useAiFoodRecognition = () => usePost('/ai/food-recognition', [['foods']]);
export const useAiCalorieFromMeal = () => usePost('/ai/calorie-estimator', []);
export const useExerciseAlternatives = () => useSend((v: any) => api.post('/ai/exercise-alternatives', v), []);
