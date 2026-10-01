'use client';
import { Users, DollarSign, Activity, ShieldAlert, Dumbbell, Utensils } from 'lucide-react';
import { PageHeader, StatCard, EmptyState } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendChart } from '@/components/charts';
import { useGet } from '@/lib/hooks';
import { formatMoney, formatRelative } from '@/lib/utils';

export default function AdminDashboardPage() {
  const { data } = useGet<any>(['admin', 'dashboard'], '/admin/dashboard');
  const { data: reports } = useGet<any>(['admin', 'reports'], '/admin/reports');
  const { data: pending } = useGet<any>(['admin', 'trainers-pending'], '/admin/trainers/pending');
  const d: any = data ?? {};

  const growth: any[] = d.signupsByMonth ?? d.growth ?? d.userGrowth ?? [];
  const revenue: any[] = d.revenueByMonth ?? d.revenue ?? [];
  const reportList: any[] = (reports as any)?.items ?? (Array.isArray(reports) ? reports : []);
  const pendingList: any[] = (pending as any)?.items ?? (Array.isArray(pending) ? pending : []);

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="Platform health, growth, and moderation." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total users" value={(d.totalUsers ?? 0).toLocaleString()} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Active (30d)" value={(d.activeUsers ?? 0).toLocaleString()} icon={<Activity className="h-5 w-5" />} />
        <StatCard label="MRR" value={formatMoney(d.mrrCents ?? 0)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Workouts" value={(d.totalWorkouts ?? 0).toLocaleString()} icon={<Dumbbell className="h-5 w-5" />} />
        <StatCard label="Foods" value={(d.totalFoods ?? 0).toLocaleString()} icon={<Utensils className="h-5 w-5" />} />
        <StatCard label="Open reports" value={reportList.length} icon={<ShieldAlert className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>User growth</CardTitle></CardHeader>
          <CardContent>{growth.length ? <TrendChart data={growth.map((g) => ({ label: g.month ?? g.label, value: g.count ?? g.users ?? g.value }))} /> : <EmptyState title="No growth data" />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Revenue</CardTitle></CardHeader>
          <CardContent>{revenue.length ? <TrendChart type="bar" data={revenue.map((r) => ({ label: r.month ?? r.label, value: r.revenueCents ?? r.amount ?? r.value }))} color="#0ea5e9" /> : <EmptyState title="No revenue data" />}</CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reports" className="mt-6">
        <TabsList>
          <TabsTrigger value="reports">Content reports</TabsTrigger>
          <TabsTrigger value="trainers">Trainer applications</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-4">
          <Card><CardContent className="p-2">
            {reportList.length ? reportList.map((r) => (
              <div key={r.id} className="flex items-center justify-between border-b p-3 text-sm last:border-0">
                <div><p className="font-medium">{r.reason}</p><p className="text-xs text-muted-foreground">{formatRelative(r.createdAt)} · {r.targetType}</p></div>
                <Button size="sm" variant="outline">Resolve</Button>
              </div>
            )) : <EmptyState title="No open reports" />}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="trainers" className="mt-4">
          <Card><CardContent className="p-2">
            {pendingList.length ? pendingList.map((t) => (
              <div key={t.id} className="flex items-center justify-between border-b p-3 text-sm last:border-0">
                <div className="flex items-center gap-2">
                  <Badge variant="warning">Pending</Badge>
                  <span className="font-medium">{t.user?.displayName ?? 'Applicant'}</span>
                </div>
                <div className="flex gap-2"><Button size="sm" variant="ghost">Reject</Button><Button size="sm">Approve</Button></div>
              </div>
            )) : <EmptyState title="No pending applications" />}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
