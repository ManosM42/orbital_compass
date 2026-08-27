import { createFileRoute } from "@tanstack/react-router";
import { CommunityLeaderboardView } from "@/components/CommunityLeaderboardView";
import { PageHeader } from "@/components/Chrome";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Global Leaderboard — ORBITAL Community Progression" },
      {
        name: "description",
        content: "Privacy-safe global commander rankings, sighting metrics, and regional stats.",
      },
    ],
  }),
  component: CommunityRoute,
});

function CommunityRoute() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Global Network"
        title="Commander Leaderboard"
        description="Privacy-focused aggregate ranking based on verified satellite sightings and mission XP."
      />
      <div className="mt-8">
        <CommunityLeaderboardView />
      </div>
    </div>
  );
}