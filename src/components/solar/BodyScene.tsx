/**
 * BodyScene — the single reusable R3F scene for natural bodies.
 *
 * One scene serves three jobs so no page ever spins up a competing renderer:
 *   mode="system" → the Solar System overview (Sun + 8 planets on compressed orbits)
 *   mode="planet" → a single planet with its rings and major moons
 *   mode="moon"   → a single moon with its parent planet as a backdrop
 *
 * Everything here is *procedural*: sizes, colours, rotation directions and
 * relative orbit ordering come from the published reference values in
 * `solarSystemData`, but the rendering is schematic. No texture in this scene
 * is survey imagery, and no position is an ephemeris result — natural-body
 * positions are illustrative phase, not a computed ephemeris, and the UI says
 * so. Artificial-satellite positions (the only ones this app claims as real)
 * are computed by SGP4 elsewhere.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import {
  AdditiveBlending,
  BackSide,
  Color,
  DoubleSide,
  type Group,
  type Mesh,
} from "three";

import { PLANETS, SUN, type MoonBody, type PlanetBody } from "@/services/solar/solarSystemData";

export type SceneMode = "system" | "planet" | "moon";

export interface BodySceneProps {
  mode: SceneMode;
  planet?: PlanetBody | undefined;
  moon?: MoonBody | undefined;
  /** Slug of the highlighted body in system mode. */
  focus?: string | null | undefined;
  onSelectPlanet?: ((slug: string) => void) | undefined;
  reducedMotion: boolean;
  quality: "high" | "low";
}

/* ------------------------------------------------------------------ */
/* Shared primitives                                                    */
/* ------------------------------------------------------------------ */

function Atmosphere({ color, radius }: { color: string; radius: number }) {
  return (
    <mesh scale={radius * 1.06}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        color={new Color(color)}
        transparent
        opacity={0.16}
        side={BackSide}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function Rings({ color, radius }: { color: string; radius: number }) {
  return (
    <mesh rotation={[-Math.PI / 2.15, 0, 0]}>
      <ringGeometry args={[radius * 1.35, radius * 2.25, 96]} />
      <meshBasicMaterial
        color={new Color(color)}
        transparent
        opacity={0.45}
        side={DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function BodySphere({
  radius,
  color,
  accent,
  spin,
  segments,
  emissive = 0.06,
}: {
  radius: number;
  color: string;
  accent: string;
  spin: number;
  segments: number;
  emissive?: number;
}) {
  const ref = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += spin * dt;
  });
  return (
    <group>
      <mesh ref={ref} scale={radius}>
        <sphereGeometry args={[1, segments, segments]} />
        <meshStandardMaterial
          color={new Color(color)}
          emissive={new Color(accent)}
          emissiveIntensity={emissive}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>
      <Atmosphere color={accent} radius={radius} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* System mode                                                          */
/* ------------------------------------------------------------------ */

/** Compressed, non-linear radius/orbit mapping so every body stays visible. */
function systemRadius(p: PlanetBody) {
  return 0.16 + Math.pow(p.radiusKm / 69_911, 0.42) * 0.38;
}
function systemOrbit(p: PlanetBody) {
  return 2.1 + Math.pow(p.semiMajorAxisAu, 0.42) * 2.35;
}

function OrbitRing({ radius }: { radius: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.008, radius + 0.008, 160]} />
      <meshBasicMaterial color="#3d5570" transparent opacity={0.5} side={DoubleSide} />
    </mesh>
  );
}

function SystemPlanet({
  planet,
  focused,
  onSelect,
  speed,
}: {
  planet: PlanetBody;
  focused: boolean;
  onSelect?: ((slug: string) => void) | undefined;
  speed: number;
}) {
  const group = useRef<Group>(null);
  const orbit = systemOrbit(planet);
  const r = systemRadius(planet);
  const phase = useMemo(() => (planet.order * 47) % 360, [planet.order]);
  const rate = useMemo(() => 0.14 / Math.pow(planet.orbitalPeriodYears, 0.55), [planet]);

  useFrame((state) => {
    if (!group.current) return;
    const t = phase * (Math.PI / 180) + state.clock.elapsedTime * rate * speed;
    group.current.position.set(Math.cos(t) * orbit, 0, Math.sin(t) * orbit);
  });

  return (
    <>
      <OrbitRing radius={orbit} />
      <group ref={group}>
        <mesh
          scale={r}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(planet.slug);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "";
          }}
        >
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial
            color={new Color(planet.color)}
            emissive={new Color(planet.accent)}
            emissiveIntensity={focused ? 0.55 : 0.12}
            roughness={0.8}
          />
        </mesh>
        {planet.hasRings && planet.ringColor && (
          <Rings color={planet.ringColor} radius={r} />
        )}
        {focused && (
          <mesh scale={r * 1.9}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshBasicMaterial
              color={new Color(planet.accent)}
              transparent
              opacity={0.18}
              side={BackSide}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        )}
      </group>
    </>
  );
}

function Sun3D() {
  return (
    <group>
      <mesh scale={1.1}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial color={new Color(SUN.color)} />
      </mesh>
      <mesh scale={1.75}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color={new Color(SUN.accent)}
          transparent
          opacity={0.18}
          side={BackSide}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <pointLight intensity={180} distance={90} decay={2} color={SUN.color} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Planet / moon mode                                                   */
/* ------------------------------------------------------------------ */

function MoonOrbit({
  moon,
  index,
  count,
  speed,
}: {
  moon: MoonBody;
  index: number;
  count: number;
  speed: number;
}) {
  const group = useRef<Group>(null);
  const orbit = 2.1 + (index / Math.max(1, count - 1 || 1)) * 1.8;
  const r = 0.06 + Math.pow(moon.radiusKm / 2600, 0.5) * 0.16;
  const rate = 0.5 / Math.pow(moon.orbitalPeriodDays + 1, 0.6);

  useFrame((state) => {
    if (!group.current) return;
    const t = index * 1.3 + state.clock.elapsedTime * rate * speed;
    group.current.position.set(Math.cos(t) * orbit, Math.sin(t * 0.35) * 0.2, Math.sin(t) * orbit);
  });

  return (
    <>
      <OrbitRing radius={orbit} />
      <group ref={group}>
        <mesh scale={r}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshStandardMaterial
            color={new Color(moon.color)}
            emissive={new Color(moon.accent)}
            emissiveIntensity={0.12}
            roughness={0.9}
          />
        </mesh>
      </group>
    </>
  );
}

/* ------------------------------------------------------------------ */

export default function BodyScene({
  mode,
  planet,
  moon,
  focus,
  onSelectPlanet,
  reducedMotion,
  quality,
}: BodySceneProps) {
  const speed = reducedMotion ? 0 : 1;
  const segments = quality === "high" ? 64 : 32;

  return (
    <>
      <ambientLight intensity={mode === "system" ? 0.35 : 0.5} />
      <Stars
        radius={140}
        depth={60}
        count={quality === "high" ? 3500 : 1200}
        factor={4}
        fade
        speed={reducedMotion ? 0 : 0.4}
      />

      {mode === "system" ? (
        <>
          <Sun3D />
          {PLANETS.map((p) => (
            <SystemPlanet
              key={p.slug}
              planet={p}
              focused={focus === p.slug}
              onSelect={onSelectPlanet}
              speed={speed}
            />
          ))}
          <OrbitControls
            enablePan={false}
            minDistance={4}
            maxDistance={26}
            autoRotate={!reducedMotion}
            autoRotateSpeed={0.25}
            maxPolarAngle={Math.PI * 0.86}
          />
        </>
      ) : null}

      {mode === "planet" && planet ? (
        <>
          <directionalLight position={[6, 3, 5]} intensity={2.4} />
          <BodySphere
            radius={1.5}
            color={planet.color}
            accent={planet.accent}
            spin={reducedMotion ? 0 : (planet.rotationPeriodHours < 0 ? -1 : 1) * 0.12}
            segments={segments}
          />
          {planet.hasRings && planet.ringColor && (
            <Rings color={planet.ringColor} radius={1.5} />
          )}
          {planet.moons.map((m, i) => (
            <MoonOrbit
              key={m.slug}
              moon={m}
              index={i}
              count={planet.moons.length}
              speed={speed}
            />
          ))}
          <OrbitControls
            enablePan={false}
            minDistance={2.6}
            maxDistance={12}
            autoRotate={!reducedMotion}
            autoRotateSpeed={0.3}
          />
        </>
      ) : null}

      {mode === "moon" && moon ? (
        <>
          <directionalLight position={[6, 2, 4]} intensity={2.2} />
          <BodySphere
            radius={1.25}
            color={moon.color}
            accent={moon.accent}
            spin={reducedMotion ? 0 : 0.08}
            segments={segments}
          />
          {planet ? (
            <group position={[4.6, 0.6, -5]}>
              <mesh scale={1.5}>
                <sphereGeometry args={[1, 32, 32]} />
                <meshStandardMaterial
                  color={new Color(planet.color)}
                  emissive={new Color(planet.accent)}
                  emissiveIntensity={0.1}
                  roughness={0.9}
                />
              </mesh>
              {planet.hasRings && planet.ringColor && (
                <Rings color={planet.ringColor} radius={1.5} />
              )}
            </group>
          ) : null}
          <OrbitControls
            enablePan={false}
            minDistance={2.2}
            maxDistance={10}
            autoRotate={!reducedMotion}
            autoRotateSpeed={0.28}
          />
        </>
      ) : null}
    </>
  );
}
