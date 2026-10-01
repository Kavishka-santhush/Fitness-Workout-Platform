'use client';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { Flame, Dumbbell, Activity, Trophy, Plus, Play } from 'lucide-react';
import { PageHeader, StatCard, EmptyState } from '@/components/common';
import { TrendChart, MacroPie } from '@/components/charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDashboard, useWeightChart } from '@/lib/hooks';

export default function DashboardPage() {
  const { user } = useUser();
  const { data, isLoading } = useDashboard();
  const { data: weight } = useWeightChart();

  const d: any = data ?? {};
  const stats = d.stats ?? {};
  const weeklyVolume = (d.weeklyVolume ?? []).map((p: any) => ({ label: p.day, value: p.volume }));
  const nutrition = d.nutritionToday;
  const macroData = nutrition
    ? [
        { name: 'Protein', value: Math.round((nutrition.proteinG ?? 0) * 4) },
        { name: 'Carbs', value: Math.round(nutrition.carbsG ?? 0) },
        { name: 'Fat', value: Math.round((nutrition.fatG ?? 0) * 9) },
      ]
    : [];

  const firstName = user?.firstName || user?.username || 'Athlete';

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName} 👋`}
        subtitle={isLoading ? 'Loading your summary…' : 'Here is your training snapshot for this week.'}
        actions={
          <Link href="/workouts/new">
            <Button><Plus className="h-4 w-4" /> New workout</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Workouts this week" value={stats.workoutsThisWeek ?? 0} icon={<Dumbbell className="h-5 w-5" />} />
        <StatCard label="Current streak" value={`${stats.streak ?? 0} days`} hint="Keep it alive!" icon={<Flame className="h-5 w-5" />} />
        <StatCard label="Calories (wk)" value={stats.caloriesThisWeek ?? 0} icon={<Activity className="h-5 w-5" />} />
        <StatCard label="Total volume" value={`${(stats.totalVolume ?? 0).toLocaleString()} kg`} />
        <StatCard label="Personal records" value={stats.prCount ?? 0} icon={<Trophy className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Weekly training volume</CardTitle></CardHeader>
          <CardContent>
            {weeklyVolume.length ? (
              <TrendChart data={weeklyVolume} yKey="value" />
            ) : (
              <EmptyState title="No workouts yet" description="Log your first session to see volume trends." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Macros today</CardTitle></CardHeader>
          <CardContent>
            {macroData.length ? (
              <>
                <MacroPie data={macroData} />
                <div className="mt-2 text-center text-sm text-muted-foreground">
                  {nutrition?.calories ?? 0} / {nutrition?.target ?? '—'} kcal
                </div>
              </>
            ) : (
              <EmptyState title="No food logged" description="Add meals to see your macro split." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Today&apos;s workout</CardTitle>
            <Link href="/schedule"><Button variant="ghost" size="sm">Full schedule</Button></Link>
          </CardHeader>
          <CardContent>
            {d.todayWorkout ? (
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <div className="font-semibold">{d.todayWorkout.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {d.todayWorkout.exercises?.length ?? 0} exercises · {d.todayWorkout.estimatedDuration ?? '—'} min
                  </div>
                </div>
                <Link href={`/workouts/${d.todayWorkout.id}`}>
                  <Button><Play className="h-4 w-4" /> Start</Button>
                </Link>
              </div>
            ) : (
              <EmptyState title="Rest day" description="No workout scheduled. Explore a program instead." action={
                <Link href="/programs"><Button variant="outline">Browse programs</Button></Link>
              } />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Weight trend</CardTitle></CardHeader>
          <CardContent>
            {weight && (weight as any[]).length ? (
              <TrendChart type="line" height={180} data={(weight as any[]).map((w) => ({ label: w.date?.slice?.(5, 10) ?? '', value: w.weightKg }))} yKey="value" color="#0ea5e9" />
            ) : (
              <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
                <Badge variant="outline">Log body stats to see trend</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
