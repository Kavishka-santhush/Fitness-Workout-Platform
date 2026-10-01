'use client';
import Link from 'next/link';
import { Plus, Clock, Flame, Play } from 'lucide-react';
import { PageHeader, LoadingGrid, EmptyState } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { useWorkouts } from '@/lib/hooks';

export default function WorkoutsPage() {
  const [tab, setTab] = useState('mine');
  const { data, isLoading } = useWorkouts(`scope=${tab}&limit=48`);
  const items: any[] = (data as any)?.items ?? (Array.isArray(data) ? data : []);

  return (
    <div>
      <PageHeader
        title="Workouts"
        subtitle="Create, browse, and start training sessions."
        actions={
          <Link href="/workouts/new"><Button><Plus className="h-4 w-4" /> Build workout</Button></Link>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="mine">My workouts</TabsTrigger>
          <TabsTrigger value="public">Community</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <LoadingGrid />
      ) : items.length === 0 ? (
        <EmptyState
          title="No workouts here yet"
          description="Build your first routine and it will show up here."
          action={<Link href="/workouts/new"><Button>Create workout</Button></Link>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((w) => (
            <Card key={w.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <Link href={`/workouts/${w.id}`} className="font-semibold hover:underline">{w.name}</Link>
                  <Badge variant="secondary">{w.difficulty}</Badge>
                </div>
                {w.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{w.description}</p>}
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {w.estimatedDuration ?? '—'} min</span>
                  <span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5" /> {w.estimatedCalories ?? '—'} kcal</span>
                  <span>{w.exercises?.length ?? 0} moves</span>
                </div>
                <Link href={`/workouts/${w.id}`} className="mt-4 block">
                  <Button size="sm" className="w-full"><Play className="h-4 w-4" /> Start</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
