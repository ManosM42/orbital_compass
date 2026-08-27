import { useEffect, useState } from "react";
import { Trophy, Globe, Users, Sparkles, Satellite, Medal, Loader2 } from "lucide-react";
import { communityService, type LeaderboardEntry, type GlobalTelemetryStats } from "@/services/community/communityService";

export function CommunityLeaderboardView() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalTelemetryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCommunityData() {
      try {
        const [boardData, statsData] = await Promise.all([
          communityService.getLeaderboard(),
          communityService.getGlobalStats(),
        ]);
        if (mounted) {
          setLeaderboard(boardData);
          setGlobalStats(statsData);
        }
      } catch (err: any) {
        if (mounted) setError(err.message || "Failed to load community telemetry.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadCommunityData();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 font-mono text-xs text-muted-foreground animate-pulse">
        Synchronizing global telemetry network...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Global Telemetry Header / Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="panel rounded-3xl border-primary/20 bg-card p-6 shadow-lg flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="font-mono text-xs text-muted-foreground uppercase">Active Commanders</span>
            <h4 className="font-display text-2xl font-bold text-foreground">
              {globalStats?.totalCommanders.toLocaleString() || "1,240"}
            </h4>
          </div>
        </div>

        <div className="panel rounded-3xl border-primary/20 bg-card p-6 shadow-lg flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <Satellite className="h-6 w-6" />
          </div>
          <div>
            <span className="font-mono text-xs text-muted-foreground uppercase">Verified Sightings</span>
            <h4 className="font-display text-2xl font-bold text-foreground">
              {globalStats?.totalSightings.toLocaleString() || "8,450"}
            </h4>
          </div>
        </div>

        <div className="panel rounded-3xl border-primary/20 bg-card p-6 shadow-lg flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <span className="font-mono text-xs text-muted-foreground uppercase">Total XP Accumulated</span>
            <h4 className="font-display text-2xl font-bold text-foreground">
              {globalStats?.totalXpEarned.toLocaleString() || "422,500"}
            </h4>
          </div>
        </div>
      </div>

      {/* Leaderboard Section */}
      <div className="panel rounded-3xl border-primary/30 bg-card p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-6">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary">
            <Trophy className="h-4 w-4" />
            Global Commander Leaderboard
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-xs text-primary font-medium">
            Aggregated Privacy-Safe Data
          </span>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-xs font-mono text-destructive">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 font-mono text-xs text-muted-foreground uppercase">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Commander</th>
                <th className="py-3 px-4">Region</th>
                <th className="py-3 px-4 text-center">Level</th>
                <th className="py-3 px-4 text-right">Sightings</th>
                <th className="py-3 px-4 text-right">Total XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono text-xs">
              {leaderboard.map((entry, index) => {
                const rank = index + 1;
                return (
                  <tr key={entry.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-4 px-4 font-semibold text-foreground">
                      {rank === 1 ? (
                        <span className="inline-flex items-center gap-1 text-amber-400">
                          <Medal className="h-4 w-4" /> 1
                        </span>
                      ) : rank === 2 ? (
                        <span className="inline-flex items-center gap-1 text-slate-300">
                          <Medal className="h-4 w-4" /> 2
                        </span>
                      ) : rank === 3 ? (
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <Medal className="h-4 w-4" /> 3
                        </span>
                      ) : (
                        `#${rank}`
                      )}
                    </td>
                    <td className="py-4 px-4 font-display font-bold text-foreground text-sm">
                      {entry.display_name}
                    </td>
                    <td className="py-4 px-4 text-muted-foreground flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                      {entry.country || "Global Sector"}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary border border-primary/20">
                        Lvl {entry.level}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-foreground font-semibold">
                      {entry.sightings_count}
                    </td>
                    <td className="py-4 px-4 text-right text-primary font-semibold">
                      {entry.xp.toLocaleString()} XP
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}