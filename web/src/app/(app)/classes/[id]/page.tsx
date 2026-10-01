'use client';
import Link from 'next/link';
import { ArrowLeft, Clock, Users, Radio, CalendarDays } from 'lucide-react';
import { PageHeader } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { useLiveClass, useEnrollClass } from '@/lib/hooks';
import { formatMoney } from '@/lib/utils';

export default function ClassDetailPage({ params }: { params: { id: string } }) {
  const { data } = useLiveClass(params.id);
  const enroll = useEnrollClass(params.id);
  const c: any = data ?? {};
  const isLive = c.status === 'LIVE';

  return (
    <div>
      <Link href="/classes" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All classes
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-black">
            {isLive ? (
              <>
                <div className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white"><Radio className="h-3.5 w-3.5" /> LIVE</div>
                <p className="text-white/60">Live stream placeholder</p>
              </>
            ) : (
              <div className="flex flex-col items-center text-muted-foreground"><CalendarDays className="h-12 w-12" /><p className="mt-2 text-sm">Starts {new Date(c.scheduledAt).toLocaleString()}</p></div>
            )}
          </div>

          <PageHeader title={c.title ?? 'Class'} className="mt-6" />
          <Card><CardContent className="p-5 text-sm text-muted-foreground">
            <p>{c.description ?? 'A coached live session. Bring water, a towel, and your favorite playlist.'}</p>
          </CardContent></Card>

          {c.chat?.length ? (
            <Card className="mt-4">
              <CardHeader><CardTitle>Class chat</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {c.chat.map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm"><Avatar name={m.user?.displayName} className="h-7 w-7 text-xs" /><span><b>{m.user?.displayName}:</b> {m.text}</span></div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div>
          <Card className="sticky top-20"><CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <Avatar src={c.trainer?.avatarUrl} name={c.trainer?.displayName} />
              <div><p className="text-sm font-semibold">{c.trainer?.displayName}</p><p className="text-xs text-muted-foreground">Lead coach</p></div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {c.durationMin} min</span>
              <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {c.attendeeCount ?? 0}/{c.maxParticipants}</span>
            </div>
            <Badge variant="secondary">{c.classType}</Badge>
            <Button className="w-full" onClick={() => enroll.mutate({})} disabled={enroll.isPending}>
              {isLive ? 'Join now' : c.priceCents ? `Book · ${formatMoney(c.priceCents)}` : 'Reserve spot'}
            </Button>
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}
