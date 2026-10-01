'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Search, Star, CalendarDays } from 'lucide-react';
import { PageHeader, LoadingGrid, EmptyState } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { usePrograms } from '@/lib/hooks';
import { formatMoney } from '@/lib/utils';

const goals = ['', 'GENERAL_FITNESS', 'MUSCLE_GAIN', 'FAT_LOSS', 'STRENGTH', 'ENDURANCE', 'ATHLETIC_PERFORMANCE'];

export default function ProgramsPage() {
  const [q, setQ] = useState('');
  const [goal, setGoal] = useState('');
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (goal) params.set('goal', goal);
  params.set('status', 'PUBLISHED');

  const { data, isLoading } = usePrograms(params.toString());
  const items: any[] = (data as any)?.items ?? (Array.isArray(data) ? data : []);

  return (
    <div>
      <PageHeader title="Training Programs" subtitle="Structured multi-week plans built by certified coaches." />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search programs…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={goal} onChange={(e) => setGoal(e.target.value)} className="sm:w-56">
          {goals.map((g) => <option key={g} value={g}>{g ? g.replace(/_/g, ' ') : 'All goals'}</option>)}
        </Select>
      </div>

      {isLoading ? (
        <LoadingGrid />
      ) : items.length === 0 ? (
        <EmptyState title="No programs found" description="Try a different goal or search." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <Link key={p.id} href={`/programs/${p.id}`}>
              <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-primary/20 to-emerald-600/10">
                  {p.featured && <Badge className="absolute right-3 top-3">Featured</Badge>}
                  <CalendarDays className="h-10 w-10 text-primary/60" />
                </div>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight">{p.name}</h3>
                    <span className="inline-flex items-center gap-1 text-xs text-amber-500">
                      <Star className="h-3.5 w-3.5 fill" /> {Number(p.ratingAvg ?? 0).toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{p.durationWeeks} wks · {p.daysPerWeek}×/wk</span>
                    <span className="font-semibold text-foreground">{p.priceCents ? formatMoney(p.priceCents) : 'Free'}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
