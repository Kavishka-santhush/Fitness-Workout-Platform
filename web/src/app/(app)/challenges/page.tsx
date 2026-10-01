'use client';
import { Trophy, Users, Target, CalendarDays } from 'lucide-react';
import { PageHeader, LoadingGrid, EmptyState } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useChallenges, useEnrollChallenge } from '@/lib/hooks';
import { formatDate } from '@/lib/utils';

export default function ChallengesPage() {
  const { data, isLoading } = useChallenges('active=true&limit=30');
  const items: any[] = (data as any)?.items ?? (Array.isArray(data) ? data : []);

  return (
    <div>
      <PageHeader title="Challenges" subtitle="Compete with the community in solo and team challenges." />
      {isLoading ? (
        <LoadingGrid />
      ) : items.length === 0 ? (
        <EmptyState title="No active challenges" description="New challenges launch regularly." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => <ChallengeCard key={c.id} c={c} />)}
        </div>
      )}
    </div>
  );
}

function ChallengeCard({ c }: { c: any }) {
  const enroll = useEnrollChallenge(c.id);
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500"><Trophy className="h-5 w-5" /></span>
            <h3 className="font-semibold leading-tight">{c.title}</h3>
          </div>
          <Badge variant="secondary">{c.scope}</Badge>
        </div>
        {c.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Target className="h-3.5 w-3.5" /> {c.goalValue} {c.goalUnit}</span>
          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {c.participantCount ?? 0}</span>
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {formatDate(c.endDate)}</span>
        </div>
        {c.myProgress != null && <Progress value={Math.min(100, (c.myProgress / (c.goalValue || 1)) * 100)} className="mt-3" />}
        <Button className="mt-4 w-full" size="sm" onClick={() => enroll.mutate({})} disabled={enroll.isPending || c.enrolled}>
          {c.enrolled ? 'Enrolled ✓' : enroll.isPending ? 'Joining…' : 'Join challenge'}
        </Button>
      </CardContent>
    </Card>
  );
}
