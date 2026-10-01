import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** A single logged set held locally before / alongside the server round-trip. */
export interface LoggedSet {
  exerciseId: string;
  setNumber: number;
  reps?: number;
  weight?: number;
  durationSec?: number;
  rpe?: number;
  done: boolean;
}

export interface ActiveSession {
  sessionId: string;
  workoutId: string;
  workoutName: string;
  startedAt: number; // epoch ms
  elapsedSec: number;
  paused: boolean;
  currentExerciseIndex: number;
  exerciseIds: string[];
  /** Snapshot of the planned exercises so the runner works fully offline. */
  exercises: PlannedExercise[];
  sets: LoggedSet[];
  notes: string;
  restUntil: number | null; // epoch ms when current rest finishes
}

/** Lightweight, cached view of a workout's planned exercise for the runner. */
export interface PlannedExercise {
  id: string;
  name: string;
  sets: number;
  reps: string | null;
  weight: number | null;
  restSec: number;
}

const setKey = (exerciseId: string, setNumber: number) => `${exerciseId}#${setNumber}`;

interface SessionState {
  active: ActiveSession | null;
  begin: (input: {
    sessionId: string;
    workoutId: string;
    workoutName: string;
    exerciseIds: string[];
    exercises?: PlannedExercise[];
  }) => void;
  clear: () => void;
  setIndex: (index: number) => void;
  togglePause: () => void;
  tick: (deltaSec: number) => void;
  upsertSet: (set: LoggedSet) => void;
  getSet: (exerciseId: string, setNumber: number) => LoggedSet | undefined;
  setNotes: (notes: string) => void;
  startRest: (seconds: number) => void;
  endRest: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      active: null,
      begin: ({ sessionId, workoutId, workoutName, exerciseIds, exercises }) =>
        set({
          active: {
            sessionId,
            workoutId,
            workoutName,
            startedAt: Date.now(),
            elapsedSec: 0,
            paused: false,
            currentExerciseIndex: 0,
            exerciseIds,
            exercises: exercises ?? [],
            sets: [],
            notes: '',
            restUntil: null,
          },
        }),
      clear: () => set({ active: null }),
      setIndex: (index) =>
        set((s) => (s.active ? { active: { ...s.active, currentExerciseIndex: index } } : {})),
      togglePause: () =>
        set((s) => (s.active ? { active: { ...s.active, paused: !s.active.paused } } : {})),
      tick: (deltaSec) =>
        set((s) =>
          s.active && !s.active.paused
            ? { active: { ...s.active, elapsedSec: s.active.elapsedSec + deltaSec } }
            : {}
        ),
      upsertSet: (incoming) =>
        set((s) => {
          if (!s.active) return {};
          const idx = s.active.sets.findIndex(
            (x) => x.exerciseId === incoming.exerciseId && x.setNumber === incoming.setNumber
          );
          const sets = [...s.active.sets];
          if (idx >= 0) sets[idx] = incoming;
          else sets.push(incoming);
          return { active: { ...s.active, sets } };
        }),
      getSet: (exerciseId, setNumber) =>
        get().active?.sets.find((x) => x.exerciseId === exerciseId && x.setNumber === setNumber),
      setNotes: (notes) => set((s) => (s.active ? { active: { ...s.active, notes } } : {})),
      startRest: (seconds) =>
        set((s) => (s.active ? { active: { ...s.active, restUntil: Date.now() + seconds * 1000 } } : {})),
      endRest: () => set((s) => (s.active ? { active: { ...s.active, restUntil: null } } : {})),
    }),
    {
      name: 'fitforge:session',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ active: s.active }),
    }
  )
);

export { setKey };
