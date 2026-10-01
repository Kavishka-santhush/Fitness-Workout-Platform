'use client';
import { useState } from 'react';
import { TrendingDown, Trophy, Camera } from 'lucide-react';
import { PageHeader, EmptyState } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendChart } from '@/components/charts';
import { useWeightChart, useWorkoutChart, usePersonalRecords, useCurrentBodyStat, useAddBodyStat, useProgressPhotos } from '@/lib/hooks';

export default function ProgressPage() {
  const { data: weight } = useWeightChart();
  const { data: volume } = useWorkoutChart();
  const { data: prs } = usePersonalRecords();
  const { data: current } = useCurrentBodyStat();
  const { data: photos } = useProgressPhotos();
  const addStat = useAddBodyStat();

  const [w, setW] = useState('');
  const [bf, setBf] = useState('');

  const weightData = (weight as any[]) ?? [];
  const volumeData = (volume as any[]) ?? [];
  const prList: any[] = (prs as any)?.items ?? (Array.isArray(prs) ? prs : []);
  const photoList: any[] = (photos as any)?.items ?? (Array.isArray(photos) ? photos : []);
  const c: any = current ?? {};

  const save = () => {
    if (!w) return;
    addStat.mutate({ date: new Date().toISOString().slice(0, 10), weightKg: Number(w), bodyFatPct: bf ? Number(bf) : undefined });
    setW(''); setBf('');
  };

  return (
    <div>
      <PageHeader title="Progress" subtitle="Track your body composition, lifting trends, and records." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><TrendingDown className="h-5 w-5" /></span>
          <div><p className="text-sm text-muted-foreground">Current weight</p><p className="text-xl font-bold">{c.weightKg ?? '—'} kg</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><TrendingDown className="h-5 w-5" /></span>
          <div><p className="text-sm text-muted-foreground">Body fat</p><p className="text-xl font-bold">{c.bodyFatPct != null ? `${c.bodyFatPct}%` : '—'}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Trophy className="h-5 w-5" /></span>
          <div><p className="text-sm text-muted-foreground">Records</p><p className="text-xl font-bold">{prList.length}</p></div>
        </CardContent></Card>
      </div>

      <Card className="mt-4">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-sm font-medium">Weight (kg)</label>
            <Input type="number" value={w} onChange={(e) => setW(e.target.value)} placeholder="82.5" />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium">Body fat % (optional)</label>
            <Input type="number" value={bf} onChange={(e) => setBf(e.target.value)} placeholder="18" />
          </div>
          <Button onClick={save} disabled={addStat.isPending || !w}>{addStat.isPending ? 'Saving…' : 'Log today'}</Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="charts" className="mt-6">
        <TabsList>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="prs">Personal Records</TabsTrigger>
          <TabsTrigger value="photos">Progress Photos</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="mt-4 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Body weight trend</CardTitle></CardHeader>
            <CardContent>
              {weightData.length ? <TrendChart type="line" data={weightData.map((x) => ({ label: String(x.date ?? '').slice(5, 10), value: x.weightKg }))} color="#0ea5e9" /> : <EmptyState title="No data" />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Weekly training volume</CardTitle></CardHeader>
            <CardContent>
              {volumeData.length ? <TrendChart type="bar" data={volumeData.map((x) => ({ label: x.label ?? x.week ?? '', value: x.volume }))} /> : <EmptyState title="No data" />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prs" className="mt-4">
          <Card>
            <CardContent className="p-5">
              {prList.length ? (
                <div className="divide-y">
                  {prList.map((pr) => (
                    <div key={pr.id ?? pr.exerciseId} className="flex items-center justify-between py-3 text-sm">
                      <span className="font-medium">{pr.exercise?.name ?? pr.exerciseName ?? 'Exercise'}</span>
                      <span className="text-muted-foreground">{pr.value ?? pr.bestWeight ?? pr.best1RM} {pr.unit ?? 'kg'}</span>
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="No records yet" description="Complete workouts to set PRs." />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos" className="mt-4">
          {photoList.length ? (
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {photoList.map((p) => (
                <div key={p.id} className="overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.imageUrl} alt="progress" className="aspect-square w-full object-cover" />
                  <div className="p-2 text-xs text-muted-foreground">{String(p.date ?? '').slice(0, 10)}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No progress photos" description="Upload photos to visualize your transformation." icon={<Camera className="h-8 w-8" />} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
