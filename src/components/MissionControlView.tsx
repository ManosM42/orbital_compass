import { useEffect, useState } from "react";
import { Target, Award, Sparkles, CheckCircle2, Loader2, Rocket, Shield } from "lucide-react";
import { missionService, type UserMission } from "@/services/missions/missionService";
import { cn } from "@/lib/utils";

export function MissionControlView() {
  const [missions, setMissions] = useState<UserMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMissions = async () => {
    try {
      const data = await missionService.getActiveMissions();
      setMissions(data);
    } catch (err: any) {
      setError(err.message || "Failed to load mission telemetry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissions();
  }, []);

  const handleClaim = async (missionId: string) => {
    setClaimingId(missionId);
    setError(null);
    try {
      await missionService.claimMissionReward(missionId);
      await fetchMissions();
    } catch (err: any) {
      setError(err.message || "Failed to claim reward.");
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 font-mono text-xs text-muted-foreground animate-pulse">
        Initializing Mission Control telemetry...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary">
          <Target className="h-4 w-4" />
          ORBITAL Mission Control Hub
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-xs text-primary font-medium">
          {missions.filter((m) => m.status === "claimed").length} / {missions.length} Completed
        </span>
      </div>

      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-xs font-mono text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {missions.map((um) => {
          const mission = um.mission;
          if (!mission) return null;

          const progressPercent = Math.min(Math.round((um.progress / mission.target_count) * 100), 100);
          const isCompleted = um.progress >= mission.target_count && um.status === "active";
          const isClaimed = um.status === "claimed";

          return (
            <div
              key={um.mission_id}
              className={cn(
                "panel relative rounded-3xl border p-6 flex flex-col justify-between transition-all",
                isClaimed ? "border-border/40 bg-card/40 opacity-75" : "border-primary/30 bg-card shadow-lg"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 font-mono text-[10px] uppercase font-semibold border",
                      mission.difficulty === "cadet"
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : mission.difficulty === "orbital"
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    )}
                  >
                    {mission.difficulty}
                  </span>

                  {mission.target_norad_id && (
                    <span className="font-mono text-xs text-muted-foreground">
                      NORAD: {mission.target_norad_id}
                    </span>
                  )}
                </div>

                <h3 className="font-display font-bold text-foreground text-base">{mission.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{mission.description}</p>
              </div>

              <div className="mt-6 space-y-4">
                {/* Progress bar */}
                <div>
                  <div className="flex justify-between font-mono text-xs mb-1.5">
                    <span className="text-muted-foreground">Objective Progress</span>
                    <span className="text-foreground font-semibold">
                      {um.progress} / {mission.target_count}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/50">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Rewards and Action Button */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div className="flex items-center gap-3 font-mono text-xs text-primary font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" /> +{mission.xp_reward} XP
                    </span>
                  </div>

                  {isClaimed ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-4 py-2 font-mono text-xs text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Claimed
                    </span>
                  ) : isCompleted || um.progress >= mission.target_count ? (
                    <button
                      onClick={() => handleClaim(mission.id)}
                      disabled={claimingId === mission.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 font-mono text-xs font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-transform active:scale-95"
                    >
                      {claimingId === mission.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Claiming...
                        </>
                      ) : (
                        <>
                          <Award className="h-3.5 w-3.5" /> Claim Reward
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="font-mono text-xs text-muted-foreground italic">In Progress</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}