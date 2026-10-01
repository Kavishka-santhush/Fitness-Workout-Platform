'use client';
import { useUser } from '@clerk/nextjs';
import { PageHeader } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAchievements, useNotifications, usePlans } from '@/lib/hooks';

export default function ProfilePage() {
  const { user } = useUser();
  const { data: achievements } = useAchievements();
  const { data: notifications } = useNotifications();
  const { data: plans } = usePlans();
  const badges: any[] = (achievements as any)?.items ?? (Array.isArray(achievements) ? achievements : []);
  const notifs: any[] = (notifications as any)?.items ?? (Array.isArray(notifications) ? notifications : []);
  const planList: any[] = (plans as any)?.items ?? (Array.isArray(plans) ? plans : []);

  return (
    <div>
      <PageHeader title="Profile & Settings" />

      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <Avatar src={user?.imageUrl} name={user?.fullName} className="h-16 w-16 text-xl" />
          <div>
            <h2 className="text-xl font-bold">{user?.fullName || user?.username}</h2>
            <p className="text-sm text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
            <div className="mt-2 flex gap-2">
              <Badge variant="secondary">{user?.publicMetadata?.role as string || 'MEMBER'}</Badge>
              <Badge variant="success">{(user?.publicMetadata?.subscription as string) || 'FREE'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="settings" className="mt-6">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="plan">Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-4">
          <Card><CardContent className="space-y-4 p-6">
            <Field label="Display name" defaultValue={user?.fullName ?? ''} />
            <Field label="Username" defaultValue={user?.username ?? ''} />
            <Field label="Bio" defaultValue={(user?.publicMetadata?.bio as string) ?? ''} />
            <Button>Save changes</Button>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="badges" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {badges.length ? badges.map((b) => (
              <Card key={b.id}><CardContent className="p-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-2xl">🏅</div>
                <p className="mt-2 text-sm font-semibold">{b.achievement?.name ?? b.name}</p>
                <p className="text-xs text-muted-foreground">{b.achievement?.category}</p>
              </CardContent></Card>
            )) : <p className="text-sm text-muted-foreground">No badges yet — keep training!</p>}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card><CardContent className="divide-y p-2">
            {notifs.length ? notifs.map((n) => (
              <div key={n.id} className="flex items-center justify-between p-3 text-sm">
                <span>{n.title} — <span className="text-muted-foreground">{n.body}</span></span>
                <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleDateString()}</span>
              </div>
            )) : <p className="p-3 text-sm text-muted-foreground">No notifications.</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="plan" className="mt-4">
          <Card><CardContent className="space-y-3 p-6">
            <p className="text-sm text-muted-foreground">Manage your subscription plan.</p>
            {planList.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border p-4">
                <div><p className="font-semibold">{p.name}</p><p className="text-sm text-muted-foreground">{p.priceCents ? `$${(p.priceCents / 100)}/mo` : 'Free'}</p></div>
                <Button size="sm" variant="outline">Select</Button>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <Input defaultValue={defaultValue} className="mt-1" />
    </div>
  );
}
