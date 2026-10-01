'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Search, Star, BadgeCheck } from 'lucide-react';
import { PageHeader, LoadingGrid, EmptyState } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useTrainers } from '@/lib/hooks';
import { formatMoney } from '@/lib/utils';

export default function TrainersPage() {
  const [q, setQ] = useState('');
  const [spec, setSpec] = useState('');
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (spec) params.set('specialization', spec);
  const { data, isLoading } = useTrainers(params.toString());
  const items: any[] = (data as any)?.items ?? (Array.isArray(data) ? data : []);

  return (
    <div>
      <PageHeader title="Find a Coach" subtitle="Certified trainers and nutritionists ready to help you hit your goals." />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search coaches…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={spec} onChange={(e) => setSpec(e.target.value)} className="sm:w-56">
          {['', 'STRENGTH', 'BODYBUILDING', 'WEIGHT_LOSS', 'NUTRITION', 'CONDITIONING', 'REHAB'].map((s) => (
            <option key={s} value={s}>{s ? s.replace(/_/g, ' ') : 'All specialties'}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <LoadingGrid />
      ) : items.length === 0 ? (
        <EmptyState title="No coaches found" description="Adjust your filters." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((tp) => (
            <Card key={tp.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Avatar src={tp.user?.avatarUrl} name={tp.user?.displayName} className="h-14 w-14 text-base" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 font-semibold">
                      <span className="truncate">{tp.user?.displayName}</span>
                      {tp.verificationStatus === 'VERIFIED' && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-amber-500">
                      <Star className="h-3.5 w-3.5 fill" /> {Number(tp.ratingAvg ?? 0).toFixed(1)} · {tp.clientCount ?? 0} clients
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {(tp.specializations ?? []).slice(0, 3).map((s: string) => (
                    <Badge key={s} variant="secondary">{s.replace(/_/g, ' ')}</Badge>
                  ))}
                </div>
                {tp.bio && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{tp.bio}</p>}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm"><span className="font-semibold">{formatMoney(tp.hourlyRateCents ?? 0)}</span> <span className="text-muted-foreground">/session</span></span>
                  <Link href={`/trainers/${tp.user?.id}`}><Button size="sm">View profile</Button></Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
