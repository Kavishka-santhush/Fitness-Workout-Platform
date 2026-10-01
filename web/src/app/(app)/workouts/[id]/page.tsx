'use client';
import Link from 'next/link';
import { ArrowLeft, Play, Clock, Flame, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { useWorkout, useStartSession } from '@/lib/hooks';

export default function WorkoutDetailPage({ params }: { params: { id: string } }) {
  const { data, isLoading } = useWorkout(params.id);
  const start = useStartSession();
  if (isLoading) return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  const w: any = data ?? {};
  const exercises: any[] = w.exercises ?? [];

  return (
    <div>
      <Link href="/workouts" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Workouts
      </Link>

      <PageHeader
        title={w.name ?? 'Workout'}
        subtitle={w.description ?? undefined}
        actions={
          <Button onClick={() => start.mutate({ workoutId: w.id })} disabled={start.isPending}>
            <Play className="h-4 w-4" /> {start.isPending ? 'Starting…' : 'Start session'}
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge variant="secondary">{w.difficulty}</Badge>
        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Clock className="h-4 w-4" /> {w.estimatedDuration ?? '—'} min</span>
        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Flame className="h-4 w-4" /> {w.estimatedCalories ?? '—'} kcal</span>
      </div>

      <div className="space-y-2">
        {exercises.map((e, i) => (
          <Card key={e.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{i + 1}</span>
                <div>
                  <p className="font-medium">{e.exercise?.name ?? 'Exercise'}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {e.exercise?.primaryMuscles?.[0] && <span>{e.exercise.primaryMuscles[0]}</span>}
                    <Avatar name={e.section} className="h-5 w-5 text-[10px]">{e.section?.[0]}</Avatar>
                  </div>
                </div>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold">{e.sets} × {e.reps ?? '—'}</p>
                <p className="text-xs text-muted-foreground">{e.weight ? `${e.weight} kg · ` : ''}rest {e.restSec}s</p>
              </div>
            </CardContent>
          </Card>
        ))}
        {exercises.length === 0 && (
          <Card><CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <CheckCircle2 className="h-5 w-5" /> No exercises configured yet.
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
