"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Zap, Flame, Calendar, Target, Dumbbell, Apple, Moon, Edit2, Check, X, Settings, Save } from "lucide-react";
import Link from "next/link";
import type { Database } from "@/types/database";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
type UserGoal = Database["public"]["Tables"]["user_goals"]["Row"];

const goalLabels: Record<string, string> = {
  weight_loss: "Weight Loss",
  muscle: "Muscle Building",
  endurance: "Endurance",
  flexibility: "Flexibility",
  wellness: "General Wellness",
  longevity: "Longevity",
};

const fitnessLevelLabels: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [user, setUser] = useState<UserRow | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editFitnessLevel, setEditFitnessLevel] = useState("");

  // Stats
  const [workoutCount, setWorkoutCount] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      // User data
      const { data: rawU } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();
      const uData = rawU as UserRow | null;
      if (uData) {
        setUser(uData);
        setEditDisplayName(uData.display_name);
      }

      // User profile
      const { data: rawP } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", authUser.id)
        .single();
      const pData = rawP as UserProfile | null;
      if (pData) {
        setProfile(pData);
        setEditAge(pData.age?.toString() ?? "");
        setEditGender(pData.gender ?? "");
        setEditHeight(pData.height_cm?.toString() ?? "");
        setEditWeight(pData.weight_kg?.toString() ?? "");
        setEditFitnessLevel(pData.fitness_level ?? "");
      }

      // Goals
      const { data: gData } = await supabase
        .from("user_goals")
        .select("*")
        .eq("user_id", authUser.id)
        .order("priority");
      if (gData) setGoals(gData);

      // Workout count
      const { count: wCount } = await supabase
        .from("workouts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", authUser.id);
      setWorkoutCount(wCount ?? 0);

      // Streak
      const { data: sData } = await supabase
        .from("streaks")
        .select("current_count")
        .eq("user_id", authUser.id)
        .eq("streak_type", "workout")
        .single();
      if (sData) setStreak((sData as { current_count: number }).current_count);
    } catch (err) {
      console.error("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) {
      setError("Not authenticated");
      setSaving(false);
      return;
    }

    // Update display name
    if (editDisplayName !== user?.display_name) {
      await (supabase as any)
        .from("users")
        .update({ display_name: editDisplayName })
        .eq("id", authUser.id);
    }

    // Update user_profiles
    await (supabase as any)
      .from("user_profiles")
      .upsert({
        user_id: authUser.id,
        age: editAge ? parseInt(editAge) : null,
        gender: editGender || null,
        height_cm: editHeight ? parseFloat(editHeight) : null,
        weight_kg: editWeight ? parseFloat(editWeight) : null,
        fitness_level: editFitnessLevel || null,
      })
      .eq("user_id", authUser.id);

    setEditing(false);
    setSaving(false);
    loadProfile();
  };

  const handleCancel = () => {
    if (user) setEditDisplayName(user.display_name);
    if (profile) {
      setEditAge(profile.age?.toString() ?? "");
      setEditGender(profile.gender ?? "");
      setEditHeight(profile.height_cm?.toString() ?? "");
      setEditWeight(profile.weight_kg?.toString() ?? "");
      setEditFitnessLevel(profile.fitness_level ?? "");
    }
    setEditing(false);
  };

  const xpForNextLevel = (level: number) => level * 100;
  const xpProgress = user ? ((user.xp % 100) / 100) * 100 : 0;

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <div className="text-zinc-500">Loading profile...</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <p className="text-zinc-400">Your fitness identity and stats</p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={saving}
              >
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="mr-1 h-4 w-4" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Edit2 className="mr-1 h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Profile Header */}
        <Card className="border-zinc-800 bg-zinc-900/80">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-amber-500/20 text-amber-400 text-xl font-bold">
                  {user ? getInitials(user.display_name) : "FF"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left">
                {editing ? (
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      className="max-w-xs"
                    />
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-white">
                      {user?.display_name ?? "User"}
                    </h2>
                    <p className="mt-1 flex items-center justify-center gap-2 text-sm text-zinc-400 sm:justify-start">
                      <Zap className="h-4 w-4 text-amber-500" />
                      Level {user?.level ?? 1} &middot; {user?.xp ?? 0} XP
                    </p>
                    <div className="mt-2 flex items-center gap-2 max-w-xs">
                      <Progress value={xpProgress} className="h-1.5 flex-1" />
                      <span className="text-xs text-zinc-500">
                        {xpForNextLevel(user?.level ?? 1)} XP
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-3 text-center">
                <div className="rounded-lg bg-zinc-800/50 px-4 py-2">
                  <p className="text-lg font-bold text-white">{workoutCount}</p>
                  <p className="text-[10px] text-zinc-500">Workouts</p>
                </div>
                <div className="rounded-lg bg-zinc-800/50 px-4 py-2">
                  <p className="flex items-center justify-center gap-1 text-lg font-bold text-orange-400">
                    <Flame className="h-4 w-4" />
                    {streak}
                  </p>
                  <p className="text-[10px] text-zinc-500">Day Streak</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Personal Details */}
          <Card className="border-zinc-800 bg-zinc-900/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <User className="h-5 w-5 text-zinc-400" />
                Personal Details
              </CardTitle>
              <CardDescription>Your physical stats and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editAge">Age</Label>
                      <Input
                        id="editAge"
                        type="number"
                        value={editAge}
                        onChange={(e) => setEditAge(e.target.value)}
                        min={13}
                        max={120}
                        placeholder="25"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={editGender} onValueChange={setEditGender}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editHeight">Height (cm)</Label>
                      <Input
                        id="editHeight"
                        type="number"
                        value={editHeight}
                        onChange={(e) => setEditHeight(e.target.value)}
                        min={50}
                        max={300}
                        placeholder="175"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editWeight">Weight (kg)</Label>
                      <Input
                        id="editWeight"
                        type="number"
                        value={editWeight}
                        onChange={(e) => setEditWeight(e.target.value)}
                        min={20}
                        max={500}
                        step={0.1}
                        placeholder="70"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Fitness Level</Label>
                    <Select value={editFitnessLevel} onValueChange={setEditFitnessLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-zinc-500">Age</p>
                      <p className="text-sm font-medium text-white">
                        {profile?.age ? `${profile.age} years` : "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Gender</p>
                      <p className="text-sm font-medium text-white capitalize">
                        {profile?.gender?.replace(/_/g, " ") ?? "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Height</p>
                      <p className="text-sm font-medium text-white">
                        {profile?.height_cm ? `${profile.height_cm} cm` : "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Weight</p>
                      <p className="text-sm font-medium text-white">
                        {profile?.weight_kg ? `${profile.weight_kg} kg` : "Not set"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-zinc-500">Fitness Level</p>
                      <p className="text-sm font-medium text-white">
                        {profile?.fitness_level
                          ? fitnessLevelLabels[profile.fitness_level] ?? profile.fitness_level
                          : "Not set"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Goals */}
          <Card className="border-zinc-800 bg-zinc-900/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Target className="h-5 w-5 text-zinc-400" />
                Fitness Goals
              </CardTitle>
              <CardDescription>Your primary fitness objectives</CardDescription>
            </CardHeader>
            <CardContent>
              {goals.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Target className="h-8 w-8 text-zinc-700" />
                  <p className="text-sm text-zinc-500">No goals set yet</p>
                  <p className="text-xs text-zinc-600">
                    Complete the onboarding to set your fitness goals
                  </p>
                  <Link href="/onboarding">
                    <Button size="sm" variant="outline" className="mt-2">
                      Set Goals
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {goals.map((goal, idx) => (
                    <div
                      key={goal.id}
                      className="flex items-center gap-3 rounded-lg border border-zinc-800 p-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-400">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">
                          {goalLabels[goal.goal_type] ?? goal.goal_type}
                        </p>
                        {goal.target_value && (
                          <p className="text-xs text-zinc-500">
                            Target: {goal.target_value}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          idx === 0
                            ? "default"
                            : idx === 1
                              ? "green"
                              : "secondary"
                        }
                        className="text-[10px]"
                      >
                        Priority {goal.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Summary */}
        <Card className="border-zinc-800 bg-zinc-900/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Calendar className="h-5 w-5 text-zinc-400" />
              Activity Summary
            </CardTitle>
            <CardDescription>Your overall engagement across the app</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Dumbbell className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{workoutCount}</p>
                  <p className="text-xs text-zinc-500">Total Workouts</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <Apple className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{goals.length}</p>
                  <p className="text-xs text-zinc-500">Active Goals</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Moon className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{streak}</p>
                  <p className="text-xs text-zinc-500">Day Streak</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
