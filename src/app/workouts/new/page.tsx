"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Dumbbell } from "lucide-react";
import type { Database } from "@/types/database";

interface ExerciseForm {
  exercise_name: string;
  sets: string;
  reps: string;
  weight: string;
  rpe: string;
}

export default function NewWorkoutPage() {
  const router = useRouter();
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<ExerciseForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addExercise = () => {
    setExercises([
      ...exercises,
      { exercise_name: "", sets: "", reps: "", weight: "", rpe: "" },
    ]);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: keyof ExerciseForm, value: string) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const calculateXP = () => {
    let xp = 10; // base XP
    const dur = parseInt(duration) || 0;
    xp += Math.floor(dur / 10) * 5;
    xp += exercises.length * 3;
    return xp;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const xpEarned = calculateXP();

    // Insert workout
    const { data: workout, error: workoutError } = await ((supabase as any)
      .from("workouts")
      .insert({
        user_id: user.id,
        name,
        category: category as any,
        duration_minutes: parseInt(duration) || 0,
        notes: notes || null,
        xp_earned: xpEarned,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single());

    if (workoutError) {
      setError(workoutError.message);
      setLoading(false);
      return;
    }

    // Insert exercises
    if (exercises.length > 0 && (workout as any)) {
      const exercisesToInsert = exercises
        .filter((ex) => ex.exercise_name.trim())
        .map((ex, idx) => ({
          workout_id: (workout as any).id,
          exercise_name: ex.exercise_name,
          sets: ex.sets ? parseInt(ex.sets) : null,
          reps: ex.reps ? parseInt(ex.reps) : null,
          weight_kg: ex.weight ? parseFloat(ex.weight) : null,
          rpe: ex.rpe ? parseInt(ex.rpe) : null,
          sort_order: idx + 1,
        }));

      if (exercisesToInsert.length > 0) {
        await (supabase as any).from("workout_exercises").insert(exercisesToInsert);
      }
    }

    // Update user XP
    await (supabase as any).rpc("add_xp", {
      p_user_id: user.id,
      p_xp: xpEarned,
    });

    router.push("/workouts");
    router.refresh();
  };

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Log Workout</h1>
        <p className="text-zinc-400">Record your training session</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6 border-zinc-800 bg-zinc-900/80">
          <CardHeader>
            <CardTitle className="text-white">Workout Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Workout Name</Label>
              <Input
                id="name"
                placeholder="Morning Run, Upper Body, etc."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cardio">Cardio</SelectItem>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="flexibility">Flexibility</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="45"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min={1}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="How did the workout feel?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="rounded-lg bg-amber-500/10 p-3">
              <div className="flex items-center gap-2 text-sm text-amber-400">
                <Dumbbell className="h-4 w-4" />
                Estimated XP: <strong>+{calculateXP()}</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exercises */}
        <Card className="mb-6 border-zinc-800 bg-zinc-900/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Exercises</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addExercise}>
              <Plus className="mr-1 h-3 w-3" />
              Add Exercise
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {exercises.length === 0 && (
              <p className="text-center text-sm text-zinc-500 py-4">
                No exercises yet. Click &quot;Add Exercise&quot; to build your workout.
              </p>
            )}

            {exercises.map((exercise, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <Badge variant="secondary">Exercise {idx + 1}</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-300 focus-visible:ring-red-500"
                    onClick={() => removeExercise(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400">Exercise Name</Label>
                    <Input
                      placeholder="Bench Press, Squat, etc."
                      value={exercise.exercise_name}
                      onChange={(e) => updateExercise(idx, "exercise_name", e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Sets</Label>
                      <Input
                        type="number"
                        placeholder="3"
                        value={exercise.sets}
                        onChange={(e) => updateExercise(idx, "sets", e.target.value)}
                        min={1}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Reps</Label>
                      <Input
                        type="number"
                        placeholder="10"
                        value={exercise.reps}
                        onChange={(e) => updateExercise(idx, "reps", e.target.value)}
                        min={1}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Weight (kg)</Label>
                      <Input
                        type="number"
                        placeholder="60"
                        value={exercise.weight}
                        onChange={(e) => updateExercise(idx, "weight", e.target.value)}
                        min={0}
                        step={0.5}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">RPE</Label>
                      <Input
                        type="number"
                        placeholder="7"
                        value={exercise.rpe}
                        onChange={(e) => updateExercise(idx, "rpe", e.target.value)}
                        min={1}
                        max={10}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/workouts")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !name || !category || !duration}>
            {loading ? "Saving..." : "Complete Workout"}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
