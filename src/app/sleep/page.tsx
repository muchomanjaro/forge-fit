"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Moon, Star } from "lucide-react";
import type { Database } from "@/types/database";

type SleepLog = Database["public"]["Tables"]["sleep_logs"]["Row"];

const qualityLabels = ["Terrible", "Poor", "Fair", "Good", "Great"];

export default function SleepPage() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [sleepDate, setSleepDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [bedtime, setBedtime] = useState("22:00");
  const [wakeTime, setWakeTime] = useState("06:00");
  const [quality, setQuality] = useState(3);
  const [sleepNotes, setSleepNotes] = useState("");
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

      const { data } = await supabase
        .from("sleep_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(14);

      if (data) setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateHours = (bed: string, wake: string): number => {
    const [bh, bm] = bed.split(":").map(Number);
    const [wh, wm] = wake.split(":").map(Number);
    let hours = wh - bh + (wm - bm) / 60;
    if (hours < 0) hours += 24;
    return Math.round(hours * 10) / 10;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const hoursSlept = calculateHours(bedtime, wakeTime);

    const { error } = await ((supabase as any).from("sleep_logs").insert({
      user_id: user.id,
      date: sleepDate,
      bedtime: bedtime,
      wake_time: wakeTime,
      hours_slept: hoursSlept,
      quality_rating: quality,
      notes: sleepNotes || null,
    }));

    if (!error) {
      setShowForm(false);
      loadLogs();
    }

    setSaving(false);
  };

  const last7 = logs.slice(0, 7);
  const avgHours =
    last7.length > 0
      ? last7.reduce((sum, l) => sum + l.hours_slept, 0) / last7.length
      : 0;

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sleep</h1>
          <p className="text-zinc-400">Track your sleep quality and patterns</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {showForm ? "Cancel" : "Log Sleep"}
        </Button>
      </div>

      {/* Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Moon className="h-4 w-4 text-blue-400" />
              Last 7 Days Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">
              {avgHours.toFixed(1)}h
            </p>
            <p className="text-xs text-zinc-500">per night on average</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Star className="h-4 w-4 text-amber-400" />
              Last Night
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length > 0 ? (
              <>
                <p className="text-3xl font-bold text-white">
                  {logs[0].hours_slept}h
                </p>
                <div className="mt-1 flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < (logs[0].quality_rating ?? 0)
                          ? "fill-amber-400 text-amber-400"
                          : "text-zinc-700"
                      }`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-500">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Log Sleep Form */}
      {showForm && (
        <Card className="mb-6 border-zinc-800 bg-zinc-900/80">
          <CardHeader>
            <CardTitle className="text-white">Log Sleep Session</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sleepDate">Date</Label>
                <Input
                  id="sleepDate"
                  type="date"
                  value={sleepDate}
                  onChange={(e) => setSleepDate(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bedtime">Bedtime</Label>
                  <Input
                    id="bedtime"
                    type="time"
                    value={bedtime}
                    onChange={(e) => setBedtime(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wakeTime">Wake Time</Label>
                  <Input
                    id="wakeTime"
                    type="time"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="rounded-lg bg-blue-500/10 p-3">
                <p className="text-sm text-blue-400">
                  Hours slept: <strong>{calculateHours(bedtime, wakeTime)}h</strong>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Quality Rating</Label>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setQuality(i + 1)}
                      className="rounded-lg p-1 transition-colors hover:bg-zinc-800"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          i < quality
                            ? "fill-amber-400 text-amber-400"
                            : "text-zinc-700"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-zinc-400">
                    {qualityLabels[quality - 1]}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sleepNotes">Notes (optional)</Label>
                <Textarea
                  id="sleepNotes"
                  placeholder="How did you sleep?"
                  value={sleepNotes}
                  onChange={(e) => setSleepNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Log Sleep"}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* Recent Sleep Logs */}
      <Card className="border-zinc-800 bg-zinc-900/80">
        <CardHeader>
          <CardTitle className="text-white">Sleep History</CardTitle>
          <CardDescription>Your recent sleep logs</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-zinc-500">Loading...</p>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Moon className="h-8 w-8 text-zinc-700" />
              <p className="text-sm text-zinc-500">No sleep logs yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800 p-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                    <Moon className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      {log.hours_slept}h sleep
                    </p>
                    <p className="text-xs text-zinc-500">
                      {log.bedtime} - {log.wake_time}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < (log.quality_rating ?? 0)
                            ? "fill-amber-400 text-amber-400"
                            : "text-zinc-700"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-zinc-600">
                    {new Date(log.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
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
