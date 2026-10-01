import { Check } from 'lucide-react';
import { SignInButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    highlight: false,
    features: ['3 workouts / month', '5 food-logging days / month', '3 AI requests / day', '500 MB storage', 'Community access'],
    cta: 'Start free',
  },
  {
    name: 'Premium',
    price: '$12',
    period: '/month',
    highlight: true,
    features: ['Unlimited workouts', 'Unlimited food logging', '500 AI requests / day', '20 GB storage', 'All programs & live classes', 'Advanced progress analytics'],
    cta: 'Go Premium',
  },
  {
    name: 'Coach',
    price: '$29',
    period: '/month',
    highlight: false,
    features: ['Everything in Premium', 'Sell programs & 1:1 bookings', 'Live class hosting', 'Analytics dashboard', 'Payouts via Stripe'],
    cta: 'Become a coach',
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="secondary">Pricing</Badge>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">Simple, honest pricing</h1>
        <p className="mt-3 text-muted-foreground">Start free. Upgrade when you are ready to go all-in.</p>
      </div>

      <div className="mt-14 grid gap-8 lg:grid-cols-3">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`relative flex flex-col rounded-2xl border bg-card p-8 shadow-sm ${
              t.highlight ? 'border-primary ring-2 ring-primary/20 lg:-mt-4 lg:mb-4' : ''
            }`}
          >
            {t.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                Most popular
              </span>
            )}
            <h3 className="text-lg font-semibold">{t.name}</h3>
            <div className="mt-4 flex items-baseline">
              <span className="text-4xl font-extrabold tracking-tight">{t.price}</span>
              <span className="ml-1 text-sm text-muted-foreground">{t.period}</span>
            </div>
            <ul className="mt-6 flex-1 space-y-3 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <SignInButton mode="modal">
              <Button className="mt-8 w-full" variant={t.highlight ? 'default' : 'outline'}>{t.cta}</Button>
            </SignInButton>
          </div>
        ))}
      </div>
    </div>
  );
}
