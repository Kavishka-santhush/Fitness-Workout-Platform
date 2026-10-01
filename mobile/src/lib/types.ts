// Shared domain types mirroring the server API response envelopes.
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: { page: number; limit: number; total: number; totalPages: number };
  message?: string;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'TRAINER' | 'NUTRITIONIST' | 'MEMBER';
  subscriptionType: 'FREE' | 'PREMIUM' | 'TRAINER_PRO' | 'NUTRITION_PRO' | 'ENTERPRISE';
  bio?: string;
  level: number;
  xpPoints: number;
  streakCurrent: number;
  streakLongest: number;
}

export interface Exercise {
  id: string;
  name: string;
  description: string | null;
  exerciseType: string;
  difficulty: string;
  category: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  metValue: number | null;
  ratingAvg: number;
  ratingCount: number;
  videoUrl: string | null;
  instructions: { step: number; text: string }[];
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  position: number;
  sets: number;
  reps: string | null;
  weight: number | null;
  restSec: number;
  section: string;
  exercise?: Exercise;
}

export interface Workout {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  difficulty: string;
  estimatedDuration: number | null;
  estimatedCalories: number | null;
  visibility: string;
  tags: string[];
  exercises?: WorkoutExercise[];
}

export interface Program {
  id: string;
  name: string;
  description: string | null;
  goal: string;
  difficulty: string;
  programType: string | null;
  durationWeeks: number;
  daysPerWeek: number;
  priceCents: number;
  status: string;
  featured: boolean;
  coverImageUrl: string | null;
  ratingAvg: number;
  ratingCount: number;
  enrollmentCount: number;
  creator?: { id: string; displayName: string };
}

export interface Food {
  id: string;
  name: string;
  brand: string | null;
  servingLabel: string | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  category: string | null;
  barcode?: string | null;
}

export interface MealLogEntry {
  id: string;
  slot: string;
  date: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  food?: Food | null;
  mealName: string | null;
}

export interface BodyStat {
  id: string;
  date: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  bmi: number | null;
  measurements: Record<string, number>;
}

export interface Post {
  id: string;
  type: string;
  content: string | null;
  createdAt: string;
  kudosCount: number;
  commentsCount: number;
  hashtags: string[];
  user: Pick<User, 'id' | 'displayName' | 'avatarUrl' | 'username'>;
}

export interface LiveClass {
  id: string;
  title: string;
  classType: string;
  durationMin: number;
  scheduledAt: string;
  status: string;
  priceCents: number;
  maxParticipants: number;
  attendeeCount: number;
  ratingAvg: number;
  trainer: { id: string; displayName: string };
}

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  type: string;
  scope: string;
  goalValue: number;
  goalUnit: string;
  startDate: string;
  endDate: string;
  active: boolean;
  participantCount: number;
  progressValue?: number;
  rank?: number;
}

export interface TrainerProfile {
  id: string;
  bio: string | null;
  specializations: string[];
  hourlyRateCents: number;
  ratingAvg: number;
  ratingCount: number;
  clientCount: number;
  verificationStatus: string;
  user: Pick<User, 'id' | 'displayName' | 'avatarUrl'>;
}

export interface WearableDay {
  date: string;
  steps: number;
  activeCalories: number;
  restingHr: number | null;
  sleepHours: number | null;
}

export interface DashboardData {
  user: User;
  stats: {
    workoutsThisWeek: number;
    streak: number;
    caloriesThisWeek: number;
    totalVolume: number;
    prCount: number;
  };
  todayWorkout?: Workout | null;
  nutritionToday?: { calories: number; proteinG: number; carbsG: number; fatG: number; target: number };
  activity?: { steps: number; stepGoal: number; activeCalories: number; moveGoal: number };
  upcomingClass?: LiveClass | null;
  quote?: string;
  weeklyVolume?: { day: string; volume: number }[];
}
