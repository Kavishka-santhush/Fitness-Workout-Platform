'use client';
import Link from 'next/link';
import { ArrowLeft, Heart, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useExercise, useToggleExerciseFavorite } from '@/lib/hooks';

export default function ExerciseDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const { data: e, isLoading } = useExercise(id);
  const favorite = useToggleExerciseFavorite(id);

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-8 w-1/3 rounded bg-muted" /><div className="h-64 rounded-xl bg-muted" /></div>;
  if (!e) return <div>Exercise not found. <Link href="/exercises" className="text-primary">Back</Link></div>;

  const ex: any = e;
  return (
    <div>
      <Link href="/exercises" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to library
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{ex.name}</h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="secondary">{ex.difficulty}</Badge>
                <Badge variant="outline">{ex.exerciseType}</Badge>
                {ex.category && <Badge variant="outline">{ex.category}</Badge>}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => favorite.mutate({})} aria-label="Favorite">
              <Heart className={ex.isFavorite ? 'fill-red-500 text-red-500' : 'h-5 w-5'} />
            </Button>
          </div>

          <Card className="mt-6">
            <CardHeader><CardTitle>How to perform</CardTitle></CardHeader>
            <CardContent>
              {ex.description && <p className="mb-4 text-sm text-muted-foreground">{ex.description}</p>}
              <ol className="space-y-2">
                {(ex.instructions ?? []).map((s: any, i: number) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{s.step ?? i + 1}</span>
                    <span>{s.text}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {ex.videoUrl && (
            <Card className="mt-6">
              <CardHeader><CardTitle>Demo</CardTitle></CardHeader>
              <CardContent>
                <video src={ex.videoUrl} controls className="aspect-video w-full rounded-lg bg-black" />
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle>Muscles</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Primary</p>
                <div className="mt-1 flex flex-wrap gap-1">{(ex.primaryMuscles ?? []).map((m: string) => <Badge key={m}>{m}</Badge>)}</div>
              </div>
              <div>
                <p className="text-muted-foreground">Secondary</p>
                <div className="mt-1 flex flex-wrap gap-1">{(ex.secondaryMuscles ?? []).map((m: string) => <Badge key={m} variant="outline">{m}</Badge>)}</div>
              </div>
              <div>
                <p className="text-muted-foreground">Equipment</p>
                <div className="mt-1 flex flex-wrap gap-1">{(ex.equipment ?? []).map((m: string) => <Badge key={m} variant="secondary">{m}</Badge>)}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardContent className="grid grid-cols-2 gap-4 py-6 text-center">
              <div><p className="text-2xl font-bold">{ex.metValue ?? '—'}</p><p className="text-xs text-muted-foreground">MET value</p></div>
              <div><p className="text-2xl font-bold">{Number(ex.ratingAvg ?? 0).toFixed(1)}</p><p className="text-xs text-muted-foreground">{ex.ratingCount ?? 0} ratings</p></div>
            </CardContent>
          </Card>

          <Link href="/workouts/new">
            <Button className="mt-4 w-full"><Play className="h-4 w-4" /> Add to workout</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
