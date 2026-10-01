import Link from 'next/link';
import { Sparkles, UtensilsCrossed, Users, Trophy, Video, Bot, Activity, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hero } from '@/components/marketing/hero';

const features = [
  { icon: Activity, title: 'Guided Workouts', desc: 'Build, log, and auto-progress workouts with PRs, supersets, and circuits.' },
  { icon: Sparkles, title: 'Structured Programs', desc: '10+ multi-week blueprints for strength, hypertrophy, HIIT, and more.' },
  { icon: UtensilsCrossed, title: 'Nutrition Tracking', desc: '1000+ food database, macro targets, water logging, and meal plans.' },
  { icon: Bot, title: 'AI Coach', desc: 'Personalized plans, form checks, calorie estimation, and accountability.' },
  { icon: Video, title: 'Live Classes', desc: 'Join real-time coached sessions with chat and replay on-demand.' },
  { icon: Users, title: 'Community', desc: 'Follow athletes, share posts, join groups, and stay accountable.' },
  { icon: Trophy, title: 'Challenges & Leaderboards', desc: 'Compete in team and solo challenges with live rankings.' },
  { icon: ShieldCheck, title: 'Coach Marketplace', desc: 'Book certified trainers and nutritionists with secure payments.' },
];

export default function LandingPage() {
  return (
    <>
      <Hero />

      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary">Everything in one place</Badge>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Built for every athlete</h2>
          <p className="mt-3 text-muted-foreground">
            From your first push-up to your hundredth PR — training, nutrition, coaching, and community, unified.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/40">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-16 text-center sm:px-6 lg:grid-cols-4">
          {[
            ['200+', 'Exercises'],
            ['1000+', 'Foods'],
            ['74', 'Data models'],
            ['24/7', 'AI coaching'],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="text-4xl font-extrabold tracking-tight text-primary">{n}</div>
              <div className="mt-2 text-sm text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-emerald-700 px-8 py-16 text-center text-white shadow-xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Start your transformation today</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">
            Join free — 3 workouts, food logging, and daily AI coaching. Upgrade anytime for unlimited everything.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/sign-up">
              <Button size="lg" variant="secondary">Create free account</Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/10">See pricing</Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
