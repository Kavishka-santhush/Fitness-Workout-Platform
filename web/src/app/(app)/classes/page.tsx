'use client';
import Link from 'next/link';
import { Clock, Users, Radio, PlayCircle } from 'lucide-react';
import { PageHeader, LoadingGrid, EmptyState } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLiveClasses } from '@/lib/hooks';
import { formatMoney, formatDate } from '@/lib/utils';

export default function ClassesPage() {
  const { data, isLoading } = useLiveClasses('status=SCHEDULED&limit=40');
  const items: any[] = (data as any)?.items ?? (Array.isArray(data) ? data : []);

  return (
    <div>
      <PageHeader title="Live Classes" subtitle="Join real-time coached sessions or catch replays." />
      {isLoading ? (
        <LoadingGrid />
      ) : items.length === 0 ? (
        <EmptyState title="No upcoming classes" description="Check back soon — coaches publish schedules weekly." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Card key={c.id} className="overflow-hidden transition-shadow hover:shadow-md">
              <div className="flex h-28 items-center justify-center bg-gradient-to-br from-sky-500/20 to-primary/10">
                {c.status === 'LIVE' ? <Radio className="h-10 w-10 text-red-500" /> : <PlayCircle className="h-10 w-10 text-primary/60" />}
              </div>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold leading-tight">{c.title}</h3>
                  {c.status === 'LIVE' && <Badge variant="destructive">LIVE</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{c.trainer?.displayName}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {c.durationMin} min</span>
                  <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {c.attendeeCount ?? 0}/{c.maxParticipants}</span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{formatDate(c.scheduledAt)}</span>
                  <Link href={`/classes/${c.id}`}><Button size="sm">{c.priceCents ? formatMoney(c.priceCents) : 'Join'}</Button></Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
