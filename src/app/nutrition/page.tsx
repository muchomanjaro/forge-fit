"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Apple, Flame, Beef, Wheat, Droplets } from "lucide-react";
import type { Database } from "@/types/database";

type NutritionLog = Database["public"]["Tables"]["nutrition_logs"]["Row"];

const mealTypes = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

export default function NutritionPage() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [mealType, setMealType] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];

      const { data } = await supabase
        .from("nutrition_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", today)
        .order("logged_at", { ascending: false });

      if (data) setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await ((supabase as any).from("nutrition_logs").insert({
      user_id: user.id,
      meal_type: mealType as any,
      logged_at: new Date().toISOString(),
      total_calories: parseInt(calories) || 0,
      total_protein_g: parseFloat(protein) || 0,
      total_carbs_g: parseFloat(carbs) || 0,
      total_fat_g: parseFloat(fat) || 0,
      notes: notes || null,
    }));

    if (!error) {
      setMealType("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setNotes("");
      setShowForm(false);
      loadLogs();
    }

    setSaving(false);
  };

  const todayTotals = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.total_calories,
      protein: acc.protein + log.total_protein_g,
      carbs: acc.carbs + log.total_carbs_g,
      fat: acc.fat + log.total_fat_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Nutrition</h1>
          <p className="text-zinc-400">Track your meals and macros</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {showForm ? "Cancel" : "Log Meal"}
        </Button>
      </div>

      {/* Daily Macro Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Flame className="h-4 w-4 text-orange-500" />
              Calories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{todayTotals.calories}</p>
            <p className="text-xs text-zinc-500">kcal today</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Beef className="h-4 w-4 text-red-400" />
              Protein
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{todayTotals.protein}g</p>
            <p className="text-xs text-zinc-500">today</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Wheat className="h-4 w-4 text-amber-400" />
              Carbs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{todayTotals.carbs}g</p>
            <p className="text-xs text-zinc-500">today</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Droplets className="h-4 w-4 text-blue-400" />
              Fat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{todayTotals.fat}g</p>
            <p className="text-xs text-zinc-500">today</p>
          </CardContent>
        </Card>
      </div>

      {/* Log Meal Form */}
      {showForm && (
        <Card className="mb-6 border-zinc-800 bg-zinc-900/80">
          <CardHeader>
            <CardTitle className="text-white">Log Meal</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Meal Type</Label>
                <Select value={mealType} onValueChange={setMealType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select meal type" />
                  </SelectTrigger>
                  <SelectContent>
                    {mealTypes.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="calories">Calories</Label>
                  <Input
                    id="calories"
                    type="number"
                    placeholder="500"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    min={0}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protein">Protein (g)</Label>
                  <Input
                    id="protein"
                    type="number"
                    placeholder="30"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    min={0}
                    step={0.1}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carbs">Carbs (g)</Label>
                  <Input
                    id="carbs"
                    type="number"
                    placeholder="50"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    min={0}
                    step={0.1}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fat">Fat (g)</Label>
                  <Input
                    id="fat"
                    type="number"
                    placeholder="20"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    min={0}
                    step={0.1}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mealNotes">Notes (optional)</Label>
                <Textarea
                  id="mealNotes"
                  placeholder="What did you eat?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving || !mealType || !calories}>
                  {saving ? "Logging..." : "Log Meal"}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* Recent Logs */}
      <Card className="border-zinc-800 bg-zinc-900/80">
        <CardHeader>
          <CardTitle className="text-white">Today&apos;s Meals</CardTitle>
          <CardDescription>Your logged meals for today</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-zinc-500">Loading...</p>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Apple className="h-8 w-8 text-zinc-700" />
              <p className="text-sm text-zinc-500">No meals logged today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800 p-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10">
                    <Apple className="h-4 w-4 text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white capitalize">
                      {log.meal_type}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {log.total_calories} kcal · P:{log.total_protein_g}g C:
                      {log.total_carbs_g}g F:{log.total_fat_g}g
                    </p>
                  </div>
                  <span className="text-xs text-zinc-600">
                    {new Date(log.logged_at).toLocaleTimeString(undefined, {
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
