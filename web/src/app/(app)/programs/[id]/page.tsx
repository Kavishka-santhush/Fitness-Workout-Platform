'use client';
import Link from 'next/link';
import { ArrowLeft, Star, CalendarDays, Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProgram, useEnrollProgram } from '@/lib/hooks';
import { formatMoney } from '@/lib/utils';

export default function ProgramDetailPage({ params }: { params: { id: string } }) {
  const { data: p, isLoading } = useProgram(params.id);
  const enroll = useEnrollProgram(params.id);

  if (isLoading) return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  if (!p) return <div>Program not found. <Link href="/programs" className="text-primary">Back</Link></div>;
  const prog: any = p;

  const weeks: any[] = prog.weeklyPlan ?? prog.workouts ?? prog.programWorkouts ?? [];

  return (
    <div>
      <Link href="/programs" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All programs
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex h-40 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-emerald-600/10">
            <CalendarDays className="h-12 w-12 text-primary/60" />
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">{prog.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{prog.difficulty}</Badge>
            <Badge variant="outline">{prog.goal?.replace(/_/g, ' ')}</Badge>
            <Badge variant="outline">{prog.programType}</Badge>
          </div>
          <p className="mt-4 text-muted-foreground">{prog.description}</p>

          <Card className="mt-6">
            <CardHeader><CardTitle>Weekly structure</CardTitle></CardHeader>
            <CardContent>
              {weeks.length ? (
                <div className="space-y-3">
                  {weeks.map((w: any, i: number) => (
                    <div key={i} className="rounded-lg border p-3">
                      <div className="text-sm font-semibold">Week {(w.week ?? i + 1)}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {(w.days ?? w.workouts ?? []).map((d: any, j: number) => (
                          <Badge key={j} variant="outline">{d.name ?? d.title ?? `Day ${j + 1}`}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> {prog.durationWeeks} week progressive plan</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> {prog.daysPerWeek} sessions per week</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Warm-ups, cooldowns & deload built in</li>
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-20">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold">{prog.priceCents ? formatMoney(prog.priceCents) : 'Free'}</span>
                <span className="inline-flex items-center gap-1 text-sm text-amber-500">
                  <Star className="h-4 w-4 fill" /> {Number(prog.ratingAvg ?? 0).toFixed(1)} ({prog.ratingCount ?? 0})
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" /> {prog.enrollmentCount ?? 0} athletes enrolled
              </div>
              {prog.creator && <p className="text-sm">by <span className="font-medium">{prog.creator.displayName}</span></p>}
              <Button className="w-full" onClick={() => enroll.mutate({})} disabled={enroll.isPending}>
                {enroll.isPending ? 'Enrolling…' : prog.priceCents ? 'Enroll & checkout' : 'Enroll for free'}
              </Button>
              <Link href="/schedule" className="block">
                <Button variant="outline" className="w-full">Preview in schedule</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
