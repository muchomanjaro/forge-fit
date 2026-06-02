"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Dumbbell, Clock, Zap } from "lucide-react";
import type { Database } from "@/types/database";

type Workout = Database["public"]["Tables"]["workouts"]["Row"];

const categoryColors: Record<string, "green" | "default" | "blue"> = {
  strength: "green",
  cardio: "default",
  flexibility: "blue",
};

export default function WorkoutsPage() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("workouts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setWorkouts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Workouts</h1>
          <p className="text-zinc-400">Track your training sessions</p>
        </div>
        <Link href="/workouts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Workout
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="py-12 text-center text-zinc-500">Loading workouts...</div>
      ) : workouts.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/80">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Dumbbell className="h-10 w-10 text-zinc-700" />
            <p className="text-zinc-400">No workouts yet</p>
            <p className="text-xs text-zinc-600">
              Log your first workout to start earning XP
            </p>
            <Link href="/workouts/new">
              <Button size="sm" className="mt-2">
                <Plus className="mr-1 h-4 w-4" />
                Log Workout
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workouts.map((workout) => (
            <Link key={workout.id} href={`/workouts/${workout.id}`}>
              <Card className="border-zinc-800 bg-zinc-900/80 transition-colors hover:border-zinc-700">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Badge
                      variant={categoryColors[workout.category] || "secondary"}
                      className="mb-2"
                    >
                      {workout.category}
                    </Badge>
                    {workout.completed_at ? (
                      <Badge variant="green" className="text-[10px]">
                        Done
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        In Progress
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base text-white">
                    {workout.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {workout.duration_minutes} min
                    </span>
                    {workout.xp_earned > 0 && (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Zap className="h-3 w-3" />
                        +{workout.xp_earned} XP
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-zinc-600 line-clamp-2">
                    {workout.notes || "No notes"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
