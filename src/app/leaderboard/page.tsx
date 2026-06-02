"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Zap, Flame, Crown, TrendingUp } from "lucide-react";
import type { Database } from "@/types/database";

type User = Database["public"]["Tables"]["users"]["Row"];

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  xp: number;
  level: number;
  streak: number;
  isCurrentUser: boolean;
}

const rankColors = ["text-amber-400", "text-zinc-300", "text-orange-600"];
const rankIcons = [Crown, Medal, Medal];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function LeaderboardPage() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [xpLeaderboard, setXpLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [streakLeaderboard, setStreakLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) setCurrentUserId(authUser.id);

      // XP leaderboard: top 50 users by XP
      const { data: rawUsers } = await supabase
        .from("users")
        .select("id, display_name, xp, level")
        .order("xp", { ascending: false })
        .limit(50);

      const usersList = (rawUsers ?? []) as {
        id: string;
        display_name: string;
        xp: number;
        level: number;
      }[];

      // Streak data for all users
      const { data: rawStreaks } = await supabase
        .from("streaks")
        .select("user_id, current_count, streak_type")
        .eq("streak_type", "workout");

      const allStreaks = (rawStreaks ?? []) as {
        user_id: string;
        current_count: number;
        streak_type: string;
      }[];

      const streakMap = new Map<string, number>();
      allStreaks.forEach((s) => {
        const existing = streakMap.get(s.user_id) ?? 0;
        if (s.current_count > existing) {
          streakMap.set(s.user_id, s.current_count);
        }
      });

      const xpEntries: LeaderboardEntry[] = usersList.map((u, idx) => ({
        rank: idx + 1,
        user_id: u.id,
        display_name: u.display_name,
        xp: u.xp,
        level: u.level,
        streak: streakMap.get(u.id) ?? 0,
        isCurrentUser: u.id === authUser?.id,
      }));
      setXpLeaderboard(xpEntries);

      // Streak leaderboard: sort by streak count
      const streakEntries: LeaderboardEntry[] = usersList
        .map((u) => ({
          rank: 0, // will recalculate
          user_id: u.id,
          display_name: u.display_name,
          xp: u.xp,
          level: u.level,
          streak: streakMap.get(u.id) ?? 0,
          isCurrentUser: u.id === authUser?.id,
        }))
        .filter((e) => e.streak > 0)
        .sort((a, b) => b.streak - a.streak)
        .slice(0, 50)
        .map((e, idx) => ({ ...e, rank: idx + 1 }));
      setStreakLeaderboard(streakEntries);
    } catch (err) {
      console.error("Leaderboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const renderRow = (entry: LeaderboardEntry) => {
    const isTop3 = entry.rank <= 3;

    return (
      <div
        key={`${entry.user_id}-${entry.rank}`}
        className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
          entry.isCurrentUser
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
        }`}
      >
        {/* Rank */}
        <div className="flex w-8 shrink-0 justify-center">
          {isTop3 ? (
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                entry.rank === 1
                  ? "bg-amber-500/20"
                  : entry.rank === 2
                    ? "bg-zinc-400/20"
                    : "bg-orange-500/20"
              }`}
            >
              {entry.rank === 1 ? (
                <Crown className={`h-4 w-4 ${rankColors[0]}`} />
              ) : (
                <Medal className={`h-4 w-4 ${rankColors[entry.rank - 1]}`} />
              )}
            </div>
          ) : (
            <span className="text-sm font-semibold text-zinc-500">
              #{entry.rank}
            </span>
          )}
        </div>

        {/* Avatar & Name */}
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback
            className={
              entry.isCurrentUser
                ? "bg-amber-500/20 text-amber-400 text-xs font-semibold"
                : "bg-zinc-800 text-zinc-400 text-xs font-semibold"
            }
          >
            {getInitials(entry.display_name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-white truncate">
            {entry.display_name}
            {entry.isCurrentUser && (
              <Badge variant="default" className="text-[9px] px-1.5 py-0">
                You
              </Badge>
            )}
          </p>
          <p className="text-xs text-zinc-500">
            Level {entry.level}
          </p>
        </div>

        {/* XP */}
        <div className="text-right shrink-0">
          <p className="flex items-center gap-1 text-sm font-semibold text-amber-400">
            <Zap className="h-3 w-3" />
            {entry.xp.toLocaleString()}
          </p>
          <p className="text-[10px] text-zinc-600">XP</p>
        </div>

        {/* Streak */}
        {entry.streak > 0 && (
          <div className="text-right shrink-0 ml-2">
            <p className="flex items-center gap-1 text-sm font-semibold text-orange-400">
              <Flame className="h-3 w-3" />
              {entry.streak}
            </p>
            <p className="text-[10px] text-zinc-600">day</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        <p className="text-zinc-400">
          See how you stack up against other Forge Fit members
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-zinc-500">
          Loading leaderboard...
        </div>
      ) : (
        <Tabs defaultValue="xp" className="space-y-6">
          <TabsList>
            <TabsTrigger value="xp" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950">
              <Zap className="mr-2 h-4 w-4" />
              Top XP
            </TabsTrigger>
            <TabsTrigger value="streaks" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950">
              <Flame className="mr-2 h-4 w-4" />
              Top Streaks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="xp">
            {xpLeaderboard.length === 0 ? (
              <Card className="border-zinc-800 bg-zinc-900/80">
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <Trophy className="h-10 w-10 text-zinc-700" />
                  <p className="text-zinc-400">No leaderboard data yet</p>
                  <p className="text-xs text-zinc-600">
                    Start logging workouts to climb the ranks
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {/* Podium for top 3 */}
                {xpLeaderboard.length >= 3 && (
                  <Card className="mb-4 border-zinc-800 bg-zinc-900/80">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        Podium
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-3">
                        {xpLeaderboard.slice(0, 3).map((entry) => (
                          <div
                            key={entry.user_id}
                            className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-center ${
                              entry.isCurrentUser
                                ? "border-amber-500/30 bg-amber-500/5"
                                : "border-zinc-800 bg-zinc-950/50"
                            }`}
                          >
                            <div
                              className={`flex h-12 w-12 items-center justify-center rounded-full ${
                                entry.rank === 1
                                  ? "bg-amber-500/20"
                                  : entry.rank === 2
                                    ? "bg-zinc-400/20"
                                    : "bg-orange-500/20"
                              }`}
                            >
                              {entry.rank === 1 ? (
                                <Crown className="h-6 w-6 text-amber-400" />
                              ) : (
                                <Medal
                                  className={`h-6 w-6 ${rankColors[entry.rank - 1]}`}
                                />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white truncate max-w-[100px]">
                                {entry.display_name}
                              </p>
                              <p className="text-xs text-amber-400">
                                {entry.xp.toLocaleString()} XP
                              </p>
                              <p className="text-[10px] text-zinc-500">
                                Lvl {entry.level}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Full list */}
                <Card className="border-zinc-800 bg-zinc-900/80">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <TrendingUp className="h-4 w-4" />
                      XP Rankings
                    </CardTitle>
                    <CardDescription>
                      Sorted by total experience points
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {xpLeaderboard.map(renderRow)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="streaks">
            {streakLeaderboard.length === 0 ? (
              <Card className="border-zinc-800 bg-zinc-900/80">
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <Flame className="h-10 w-10 text-zinc-700" />
                  <p className="text-zinc-400">No streaks yet</p>
                  <p className="text-xs text-zinc-600">
                    Log consistently to start building streaks
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-zinc-800 bg-zinc-900/80">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Flame className="h-4 w-4 text-orange-400" />
                    Streak Rankings
                  </CardTitle>
                  <CardDescription>
                    Sorted by longest current workout streak
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {streakLeaderboard.map(renderRow)}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
}
