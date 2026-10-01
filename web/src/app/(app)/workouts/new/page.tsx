'use client';
import Link from 'next/link';
import { PageHeader, LoadingGrid, EmptyState } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Dumbbell, Clock } from 'lucide-react';
import { useExercises } from '@/lib/hooks';

export default function NewWorkoutPage() {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<any[]>([]);
  const { data } = useExercises('limit=40');
  const items: any[] = (data as any)?.items ?? (Array.isArray(data) ? data : []);

  const toggle = (e: any) =>
    setSelected((s) => (s.find((x) => x.id === e.id) ? s.filter((x) => x.id !== e.id) : [...s, e]));

  return (
    <div>
      <PageHeader
        title="Build a workout"
        subtitle="Pick a name and select exercises. You can configure sets & reps after saving."
        actions={<Button disabled={!name || selected.length === 0}>Save workout</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-5">
              <label className="text-sm font-medium">Workout name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Monday Push Day"
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="mt-4 text-sm font-medium">Exercises ({selected.length})</p>
              {items.length === 0 ? (
                <div className="mt-3"><LoadingGrid count={4} /></div>
              ) : (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {items.map((e) => {
                    const on = !!selected.find((x) => x.id === e.id);
                    return (
                      <button
                        key={e.id}
                        onClick={() => toggle(e)}
                        className={`flex items-center justify-between rounded-lg border p-3 text-left text-sm transition-colors ${on ? 'border-primary bg-primary/5' : 'hover:bg-accent'}`}
                      >
                        <span className="flex items-center gap-2">
                          <Dumbbell className="h-4 w-4 text-muted-foreground" />
                          {e.name}
                        </span>
                        <Badge variant={on ? 'default' : 'outline'}>{on ? 'Added' : 'Add'}</Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeaderTitle />
            <CardContent>
              {selected.length === 0 ? (
                <EmptyState title="Nothing selected" description="Choose exercises to build your routine." />
              ) : (
                <ul className="space-y-2 text-sm">
                  {selected.map((e, i) => (
                    <li key={e.id} className="flex items-center justify-between rounded-lg border p-2">
                      <span className="flex items-center gap-2"><span className="text-muted-foreground">{i + 1}.</span> {e.name}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> 3×10</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/workouts" className="mt-4 block">
                <Button variant="outline" className="w-full">Back to workouts</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CardHeaderTitle() {
  return <div className="p-5 pb-0 font-semibold">Summary</div>;
}
