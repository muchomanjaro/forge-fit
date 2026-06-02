"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, Activity, PieChart as PieChartIcon, Zap } from "lucide-react";
import type { Database } from "@/types/database";

type Workout = Database["public"]["Tables"]["workouts"]["Row"];
type NutritionLog = Database["public"]["Tables"]["nutrition_logs"]["Row"];
type SleepLog = Database["public"]["Tables"]["sleep_logs"]["Row"];
type UserStat = Database["public"]["Tables"]["user_stats"]["Row"];

const CHART_COLORS = {
  amber: "#f59e0b",
  emerald: "#10b981",
  blue: "#3b82f6",
  orange: "#f97316",
  purple: "#a855f7",
  zinc: "#52525b",
};

const PIE_COLORS = ["#f97316", "#10b981", "#f59e0b", "#3b82f6"];

export default function ProgressPage() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [nutritionLogs, setNutritionLogs] = useState<NutritionLog[]>([]);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [stats, setStats] = useState<UserStat[]>([]);
  const [xpHistory, setXpHistory] = useState<{ date: string; xp: number }[]>([]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString();

      // Load workouts
      const { data: wData } = await ((supabase as any)
        .from("workouts")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", dateStr)
        .order("created_at", { ascending: true }));
      if (wData) setWorkouts(wData);

      // Load nutrition
      const { data: nData } = await supabase
        .from("nutrition_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", dateStr)
        .order("logged_at", { ascending: true });
      if (nData) setNutritionLogs(nData);

      // Load sleep
      const thirtyDaysAgoDate = thirtyDaysAgo.toISOString().split("T")[0];
      const { data: sData } = await supabase
        .from("sleep_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", thirtyDaysAgoDate)
        .order("date", { ascending: true });
      if (sData) setSleepLogs(sData);

      // Load stats (weight)
      const { data: stData } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", thirtyDaysAgoDate)
        .order("date", { ascending: true });
      if (stData) setStats(stData);

      // Build XP history from workouts
      const xpByDay: Record<string, number> = {};
      wData?.forEach((w: any) => {
        const day = new Date(w.created_at).toISOString().split("T")[0];
        xpByDay[day] = (xpByDay[day] || 0) + w.xp_earned;
      });
      const xpArr = Object.entries(xpByDay)
        .map(([date, xp]) => ({ date, xp }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Fill in gaps
      const filled: { date: string; xp: number }[] = [];
      let running = 0;
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        const found = xpArr.find((x) => x.date === key);
        running += found?.xp || 0;
        filled.push({ date: key, xp: running });
      }
      setXpHistory(filled);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Weight trend data
  const weightData = stats
    .filter((s) => s.weight_kg)
    .map((s) => ({
      date: new Date(s.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      weight: s.weight_kg,
    }));

  // Workout frequency (last 7 days)
  const workoutFreq: { day: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const dayName = d.toLocaleDateString(undefined, { weekday: "short" });
    const count = workouts.filter((w) => w.created_at?.startsWith(key)).length;
    workoutFreq.push({ day: dayName, count });
  }

  // Macro breakdown (avg daily)
  const avgMacros = nutritionLogs.length > 0
    ? [
        { name: "Protein", value: Math.round(nutritionLogs.reduce((s, l) => s + l.total_protein_g, 0) / nutritionLogs.length) },
        { name: "Carbs", value: Math.round(nutritionLogs.reduce((s, l) => s + l.total_carbs_g, 0) / nutritionLogs.length) },
        { name: "Fat", value: Math.round(nutritionLogs.reduce((s, l) => s + l.total_fat_g, 0) / nutritionLogs.length) },
      ]
    : [];

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <div className="text-zinc-500">Loading charts...</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Progress</h1>
        <p className="text-zinc-400">Track your trends and achievements over time</p>
      </div>

      <Tabs defaultValue="trends" className="space-y-6">
        <TabsList>
          <TabsTrigger value="trends">
            <TrendingUp className="mr-2 h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="workouts">
            <Activity className="mr-2 h-4 w-4" />
            Workouts
          </TabsTrigger>
          <TabsTrigger value="nutrition">
            <PieChartIcon className="mr-2 h-4 w-4" />
            Nutrition
          </TabsTrigger>
          <TabsTrigger value="xp">
            <Zap className="mr-2 h-4 w-4" />
            XP
          </TabsTrigger>
        </TabsList>

        {/* Weight Trends */}
        <TabsContent value="trends">
          <Card className="border-zinc-800 bg-zinc-900/80">
            <CardHeader>
              <CardTitle className="text-white">Weight Trend</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {weightData.length === 0 ? (
                <p className="py-12 text-center text-sm text-zinc-500">
                  Log your weight in Stats to see trends here
                </p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis
                        dataKey="date"
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                        domain={["dataMin - 2", "dataMax + 2"]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#18181b",
                          border: "1px solid #27272a",
                          borderRadius: "8px",
                          color: "#f4f4f5",
                          fontSize: "12px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke={CHART_COLORS.emerald}
                        strokeWidth={2}
                        dot={{ fill: CHART_COLORS.emerald, r: 3 }}
                        name="Weight (kg)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workout Frequency */}
        <TabsContent value="workouts">
          <Card className="border-zinc-800 bg-zinc-900/80">
            <CardHeader>
              <CardTitle className="text-white">Workout Frequency</CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workoutFreq}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="day"
                      stroke="#71717a"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#71717a"
                      fontSize={11}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                        color: "#f4f4f5",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill={CHART_COLORS.amber}
                      radius={[4, 4, 0, 0]}
                      name="Workouts"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Macro Breakdown */}
        <TabsContent value="nutrition">
          <Card className="border-zinc-800 bg-zinc-900/80">
            <CardHeader>
              <CardTitle className="text-white">Macro Breakdown</CardTitle>
              <CardDescription>Average daily macros (last 30 days)</CardDescription>
            </CardHeader>
            <CardContent>
              {avgMacros.length === 0 || avgMacros.every((m) => m.value === 0) ? (
                <p className="py-12 text-center text-sm text-zinc-500">
                  No nutrition data to display
                </p>
              ) : (
                <div className="flex flex-col items-center sm:flex-row sm:items-start sm:justify-center gap-8">
                  <div className="h-64 w-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={avgMacros}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                          nameKey="name"
                        >
                          {avgMacros.map((_, idx) => (
                            <Cell
                              key={idx}
                              fill={PIE_COLORS[idx % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#18181b",
                            border: "1px solid #27272a",
                            borderRadius: "8px",
                            color: "#f4f4f5",
                            fontSize: "12px",
                          }}
                        />
                        <Legend
                          wrapperStyle={{ color: "#a1a1aa", fontSize: "12px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {avgMacros.map((m, idx) => (
                      <div key={m.name} className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[idx] }}
                        />
                        <span className="text-sm text-zinc-300">
                          {m.name}: {m.value}g
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* XP Accumulation */}
        <TabsContent value="xp">
          <Card className="border-zinc-800 bg-zinc-900/80">
            <CardHeader>
              <CardTitle className="text-white">XP Accumulation</CardTitle>
              <CardDescription>Cumulative XP over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {xpHistory.length === 0 || xpHistory.every((x) => x.xp === 0) ? (
                <p className="py-12 text-center text-sm text-zinc-500">
                  Complete workouts to earn XP and see your progress here
                </p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={xpHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis
                        dataKey="date"
                        stroke="#71717a"
                        fontSize={10}
                        tickLine={false}
                        tickFormatter={(val) => {
                          const d = new Date(val);
                          return `${d.getMonth() + 1}/${d.getDate()}`;
                        }}
                      />
                      <YAxis
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#18181b",
                          border: "1px solid #27272a",
                          borderRadius: "8px",
                          color: "#f4f4f5",
                          fontSize: "12px",
                        }}
                        labelFormatter={(val) =>
                          new Date(val).toLocaleDateString()
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="xp"
                        stroke={CHART_COLORS.amber}
                        strokeWidth={2}
                        dot={false}
                        name="Total XP"
                        fill={CHART_COLORS.amber}
                        fillOpacity={0.1}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
