"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Dumbbell,
  Apple,
  Moon,
  Flame,
  Zap,
  TrendingUp,
  CheckCircle2,
  Clock,
  Activity,
} from "lucide-react";
import Link from "next/link";
import type { Database } from "@/types/database";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type WorkoutRow = Database["public"]["Tables"]["workouts"]["Row"];
type NutritionLogRow = Database["public"]["Tables"]["nutrition_logs"]["Row"];
type SleepLogRow = Database["public"]["Tables"]["sleep_logs"]["Row"];

interface TodayStatus {
  workoutLogged: boolean;
  nutritionLogged: boolean;
  sleepLogged: boolean;
}

interface RecentActivity {
  id: string;
  type: "workout" | "nutrition" | "sleep" | "achievement" | "xp";
  title: string;
  subtitle: string;
  timestamp: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export default function DashboardPage() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [user, setUser] = useState<UserRow | null>(null);
  const [todayStatus, setTodayStatus] = useState<TodayStatus>({
    workoutLogged: false,
    nutritionLogged: false,
    sleepLogged: false,
  });
  const [streak, setStreak] = useState(0);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      // Load user data
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();
      if (userData) setUser(userData as unknown as UserRow);

      // Check today's activity status
      const today = new Date().toISOString().split("T")[0];

      const { data: todaysWorkouts } = await supabase
        .from("workouts")
        .select("id")
        .eq("user_id", authUser.id)
        .gte("created_at", today);

      const { data: todaysNutrition } = await supabase
        .from("nutrition_logs")
        .select("id")
        .eq("user_id", authUser.id)
        .gte("logged_at", today);

      const { data: todaysSleep } = await supabase
        .from("sleep_logs")
        .select("id")
        .eq("user_id", authUser.id)
        .eq("date", today);

      setTodayStatus({
        workoutLogged: (todaysWorkouts?.length ?? 0) > 0,
        nutritionLogged: (todaysNutrition?.length ?? 0) > 0,
        sleepLogged: (todaysSleep?.length ?? 0) > 0,
      });

      // Load streak
      const { data: streakData } = await supabase
        .from("streaks")
        .select("current_count")
        .eq("user_id", authUser.id)
        .eq("streak_type", "workout")
        .single();

      if (streakData) setStreak((streakData as any).current_count);

      // Load recent activities
      const recent: RecentActivity[] = [];

      const { data: recentWorkouts } = await supabase
        .from("workouts")
        .select("*")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(3);

      (recentWorkouts as unknown as WorkoutRow[])?.forEach((w) => {
        recent.push({
          id: w.id,
          type: "workout",
          title: w.name,
          subtitle: `${w.category} · ${w.duration_minutes} min${w.xp_earned ? ` · +${w.xp_earned} XP` : ""}`,
          timestamp: w.created_at,
          icon: Dumbbell,
          color: "text-emerald-400",
        });
      });

      const { data: recentNutrition } = await supabase
        .from("nutrition_logs")
        .select("*")
        .eq("user_id", authUser.id)
        .order("logged_at", { ascending: false })
        .limit(3);

      (recentNutrition as unknown as NutritionLogRow[])?.forEach((n) => {
        recent.push({
          id: n.id,
          type: "nutrition",
          title: `Meal: ${n.meal_type}`,
          subtitle: `${n.total_calories} cal · P:${n.total_protein_g}g C:${n.total_carbs_g}g F:${n.total_fat_g}g`,
          timestamp: n.logged_at,
          icon: Apple,
          color: "text-orange-400",
        });
      });

      const { data: recentSleep } = await supabase
        .from("sleep_logs")
        .select("*")
        .eq("user_id", authUser.id)
        .order("date", { ascending: false })
        .limit(3);

      (recentSleep as unknown as SleepLogRow[])?.forEach((s) => {
        recent.push({
          id: s.id,
          type: "sleep",
          title: `${s.hours_slept}h sleep`,
          subtitle: `Quality: ${s.quality_rating ?? "N/A"}/5`,
          timestamp: s.date,
          icon: Moon,
          color: "text-blue-400",
        });
      });

      recent.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setActivities(recent.slice(0, 10));
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const xpForNextLevel = (level: number) => level * 100;
  const xpProgress = user
    ? ((user.xp % 100) / 100) * 100
    : 0;

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <div className="text-zinc-500">Loading dashboard...</div>
        </div>
      </AppShell>
    );
  }

  const completedCount = [
    todayStatus.workoutLogged,
    todayStatus.nutritionLogged,
    todayStatus.sleepLogged,
  ].filter(Boolean).length;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">
          Welcome back{user?.display_name ? `, ${user.display_name}` : ""}
        </h1>
        <p className="text-zinc-400">Here&apos;s your fitness overview</p>
      </div>

      {/* XP & Streak Row */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Zap className="h-4 w-4 text-amber-500" />
              Experience Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-amber-400">
                {user?.xp ?? 0}
              </span>
              <span className="text-sm text-zinc-500">XP</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
              <span>Level {user?.level ?? 1}</span>
              <Progress value={xpProgress} className="h-1.5 flex-1" />
              <span>{xpForNextLevel(user?.level ?? 1)} XP</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Flame className="h-4 w-4 text-orange-500" />
              Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-orange-400">
                {streak}
              </span>
              <span className="text-sm text-zinc-500">days</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {streak > 0
                ? "Keep the momentum going!"
                : "Start a new streak today!"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Today&apos;s Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-400">
                {completedCount}
              </span>
              <span className="text-sm text-zinc-500">/ 3 logged</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Activity Status */}
      <Card className="mb-6 border-zinc-800 bg-zinc-900/80">
        <CardHeader>
          <CardTitle className="text-white">Today&apos;s Activity</CardTitle>
          <CardDescription>Quick overview of what you&apos;ve logged today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div
              className={`flex items-center gap-3 rounded-lg border p-4 ${
                todayStatus.workoutLogged
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-zinc-800 bg-zinc-900/50"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  todayStatus.workoutLogged
                    ? "bg-emerald-500/20"
                    : "bg-zinc-800"
                }`}
              >
                <Dumbbell
                  className={`h-5 w-5 ${
                    todayStatus.workoutLogged
                      ? "text-emerald-400"
                      : "text-zinc-500"
                  }`}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Workout</p>
                <p className="text-xs text-zinc-500">
                  {todayStatus.workoutLogged ? "Logged" : "Not yet"}
                </p>
              </div>
              {todayStatus.workoutLogged && (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              )}
            </div>

            <div
              className={`flex items-center gap-3 rounded-lg border p-4 ${
                todayStatus.nutritionLogged
                  ? "border-orange-500/30 bg-orange-500/5"
                  : "border-zinc-800 bg-zinc-900/50"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  todayStatus.nutritionLogged
                    ? "bg-orange-500/20"
                    : "bg-zinc-800"
                }`}
              >
                <Apple
                  className={`h-5 w-5 ${
                    todayStatus.nutritionLogged
                      ? "text-orange-400"
                      : "text-zinc-500"
                  }`}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Nutrition</p>
                <p className="text-xs text-zinc-500">
                  {todayStatus.nutritionLogged ? "Logged" : "Not yet"}
                </p>
              </div>
              {todayStatus.nutritionLogged && (
                <CheckCircle2 className="h-5 w-5 text-orange-500" />
              )}
            </div>

            <div
              className={`flex items-center gap-3 rounded-lg border p-4 ${
                todayStatus.sleepLogged
                  ? "border-blue-500/30 bg-blue-500/5"
                  : "border-zinc-800 bg-zinc-900/50"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  todayStatus.sleepLogged
                    ? "bg-blue-500/20"
                    : "bg-zinc-800"
                }`}
              >
                <Moon
                  className={`h-5 w-5 ${
                    todayStatus.sleepLogged
                      ? "text-blue-400"
                      : "text-zinc-500"
                  }`}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Sleep</p>
                <p className="text-xs text-zinc-500">
                  {todayStatus.sleepLogged ? "Logged" : "Not yet"}
                </p>
              </div>
              {todayStatus.sleepLogged && (
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Link href="/workouts/new">
          <Button variant="outline" className="w-full border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 focus-visible:ring-emerald-500">
            <Dumbbell className="mr-2 h-4 w-4" />
            Log Workout
          </Button>
        </Link>
        <Link href="/nutrition">
          <Button variant="outline" className="w-full border-orange-500/30 bg-orange-500/5 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 focus-visible:ring-orange-500">
            <Apple className="mr-2 h-4 w-4" />
            Log Meal
          </Button>
        </Link>
        <Link href="/sleep">
          <Button variant="outline" className="w-full border-blue-500/30 bg-blue-500/5 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 focus-visible:ring-blue-500">
            <Moon className="mr-2 h-4 w-4" />
            Log Sleep
          </Button>
        </Link>
      </div>

      {/* Recent Activity */}
      <Card className="border-zinc-800 bg-zinc-900/80">
        <CardHeader>
          <CardTitle className="text-white">Recent Activity</CardTitle>
          <CardDescription>Your latest fitness activities</CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Activity className="h-8 w-8 text-zinc-700" />
              <p className="text-sm text-zinc-500">No activity yet</p>
              <p className="text-xs text-zinc-600">
                Start by logging your first workout, meal, or sleep session
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id + activity.type}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800 p-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800">
                    <activity.icon className={`h-4 w-4 ${activity.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {activity.subtitle}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-600 whitespace-nowrap">
                    {new Date(activity.timestamp).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
