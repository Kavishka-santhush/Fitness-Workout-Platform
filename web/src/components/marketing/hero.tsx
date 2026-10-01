'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, PlayCircle } from 'lucide-react';
import { SignInButton, SignedOut } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(22,163,74,0.15),transparent)]" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium">
            <span className="h-2 w-2 rounded-full bg-primary" /> New: AI Coach & Live Classes
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Train. Track. <span className="text-primary">Transform.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            The all-in-one fitness platform — structured programs, nutrition tracking, live classes, and a global community of athletes and coaches.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <SignedOut>
              <SignInButton mode="modal">
                <Button size="lg">
                  Get started free <ArrowRight className="h-4 w-4" />
                </Button>
              </SignInButton>
            </SignedOut>
            <Link href="/pricing">
              <Button size="lg" variant="outline">View pricing</Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative"
        >
          <div className="aspect-square rounded-3xl border bg-gradient-to-br from-card to-muted p-6 shadow-2xl">
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-muted-foreground">
              <PlayCircle className="h-16 w-16 text-primary" />
              <p className="text-sm">Your dashboard preview</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
