'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [step] = React.useState(0);
  const [form, setForm] = React.useState({ sex: 'MALE', goal: 'GENERAL_FITNESS', experience: 'BEGINNER', units: 'METRIC', heightCm: '', weightKg: '', birthYear: '' });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const finish = async () => {
    try {
      const token = await getToken();
      await api.post('/auth/onboarding', { ...form, heightCm: Number(form.heightCm) || undefined, weightKg: Number(form.weightKg) || undefined, birthYear: Number(form.birthYear) || undefined }, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch { /* continue to dashboard even if onboarding sync fails */ }
    router.push('/dashboard');
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Welcome{user?.firstName ? `, ${user.firstName}` : ''}! 👋</CardTitle>
          <p className="text-sm text-muted-foreground">Tell us about yourself so we can tailor your plan.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row>
            <Select value={form.sex} onChange={(e) => set('sex', e.target.value)}>
              <option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
            </Select>
            <Select value={form.units} onChange={(e) => set('units', e.target.value)}>
              <option value="METRIC">Metric (kg/cm)</option><option value="IMPERIAL">Imperial (lb/in)</option>
            </Select>
          </Row>
          <Row>
            <Input placeholder="Height (cm)" value={form.heightCm} onChange={(e) => set('heightCm', e.target.value)} />
            <Input placeholder="Weight (kg)" value={form.weightKg} onChange={(e) => set('weightKg', e.target.value)} />
          </Row>
          <Select value={form.goal} onChange={(e) => set('goal', e.target.value)}>
            <option value="GENERAL_FITNESS">Goal: General fitness</option>
            <option value="MUSCLE_GAIN">Goal: Build muscle</option>
            <option value="FAT_LOSS">Goal: Lose fat</option>
            <option value="STRENGTH">Goal: Get stronger</option>
            <option value="ENDURANCE">Goal: Improve endurance</option>
          </Select>
          <Select value={form.experience} onChange={(e) => set('experience', e.target.value)}>
            <option value="BEGINNER">Experience: Beginner</option>
            <option value="INTERMEDIATE">Experience: Intermediate</option>
            <option value="ADVANCED">Experience: Advanced</option>
          </Select>
          <Button className="w-full" onClick={finish}>Finish & go to dashboard</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}
