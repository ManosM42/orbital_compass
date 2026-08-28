import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SpaceCameraView } from "@/components/SpaceCameraView";

export const Route = createFileRoute("/camera")({
  component: CameraRouteComponent,
});

const SATELLITES = [
  { noradId: 25544, name: "ISS (ZARYA)" },
  { noradId: 20580, name: "HUBBLE SPACE TELESCOPE" },
  { noradId: 44713, name: "STARLINK-3142" },
];

function CameraRouteComponent() {
  const [selectedSat, setSelectedSat] = useState(SATELLITES[0]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Space Observation Optics
          </h1>
          <p className="text-xs text-muted-foreground">
            Log sightings and cross-reference live orbital telemetry
          </p>
        </div>

        {/* Target Selector */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">Target:</span>
          <select
            value={selectedSat.noradId}
            onChange={(e) => {
              const found = SATELLITES.find((s) => s.noradId === Number(e.target.value));
              if (found) setSelectedSat(found);
            }}
            className="rounded-xl border border-border bg-card px-3 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary"
          >
            {SATELLITES.map((sat) => (
              <option key={sat.noradId} value={sat.noradId}>
                {sat.name} (NORAD #{sat.noradId})
              </option>
            ))}
          </select>
        </div>
      </div>

      <SpaceCameraView
        selectedSatellite={selectedSat}
        onSightingRecorded={() => {
          console.log("Sighting successfully logged!");
        }}
      />
    </div>
  );
}