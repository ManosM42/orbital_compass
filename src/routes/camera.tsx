import { createFileRoute } from "@tanstack/react-router";
import { SpaceCameraView } from "@/components/SpaceCameraView";
import { PageHeader } from "@/components/Chrome";

export const Route = createFileRoute("/camera")({
  head: () => ({
    meta: [
      { title: "Space Camera — ORBITAL Sighting Capture" },
      {
        name: "description",
        content: "Capture, verify, and document satellite passes with optical telemetry.",
      },
    ],
  }),
  component: SpaceCameraRoute,
});

function SpaceCameraRoute() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Optical Verification"
        title="Space Camera"
        description="Align your viewport to capture optical passes and verify satellite telemetry in real-time."
      />
      <div className="mt-8">
        <SpaceCameraView />
      </div>
    </div>
  );
}