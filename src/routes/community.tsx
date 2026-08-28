import { createFileRoute } from "@tanstack/react-router";
import { CommunityLeaderboardView } from "@/components/CommunityLeaderboardView";

export const Route = createFileRoute("/community")({
  component: LeaderboardRouteComponent,
});

function LeaderboardRouteComponent() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <CommunityLeaderboardView />
    </div>
  );
}