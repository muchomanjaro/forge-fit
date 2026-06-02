import Link from "next/link";
import { Flame, Dumbbell, Apple, Moon, TrendingUp, Trophy, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: Dumbbell,
    title: "Workout Tracking",
    description: "Log every rep, set, and weight. Track cardio, strength, and flexibility sessions.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Apple,
    title: "Nutrition Logging",
    description: "Track calories and macros. Log meals across breakfast, lunch, dinner, and snacks.",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    icon: Moon,
    title: "Sleep Tracking",
    description: "Monitor sleep quality and duration. Build better sleep habits over time.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: TrendingUp,
    title: "Trends & Charts",
    description: "Visualize your progress with weight trends, workout frequency, and macro breakdowns.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    icon: Trophy,
    title: "Gamification",
    description: "Earn XP, level up, unlock achievements, and build streaks. Stay motivated.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
];

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with basic tracking.",
    features: [
      "Log workouts & exercises",
      "Basic nutrition tracking",
      "Sleep logging (3 days history)",
      "1 achievement badge",
      "Community access",
    ],
    cta: "Get Started Free",
    href: "/auth/register",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$9.99",
    period: "/month",
    description: "Full fitness gamification experience.",
    features: [
      "Unlimited workout logging",
      "Full macro & calorie tracking",
      "Unlimited sleep history",
      "All achievement badges",
      "Advanced charts & trends",
      "XP multipliers",
      "Priority support",
    ],
    cta: "Start Pro Trial",
    href: "/auth/register?plan=pro",
    highlighted: true,
  },
  {
    name: "Pro Annual",
    price: "$7.49",
    period: "/month",
    description: "Best value — save 25% yearly.",
    features: [
      "Everything in Pro",
      "25% discount",
      "Early access to new features",
      "Custom goal coaching",
      "Data export",
    ],
    cta: "Go Annual",
    href: "/auth/register?plan=annual",
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500">
              <Flame className="h-5 w-5 text-zinc-950" />
            </div>
            <span className="text-lg font-bold text-white">Forge Fit</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded-lg px-2 py-1"
            >
              Log in
            </Link>
            <Link href="/auth/register">
              <Button size="sm">Sign Up Free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-4 pt-20 pb-24 sm:px-6 lg:px-8 lg:pt-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-amber-500/5 blur-3xl" />
          <div className="absolute -bottom-40 left-0 h-[400px] w-[400px] rounded-full bg-emerald-500/5 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-3xl text-center">
          <Badge variant="default" className="mb-6">
            <Sparkles className="mr-1 h-3 w-3" />
            Gamified Fitness Tracking
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Level Up Your{" "}
            <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
              Fitness Journey
            </span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-400">
            Forge Fit turns your health routine into a game. Track workouts, nutrition, and sleep.
            Earn XP, unlock achievements, and build streaks — all in one beautiful dashboard.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/auth/register">
              <Button size="lg" className="text-base">
                Start Forging Free
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="text-base focus-visible:ring-amber-500">
                See Features
              </Button>
            </Link>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-zinc-500">
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-emerald-500" /> No credit card
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-emerald-500" /> Free forever
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-emerald-500" /> Cancel anytime
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-zinc-800 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Everything you need to forge your best self
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              All the tools to track, analyze, and gamify your health journey.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="border-zinc-800 bg-zinc-900/50">
                <CardHeader>
                  <div
                    className={`mb-2 flex h-12 w-12 items-center justify-center rounded-lg ${feature.bg}`}
                  >
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-white">{feature.title}</CardTitle>
                  <CardDescription className="text-zinc-400">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-zinc-800 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              Start free. Upgrade when you&apos;re ready for the full experience.
            </p>
          </div>
          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {tiers.map((tier) => (
              <Card
                key={tier.name}
                className={`relative border ${
                  tier.highlighted
                    ? "border-amber-500/50 bg-zinc-900 shadow-lg shadow-amber-500/5"
                    : "border-zinc-800 bg-zinc-900/50"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-amber-500 text-zinc-950 hover:bg-amber-500">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-white">{tier.name}</CardTitle>
                  <CardDescription className="text-zinc-400">
                    {tier.description}
                  </CardDescription>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">{tier.price}</span>
                    <span className="text-sm text-zinc-500">{tier.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {tier.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-sm text-zinc-400">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href={tier.href} className="w-full">
                    <Button
                      variant={tier.highlighted ? "default" : "outline"}
                      className="w-full"
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-800 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to forge your best self?
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Join thousands of users leveling up their fitness. Start for free, no strings attached.
          </p>
          <div className="mt-8">
            <Link href="/auth/register">
              <Button size="lg" className="text-base">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <Link href="/" className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded-lg">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500">
                <Flame className="h-4 w-4 text-zinc-950" />
              </div>
              <span className="text-sm font-bold text-white">Forge Fit</span>
            </Link>
            <div className="flex gap-6 text-sm text-zinc-500">
              <Link href="#" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded px-1">Privacy</Link>
              <Link href="#" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded px-1">Terms</Link>
              <Link href="#" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded px-1">Contact</Link>
            </div>
            <p className="text-xs text-zinc-600">
              &copy; {new Date().getFullYear()} Forge Fit. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
