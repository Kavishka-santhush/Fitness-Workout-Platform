'use client';
import { useState } from 'react';
import { Plus, Droplet, Search } from 'lucide-react';
import { PageHeader } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { MacroPie } from '@/components/charts';
import { useMealDay, useTargetToday, useFoods, useLogMealEntry, useLogWater } from '@/lib/hooks';

const today = new Date().toISOString().slice(0, 10);
const slots = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

export default function NutritionPage() {
  const { data: day } = useMealDay(today);
  const { data: target } = useTargetToday();
  const logEntry = useLogMealEntry();
  const logWater = useLogWater();
  const [q, setQ] = useState('');
  const { data: foods } = useFoods(`q=${encodeURIComponent(q)}&limit=8`);

  const entries: any[] = (day as any)?.entries ?? (Array.isArray(day) ? day : []);
  const t: any = target ?? { calories: 2200, proteinG: 150, carbsG: 250, fatG: 70 };

  const totals = entries.reduce(
    (a, e) => ({ calories: a.calories + (e.calories || 0), proteinG: a.proteinG + (e.proteinG || 0), carbsG: a.carbsG + (e.carbsG || 0), fatG: a.fatG + (e.fatG || 0) }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );
  const macroData = [
    { name: 'Protein', value: Math.round(totals.proteinG * 4) },
    { name: 'Carbs', value: Math.round(totals.carbsG) },
    { name: 'Fat', value: Math.round(totals.fatG * 9) },
  ];
  const pct = Math.min(100, Math.round((totals.calories / (t.calories || 1)) * 100));

  return (
    <div>
      <PageHeader title="Nutrition" subtitle="Log meals and track your macros for today." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Daily totals</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold">{totals.calories}</div>
              <div className="text-sm text-muted-foreground">of {t.calories} kcal ({pct}%)</div>
            </div>
            <Progress value={pct} className="mt-3" />
            <div className="mt-4"><MacroPie data={macroData} height={180} /></div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
              <Macro label="Protein" v={totals.proteinG} target={t.proteinG} unit="g" />
              <Macro label="Carbs" v={totals.carbsG} target={t.carbsG} unit="g" />
              <Macro label="Fat" v={totals.fatG} target={t.fatG} unit="g" />
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Today&apos;s diary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {slots.map((slot) => {
                const items = entries.filter((e) => e.slot === slot);
                return (
                  <div key={slot}>
                    <div className="mb-1 flex items-center justify-between">
                      <h3 className="text-sm font-semibold capitalize">{slot.toLowerCase()}</h3>
                      <span className="text-xs text-muted-foreground">{items.reduce((s, i) => s + (i.calories || 0), 0)} kcal</span>
                    </div>
                    <div className="divide-y rounded-lg border">
                      {items.length === 0 && <div className="p-3 text-xs text-muted-foreground">Nothing logged</div>}
                      {items.map((e) => (
                        <div key={e.id} className="flex items-center justify-between p-3 text-sm">
                          <span>{e.food?.name ?? e.mealName ?? 'Item'}</span>
                          <Badge variant="outline">{e.calories} kcal</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Quick add food</CardTitle>
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search foods…" className="h-9 pl-8" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {((foods as any)?.items ?? (Array.isArray(foods) ? foods : [])).slice(0, 8).map((f: any) => (
                <button
                  key={f.id}
                  onClick={() => logEntry.mutate({ date: today, slot: 'SNACK', foodId: f.id, servings: 1 })}
                  className="flex items-center justify-between rounded-lg border p-3 text-left text-sm hover:bg-accent"
                >
                  <span className="truncate">{f.name}</span>
                  <span className="ml-2 flex items-center gap-1 text-xs text-muted-foreground"><Plus className="h-3 w-3" /> {f.calories}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Water</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-muted-foreground"><Droplet className="h-5 w-5 text-sky-500" /> Log glasses</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => logWater.mutate({ date: today, amountMl: 250 })}>+250ml</Button>
              <Button size="sm" onClick={() => logWater.mutate({ date: today, amountMl: 500 })}>+500ml</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Macro({ label, v, target, unit }: { label: string; v: number; target: number; unit: string }) {
  return (
    <div>
      <p className="font-semibold">{Math.round(v)}{unit}</p>
      <p className="text-xs text-muted-foreground">{label} / {target}{unit}</p>
    </div>
  );
}
