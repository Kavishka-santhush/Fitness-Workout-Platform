'use client';
import { Users, DollarSign, CalendarCheck, MessageSquare } from 'lucide-react';
import { PageHeader, StatCard, EmptyState } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendChart } from '@/components/charts';
import { useGet } from '@/lib/hooks';
import { formatMoney } from '@/lib/utils';

export default function CoachDashboardPage() {
  const { data } = useGet<any>(['coach', 'dashboard'], '/trainers/me/dashboard');
  const d: any = data ?? {};
  const revenue: any[] = d.revenueByMonth ?? d.revenue ?? [];
  const bookings: any[] = d.upcomingBookings ?? d.bookings ?? [];
  const clients: any[] = d.recentClients ?? d.clients ?? [];

  return (
    <div>
      <PageHeader
        title="Coach Studio"
        subtitle="Your business at a glance."
        actions={<Button>Add availability</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Clients" value={d.activeClients ?? clients.length} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Revenue (mo)" value={formatMoney(d.monthlyRevenueCents ?? 0)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Sessions booked" value={d.upcomingCount ?? bookings.length} icon={<CalendarCheck className="h-5 w-5" />} />
        <StatCard label="Unread messages" value={d.unreadMessages ?? 0} icon={<MessageSquare className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Revenue</CardTitle></CardHeader>
          <CardContent>
            {revenue.length ? <TrendChart type="bar" data={revenue.map((r) => ({ label: r.month ?? r.label, value: r.revenueCents ?? r.total ?? r.value }))} /> : <EmptyState title="No revenue data yet" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Upcoming sessions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {bookings.length ? bookings.slice(0, 6).map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div><p className="font-medium">{b.client?.displayName ?? 'Client'}</p><p className="text-xs text-muted-foreground">{new Date(b.startAt).toLocaleString()}</p></div>
                <Badge variant="secondary">{b.status}</Badge>
              </div>
            )) : <EmptyState title="Nothing booked" />}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Recent clients</CardTitle></CardHeader>
        <CardContent>
          {clients.length ? (
            <div className="divide-y">
              {clients.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-medium">{c.user?.displayName ?? c.name ?? 'Client'}</span>
                  <span className="text-muted-foreground">{c.program?.name ?? 'General coaching'}</span>
                </div>
              ))}
            </div>
          ) : <EmptyState title="No clients yet" description="Share your profile to start getting bookings." />}
        </CardContent>
      </Card>
    </div>
  );
}
