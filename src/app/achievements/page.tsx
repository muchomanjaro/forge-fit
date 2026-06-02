"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Lock, Star, Zap, Flame, Medal, Target, Brain } from "lucide-react";
import type { Database } from "@/types/database";

type Achievement = Database["public"]["Tables"]["achievements"]["Row"];
type UserAchievement = Database["public"]["Tables"]["user_achievements"]["Row"];
type Streak = Database["public"]["Tables"]["streaks"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];

const iconMap: Record<string, React.ReactNode> = {
  trophy: <Trophy className="h-5 w-5" />,
  star: <Star className="h-5 w-5" />,
  zap: <Zap className="h-5 w-5" />,
  flame: <Flame className="h-5 w-5" />,
  medal: <Medal className="h-5 w-5" />,
  target: <Target className="h-5 w-5" />,
  brain: <Brain className="h-5 w-5" />,
};

export default function AchievementsPage() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [user, setUser] = useState<User | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      // User data
      const { data: uData } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();
      if (uData) setUser(uData);

      // All achievements
      const { data: aData } = await supabase
        .from("achievements")
        .select("*");
      if (aData) setAchievements(aData);

      // User achievements
      const { data: uaData } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", authUser.id);
      if (uaData) setUserAchievements(uaData);

      // Streaks
      const { data: sData } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_id", authUser.id);
      if (sData) setStreaks(sData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const unlockedIds = new Set(
    userAchievements
      .filter((ua) => ua.unlocked_at)
      .map((ua) => ua.achievement_id)
  );

  const xpForNextLevel = (level: number) => level * 100;
  const xpProgress = user
    ? ((user.xp % 100) / 100) * 100
    : 0;

  const totalAchievements = achievements.length;
  const unlockedCount = unlockedIds.size;

  // Streak badges
  const streakBadges = streaks.map((s) => ({
    type: s.streak_type,
    count: s.current_count,
    longest: s.longest_count,
  }));

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Achievements</h1>
        <p className="text-zinc-400">Track your badges, streaks, and level progress</p>
      </div>

      {/* Level & Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Zap className="h-4 w-4 text-amber-500" />
              Level Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-400">
                Level {user?.level ?? 1}
              </span>
              <span className="text-xs text-zinc-500">
                {user?.xp ?? 0} / {xpForNextLevel(user?.level ?? 1)} XP
              </span>
            </div>
            <Progress value={xpProgress} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">
              {unlockedCount}
              <span className="text-sm font-normal text-zinc-500">
                /{totalAchievements}
              </span>
            </p>
            <p className="text-xs text-zinc-500">badges unlocked</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Flame className="h-4 w-4 text-orange-500" />
              Streaks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {streakBadges.length > 0 ? (
              <div className="space-y-1">
                {streakBadges.map((s) => (
                  <p key={s.type} className="text-sm text-white capitalize">
                    {s.type}: <span className="font-bold text-orange-400">{s.count}</span> days
                    <span className="text-xs text-zinc-500">
                      {" "}(best: {s.longest})
                    </span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No streaks yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Achievement Grid */}
      {loading ? (
        <div className="py-12 text-center text-zinc-500">Loading achievements...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {achievements.map((achievement) => {
            const unlocked = unlockedIds.has(achievement.id);
            const ua = userAchievements.find(
              (ua) => ua.achievement_id === achievement.id
            );

            return (
              <Card
                key={achievement.id}
                className={`border ${
                  unlocked
                    ? "border-amber-500/30 bg-zinc-900"
                    : "border-zinc-800 bg-zinc-900/50"
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col items-center text-center">
                    <div
                      className={`mb-3 flex h-14 w-14 items-center justify-center rounded-full ${
                        unlocked
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-zinc-800 text-zinc-600"
                      }`}
                    >
                      {unlocked ? (
                        iconMap[achievement.icon ?? "trophy"] || (
                          <Trophy className="h-5 w-5" />
                        )
                      ) : (
                        <Lock className="h-5 w-5" />
                      )}
                    </div>
                    <h3
                      className={`text-sm font-semibold ${
                        unlocked ? "text-white" : "text-zinc-500"
                      }`}
                    >
                      {achievement.name}
                    </h3>
                    {achievement.description && (
                      <p
                        className={`mt-1 text-xs ${
                          unlocked ? "text-zinc-400" : "text-zinc-600"
                        }`}
                      >
                        {achievement.description}
                      </p>
                    )}
                    <div
                      className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        unlocked
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      <Zap className="h-3 w-3" />
                      +{achievement.xp_reward} XP
                    </div>
                    {unlocked && ua?.unlocked_at && (
                      <p className="mt-2 text-[10px] text-zinc-600">
                        Unlocked{" "}
                        {new Date(ua.unlocked_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
