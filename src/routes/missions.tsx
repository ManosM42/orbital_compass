import { createFileRoute } from "@tanstack/react-router";
import { MissionControlView } from "@/components/MissionControlView";
import { PageHeader } from "@/components/Chrome";

export const Route = createFileRoute("/missions")({
  head: () => ({
    meta: [
      { title: "Mission Control — ORBITAL" },
      {
        name: "description",
        content: "Track your orbital telemetry challenges, XP, and mission rewards.",
      },
    ],
  }),
  component: MissionsRoute,
});

function MissionsRoute() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Command Deck"
        title="Mission Control"
        description="Complete orbital telemetry challenges to earn XP, badges, and rewards."
      />
      <div className="mt-8">
        <MissionControlView />
      </div>
    </div>
  );
}
