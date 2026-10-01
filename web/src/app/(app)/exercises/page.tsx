'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Search, Heart } from 'lucide-react';
import { PageHeader, LoadingGrid, EmptyState } from '@/components/common';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useExercises } from '@/lib/hooks';

const categories = ['', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Full Body'];

export default function ExercisesPage() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (cat) query.set('category', cat);
  query.set('limit', '60');

  const { data, isLoading } = useExercises(query.toString());
  const items: any[] = (data as any)?.items ?? (Array.isArray(data) ? data : []);

  return (
    <div>
      <PageHeader title="Exercise Library" subtitle="Browse the movement database with instructions and targets." />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search exercises…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={cat} onChange={(e) => setCat(e.target.value)} className="sm:w-56">
          {categories.map((c) => (
            <option key={c} value={c}>{c || 'All categories'}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <LoadingGrid />
      ) : items.length === 0 ? (
        <EmptyState title="No exercises found" description="Try a different search term or category." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((e) => (
            <Link key={e.id} href={`/exercises/${e.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="font-semibold leading-tight">{e.name}</div>
                    <Heart className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="secondary">{e.difficulty}</Badge>
                    {e.category && <Badge variant="outline">{e.category}</Badge>}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {(e.primaryMuscles ?? []).slice(0, 2).join(', ') || 'Full body'}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
