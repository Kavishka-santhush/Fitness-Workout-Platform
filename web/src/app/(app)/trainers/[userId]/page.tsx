'use client';
import Link from 'next/link';
import { ArrowLeft, Star, BadgeCheck, CalendarCheck } from 'lucide-react';
import { PageHeader } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTrainer, useTrainerAvailability } from '@/lib/hooks';
import { formatMoney } from '@/lib/utils';

export default function TrainerDetailPage({ params }: { params: { userId: string } }) {
  const { data } = useTrainer(params.userId);
  const { data: availability } = useTrainerAvailability(params.userId);
  const tp: any = data ?? {};
  const slots: any[] = (availability as any)?.slots ?? (Array.isArray(availability) ? availability : []);

  return (
    <div>
      <Link href="/trainers" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All coaches
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <Avatar src={tp.user?.avatarUrl} name={tp.user?.displayName} className="h-20 w-20 text-2xl" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{tp.user?.displayName}</h1>
                  {tp.verificationStatus === 'VERIFIED' && <BadgeCheck className="h-5 w-5 text-primary" />}
                </div>
                <div className="mt-1 flex items-center gap-1 text-sm text-amber-500">
                  <Star className="h-4 w-4 fill" /> {Number(tp.ratingAvg ?? 0).toFixed(1)} · {tp.ratingCount ?? 0} reviews · {tp.clientCount ?? 0} clients
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(tp.specializations ?? []).map((s: string) => <Badge key={s} variant="secondary">{s.replace(/_/g, ' ')}</Badge>)}
                </div>
              </div>
            </CardContent>
          </Card>

          {tp.bio && (
            <Card className="mt-4"><CardContent className="p-6"><p className="text-sm text-muted-foreground">{tp.bio}</p></CardContent></Card>
          )}
        </div>

        <div>
          <Card className="sticky top-20">
            <CardHeader><CardTitle>Book a session</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm"><span className="text-2xl font-bold">{formatMoney(tp.hourlyRateCents ?? 0)}</span> <span className="text-muted-foreground">/session</span></p>
              <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                {slots.length ? slots.slice(0, 12).map((s: any) => (
                  <button key={s.id ?? s.startAt} className="flex w-full items-center gap-2 rounded-lg border p-2 text-left text-sm hover:bg-accent">
                    <CalendarCheck className="h-4 w-4 text-primary" />
                    {new Date(s.startAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </button>
                )) : <p className="text-sm text-muted-foreground">No open slots right now.</p>}
              </div>
              <Button className="mt-4 w-full" disabled={!tp.user?.id}>Request booking</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
