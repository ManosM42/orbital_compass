/**
 * Reusable, low-poly satellite models. Geometries and materials are created
 * once at module level and shared by every instance so that swapping the
 * focused object costs nothing.
 */

import { useMemo } from "react";
import {
  BoxGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  SphereGeometry,
  ConeGeometry,
} from "three";
import type { ModelKind } from "./geo";

const box = new BoxGeometry(1, 1, 1);
const cyl = new CylinderGeometry(0.5, 0.5, 1, 12);
const sphere = new SphereGeometry(0.5, 12, 10);
const cone = new ConeGeometry(0.5, 1, 14, 1, true);

const bodyMat = new MeshStandardMaterial({
  color: "#d7dee8",
  metalness: 0.8,
  roughness: 0.35,
});
const goldMat = new MeshStandardMaterial({
  color: "#d8a24a",
  metalness: 0.9,
  roughness: 0.3,
});
const panelMat = new MeshStandardMaterial({
  color: "#16305c",
  metalness: 0.6,
  roughness: 0.25,
  emissive: "#0b1c3a",
  emissiveIntensity: 0.6,
});
const dishMat = new MeshStandardMaterial({
  color: "#eef2f7",
  metalness: 0.3,
  roughness: 0.6,
  side: 2,
});

/** Local frame: +X = velocity, +Y = orbit normal, +Z = nadir-ish. */
function Iss() {
  return (
    <group>
      {/* main truss */}
      <mesh
        geometry={cyl}
        material={bodyMat}
        rotation={[0, 0, Math.PI / 2]}
        scale={[0.09, 2.4, 0.09]}
      />
      {/* pressurised modules */}
      <mesh
        geometry={cyl}
        material={bodyMat}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[0.16, 1.1, 0.16]}
      />
      <mesh
        geometry={cyl}
        material={goldMat}
        rotation={[0, 0, Math.PI / 2]}
        scale={[0.14, 0.7, 0.14]}
        position={[0, 0, 0.28]}
      />
      {/* four solar array pairs */}
      {[-1.05, -0.62, 0.62, 1.05].map((x, i) => (
        <mesh
          key={i}
          geometry={box}
          material={panelMat}
          position={[x, 0, 0]}
          scale={[0.36, 0.012, 1.5]}
        />
      ))}
      {/* radiators */}
      {[-0.3, 0.3].map((x) => (
        <mesh
          key={x}
          geometry={box}
          material={bodyMat}
          position={[x, 0.28, 0]}
          scale={[0.5, 0.01, 0.42]}
        />
      ))}
    </group>
  );
}

function Starlink() {
  return (
    <group>
      <mesh geometry={box} material={bodyMat} scale={[0.7, 0.16, 0.5]} />
      <mesh geometry={box} material={panelMat} position={[0, 0, 1.35]} scale={[0.62, 0.02, 2.2]} />
      <mesh geometry={box} material={goldMat} position={[0, -0.12, 0]} scale={[0.4, 0.06, 0.34]} />
    </group>
  );
}

function Gps() {
  return (
    <group>
      <mesh geometry={box} material={goldMat} scale={[0.5, 0.5, 0.6]} />
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          geometry={box}
          material={panelMat}
          position={[0, s * 1.15, 0]}
          scale={[0.5, 1.8, 0.02]}
        />
      ))}
      <mesh
        geometry={cone}
        material={dishMat}
        position={[0, 0, 0.45]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[0.42, 0.3, 0.42]}
      />
    </group>
  );
}

function Weather() {
  return (
    <group>
      <mesh
        geometry={cyl}
        material={bodyMat}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[0.42, 0.9, 0.42]}
      />
      <mesh geometry={box} material={panelMat} position={[0, 1.15, 0]} scale={[0.42, 1.9, 0.02]} />
      <mesh
        geometry={cone}
        material={dishMat}
        position={[0, 0, 0.62]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[0.55, 0.36, 0.55]}
      />
      <mesh geometry={sphere} material={goldMat} position={[0, 0, -0.55]} scale={0.34} />
    </group>
  );
}

function Generic() {
  return (
    <group>
      <mesh geometry={box} material={bodyMat} scale={[0.5, 0.42, 0.52]} />
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          geometry={box}
          material={panelMat}
          position={[s * 0.95, 0, 0]}
          scale={[1.3, 0.02, 0.5]}
        />
      ))}
      <mesh
        geometry={cyl}
        material={goldMat}
        position={[0, 0, 0.42]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[0.06, 0.4, 0.06]}
      />
    </group>
  );
}

export function SatelliteModel({ kind, scale = 1 }: { kind: ModelKind; scale?: number }) {
  const body = useMemo(() => {
    switch (kind) {
      case "iss":
        return <Iss />;
      case "starlink":
        return <Starlink />;
      case "gps":
        return <Gps />;
      case "weather":
        return <Weather />;
      default:
        return <Generic />;
    }
  }, [kind]);
  return <group scale={scale}>{body}</group>;
}
