"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Clock, Zap, Dumbbell } from "lucide-react";
import type { Database } from "@/types/database";

type Workout = Database["public"]["Tables"]["workouts"]["Row"];
type WorkoutExercise = Database["public"]["Tables"]["workout_exercises"]["Row"];

export default function WorkoutDetailPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) loadWorkout();
  }, [params.id]);

  const loadWorkout = async () => {
    try {
      const { data: wData } = await supabase
        .from("workouts")
        .select("*")
        .eq("id", params.id as string)
        .single();

      if (wData) setWorkout(wData);

      const { data: exData } = await supabase
        .from("workout_exercises")
        .select("*")
        .eq("workout_id", params.id as string)
        .order("sort_order");

      if (exData) setExercises(exData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="py-12 text-center text-zinc-500">Loading...</div>
      </AppShell>
    );
  }

  if (!workout) {
    return (
      <AppShell>
        <div className="py-12 text-center text-zinc-500">Workout not found</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link
        href="/workouts"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded-lg px-2 py-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Workouts
      </Link>

      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Badge
            variant={
              workout.category === "strength"
                ? "green"
                : workout.category === "cardio"
                  ? "default"
                  : "blue"
            }
          >
            {workout.category}
          </Badge>
          {workout.completed_at && (
            <Badge variant="green">Completed</Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white">{workout.name}</h1>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Clock className="h-4 w-4" />
              Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">
              {workout.duration_minutes} min
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Dumbbell className="h-4 w-4" />
              Exercises
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{exercises.length}</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Zap className="h-4 w-4 text-amber-500" />
              XP Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-400">
              +{workout.xp_earned}
            </p>
          </CardContent>
        </Card>
      </div>

      {workout.notes && (
        <Card className="mb-6 border-zinc-800 bg-zinc-900/80">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-400">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-300">{workout.notes}</p>
          </CardContent>
        </Card>
      )}

      {exercises.length > 0 && (
        <Card className="border-zinc-800 bg-zinc-900/80">
          <CardHeader>
            <CardTitle className="text-white">Exercises</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {exercises.map((exercise, idx) => (
                <div
                  key={exercise.id}
                  className="rounded-lg border border-zinc-800 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-white">
                      {idx + 1}. {exercise.exercise_name}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                    {exercise.sets && (
                      <span className="rounded-md bg-zinc-800 px-2 py-1">
                        Sets: {exercise.sets}
                      </span>
                    )}
                    {exercise.reps && (
                      <span className="rounded-md bg-zinc-800 px-2 py-1">
                        Reps: {exercise.reps}
                      </span>
                    )}
                    {exercise.weight_kg && (
                      <span className="rounded-md bg-zinc-800 px-2 py-1">
                        Weight: {exercise.weight_kg} kg
                      </span>
                    )}
                    {exercise.rpe && (
                      <span className="rounded-md bg-zinc-800 px-2 py-1">
                        RPE: {exercise.rpe}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
