/**
 * The WebGL scene behind ORBITAL's globe.
 *
 * Rendered in an Earth-fixed frame (see ./geo). Every satellite position and
 * trajectory that arrives here has already been produced by SGP4 from real
 * element sets — nothing in this file invents motion. The only artistic
 * licence is the surface imagery itself (stylised day / night / cloud maps
 * shipped with the app, not live imagery).
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { Line, OrbitControls, Stars } from "@react-three/drei";
import {
  AdditiveBlending,
  BackSide,
  Color,
  InstancedMesh,
  Matrix4,
  Object3D,
  Quaternion,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type Group,
  type Mesh,
  type ShaderMaterial,
} from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import dayMapUrl from "@/assets/earth-day.jpg";
import nightMapUrl from "@/assets/earth-night.jpg";
import cloudMapUrl from "@/assets/earth-clouds.jpg";

import type { TrailPoint } from "@/services/satellite/satellitePropagation";
import type { ObserverLocation, SatelliteState } from "@/services/satellite/satelliteTypes";
import { SatelliteModel } from "./SatelliteModels";
import { colorFor, geoToVec3, modelKind, R, sunDirection } from "./geo";

export type ViewMode = "orbit" | "satellite" | "ground";

export interface AnchorInfo {
  x: number;
  y: number;
  visible: boolean;
}

interface SceneProps {
  states: SatelliteState[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (h: { id: string; name: string; x: number; y: number } | null) => void;
  trail: TrailPoint[] | undefined;
  observer: ObserverLocation | null | undefined;
  mode: ViewMode;
  now: Date;
  /** Called every frame with the selected object's screen anchor. */
  onAnchor: (a: AnchorInfo) => void;
  quality: "high" | "low";
  /**
   * Resting camera distance for the current viewport, computed by the host so
   * the planet fills the intended fraction of the canvas on every form factor.
   */
  baseDistance: number;
}

/* ------------------------------------------------------------------ */
/* Earth                                                               */
/* ------------------------------------------------------------------ */

const earthVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const earthFrag = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform vec3 sunDir;
  uniform vec3 atmoColor;
  varying vec2 vUv;
  varying vec3 vNormalW;
  void main() {
    vec3 n = normalize(vNormalW);
    float d = dot(n, normalize(sunDir));
    float day = smoothstep(-0.12, 0.28, d);
    vec3 dayC = texture2D(dayMap, vUv).rgb;
    vec3 nightC = texture2D(nightMap, vUv).rgb;
    // city lights only survive on the dark side
    vec3 col = mix(nightC * 1.45, dayC * (0.35 + 0.75 * clamp(d, 0.0, 1.0)), day);
    // dusk warmth along the terminator
    float dusk = exp(-pow((d + 0.02) * 7.0, 2.0));
    col += atmoColor * dusk * 0.22;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const atmoVert = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vWorld;
  void main() {
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmoFrag = /* glsl */ `
  uniform vec3 sunDir;
  uniform vec3 glow;
  varying vec3 vNormalW;
  varying vec3 vWorld;
  void main() {
    vec3 n = normalize(vNormalW);
    vec3 v = normalize(cameraPosition - vWorld);
    float rim = pow(1.0 - abs(dot(n, v)), 2.6);
    float lit = clamp(dot(n, normalize(sunDir)) * 0.85 + 0.38, 0.0, 1.0);
    gl_FragColor = vec4(glow, rim * lit * 0.95);
  }
`;

function Earth({
  sunRef,
  quality,
}: {
  sunRef: React.MutableRefObject<Vector3>;
  quality: "high" | "low";
}) {
  const dayMap = useLoader(TextureLoader, dayMapUrl);
  const nightMap = useLoader(TextureLoader, nightMapUrl);
  const cloudMap = useLoader(TextureLoader, cloudMapUrl);
  useEffect(() => {
    for (const t of [dayMap, nightMap, cloudMap]) {
      t.colorSpace = SRGBColorSpace;
      t.anisotropy = 4;
    }
  }, [dayMap, nightMap, cloudMap]);

  const mat = useRef<ShaderMaterial>(null);
  const atmo = useRef<ShaderMaterial>(null);
  const clouds = useRef<Mesh>(null);

  const uniforms = useMemo(
    () => ({
      dayMap: { value: dayMap },
      nightMap: { value: nightMap },
      sunDir: { value: new Vector3(1, 0, 0) },
      atmoColor: { value: new Color("#5aa9ff") },
    }),
    [dayMap, nightMap],
  );
  const atmoUniforms = useMemo(
    () => ({ sunDir: { value: new Vector3(1, 0, 0) }, glow: { value: new Color("#4ea8ff") } }),
    [],
  );

  useFrame((_, dt) => {
    uniforms.sunDir.value.copy(sunRef.current);
    atmoUniforms.sunDir.value.copy(sunRef.current);
    if (clouds.current) clouds.current.rotation.y += dt * 0.0045;
    void mat.current;
    void atmo.current;
  });

  const seg = quality === "high" ? 96 : 48;

  return (
    <group>
      <mesh>
        <sphereGeometry args={[R, seg, seg / 2]} />
        <shaderMaterial
          ref={mat}
          vertexShader={earthVert}
          fragmentShader={earthFrag}
          uniforms={uniforms}
        />
      </mesh>

      {/* independently drifting cloud deck */}
      <mesh ref={clouds}>
        <sphereGeometry args={[R * 1.008, seg, seg / 2]} />
        <meshStandardMaterial
          map={cloudMap}
          alphaMap={cloudMap}
          transparent
          opacity={0.55}
          depthWrite={false}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* atmospheric shell */}
      <mesh scale={1.035}>
        <sphereGeometry args={[R, 64, 32]} />
        <shaderMaterial
          ref={atmo}
          vertexShader={atmoVert}
          fragmentShader={atmoFrag}
          uniforms={atmoUniforms}
          transparent
          blending={AdditiveBlending}
          side={BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Reference grid                                                      */
/* ------------------------------------------------------------------ */

function Graticule() {
  const lines = useMemo(() => {
    const out: [number, number, number][][] = [];
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts: [number, number, number][] = [];
      for (let lon = -180; lon <= 180; lon += 5) {
        const v = geoToVec3(lat, lon, 40);
        pts.push([v.x, v.y, v.z]);
      }
      out.push(pts);
    }
    for (let lon = -180; lon < 180; lon += 30) {
      const pts: [number, number, number][] = [];
      for (let lat = -85; lat <= 85; lat += 5) {
        const v = geoToVec3(lat, lon, 40);
        pts.push([v.x, v.y, v.z]);
      }
      out.push(pts);
    }
    return out;
  }, []);

  return (
    <group>
      {lines.map((pts, i) => (
        <Line key={i} points={pts} color="#7fd4ff" transparent opacity={0.12} lineWidth={1} />
      ))}
      <Line
        points={Array.from({ length: 73 }, (_, i) => {
          const v = geoToVec3(0, -180 + i * 5, 45);
          return [v.x, v.y, v.z] as [number, number, number];
        })}
        color="#7fd4ff"
        transparent
        opacity={0.28}
        lineWidth={1.2}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Satellites (instanced)                                              */
/* ------------------------------------------------------------------ */

const dummy = new Object3D();
const tmpV = new Vector3();

function Satellites({
  states,
  selectedId,
  onSelect,
  onHover,
}: Pick<SceneProps, "states" | "selectedId" | "onSelect" | "onHover">) {
  const meshRef = useRef<InstancedMesh>(null);
  const { size } = useThree();
  const count = Math.max(states.length, 1);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const color = new Color();
    states.forEach((s, i) => {
      geoToVec3(s.position.latitude, s.position.longitude, s.position.altitudeKm, tmpV);
      dummy.position.copy(tmpV);
      const scale =
        (s.satellite.category === "space-station" ? 0.03 : 0.019) *
        (s.satellite.id === selectedId ? 1.7 : 1);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.set(colorFor(s.satellite.category));
      if (!s.sunlit) color.multiplyScalar(0.68);
      mesh.setColorAt(i, color);
    });
    // park unused instances
    for (let i = states.length; i < count; i++) {
      dummy.position.set(0, 0, 0);
      dummy.scale.setScalar(0.0001);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [states, selectedId, count]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      frustumCulled
      onPointerMove={(e) => {
        e.stopPropagation();
        const i = e.instanceId;
        const s = i === undefined ? undefined : states[i];
        if (!s) return;
        onHover({
          id: s.satellite.id,
          name: s.satellite.name,
          x: (e.nativeEvent as PointerEvent).offsetX / size.width,
          y: (e.nativeEvent as PointerEvent).offsetY / size.height,
        });
      }}
      onPointerOut={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        const i = e.instanceId;
        const s = i === undefined ? undefined : states[i];
        if (s) onSelect(s.satellite.id);
      }}
    >
      <icosahedronGeometry args={[1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */
/* Focused satellite: model, rings, subpoint, trail                    */
/* ------------------------------------------------------------------ */

const up = new Vector3(0, 1, 0);
const q = new Quaternion();
const m4 = new Matrix4();

function Focus({
  state,
  trail,
  onAnchor,
}: {
  state: SatelliteState;
  trail: TrailPoint[] | undefined;
  onAnchor: (a: AnchorInfo) => void;
}) {
  const group = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const scan = useRef<Mesh>(null);
  const { camera } = useThree();

  const pos = useMemo(
    () =>
      geoToVec3(
        state.position.latitude,
        state.position.longitude,
        state.position.altitudeKm,
        new Vector3(),
      ),
    [state],
  );
  const sub = useMemo(
    () => geoToVec3(state.position.latitude, state.position.longitude, 0, new Vector3()),
    [state],
  );

  /** Heading taken from the real ground track so the model flies nose-first. */
  const velocity = useMemo(() => {
    if (!trail || trail.length < 3) return new Vector3(0, 1, 0);
    let best = 0;
    for (let i = 1; i < trail.length; i++) {
      if (Math.abs(trail[i]!.offsetMin) < Math.abs(trail[best]!.offsetMin)) best = i;
    }
    const a = trail[Math.max(0, best - 1)]!;
    const b = trail[Math.min(trail.length - 1, best + 1)]!;
    const va = geoToVec3(a.latitude, a.longitude, a.altitudeKm, new Vector3());
    const vb = geoToVec3(b.latitude, b.longitude, b.altitudeKm, new Vector3());
    const d = vb.sub(va);
    return d.lengthSq() > 1e-9 ? d.normalize() : new Vector3(0, 1, 0);
  }, [trail]);

  const { past, future } = useMemo(() => {
    const p: [number, number, number][] = [];
    const f: [number, number, number][] = [];
    for (const t of trail ?? []) {
      const v = geoToVec3(t.latitude, t.longitude, t.altitudeKm, new Vector3());
      (t.offsetMin <= 0 ? p : f).push([v.x, v.y, v.z]);
    }
    if (p.length && f.length) f.unshift(p[p.length - 1]!);
    return { past: p, future: f };
  }, [trail]);

  useFrame((st, dt) => {
    const g = group.current;
    if (g) {
      g.position.lerp(pos, Math.min(1, dt * 6));
      const nadir = g.position.clone().normalize().multiplyScalar(-1);
      const fwd = velocity.clone();
      m4.lookAt(new Vector3(0, 0, 0), fwd, nadir.clone().multiplyScalar(-1));
      q.setFromRotationMatrix(m4);
      g.quaternion.slerp(q, Math.min(1, dt * 4));
      g.rotateY(0);
    }
    if (ring.current) {
      ring.current.position.copy(pos);
      ring.current.lookAt(camera.position);
    }
    if (scan.current) {
      const t = (st.clock.elapsedTime % 2.4) / 2.4;
      scan.current.position.copy(pos);
      scan.current.lookAt(camera.position);
      scan.current.scale.setScalar(0.4 + t * 2.4);
      const mm = scan.current.material as { opacity: number };
      mm.opacity = 0.5 * (1 - t);
    }
    // screen anchor for the holographic panel
    tmpV.copy(pos).project(camera);
    const front = tmpV.z < 1;
    onAnchor({ x: (tmpV.x * 0.5 + 0.5) * 100, y: (-tmpV.y * 0.5 + 0.5) * 100, visible: front });
    void up;
  });

  const color = colorFor(state.satellite.category);

  return (
    <group>
      <group ref={group}>
        <SatelliteModel kind={modelKind(state.satellite.category)} scale={0.045} />
      </group>

      {/* selection + scanning rings */}
      <mesh ref={ring}>
        <ringGeometry args={[0.05, 0.056, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} toneMapped={false} />
      </mesh>
      <mesh ref={scan}>
        <ringGeometry args={[0.045, 0.05, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} toneMapped={false} />
      </mesh>

      {/* nadir beam + sub-satellite point */}
      <Line
        points={[
          [pos.x, pos.y, pos.z],
          [sub.x, sub.y, sub.z],
        ]}
        color={color}
        transparent
        opacity={0.35}
        lineWidth={1}
        dashed
        dashSize={0.02}
        gapSize={0.02}
      />
      <mesh position={sub} onUpdate={(mm) => mm.lookAt(0, 0, 0)}>
        <ringGeometry args={[0.018, 0.024, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} side={2} toneMapped={false} />
      </mesh>

      {past.length > 1 && (
        <Line points={past} color={color} transparent opacity={0.45} lineWidth={1.6} />
      )}
      {future.length > 1 && (
        <Line points={future} color={color} transparent opacity={1} lineWidth={2.2} />
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Camera                                                              */
/* ------------------------------------------------------------------ */

function CameraRig({
  mode,
  focus,
  observer,
  controls,
  baseDistance,
}: {
  mode: ViewMode;
  focus: Vector3 | null;
  observer: ObserverLocation | null | undefined;
  controls: React.MutableRefObject<OrbitControlsImpl | null>;
  baseDistance: number;
}) {
  const { camera } = useThree();
  const desiredTarget = useRef(new Vector3(0, 0, 0));
  const desiredDist = useRef(baseDistance);
  /**
   * Distance is only driven while a transition is playing. Once the move has
   * settled we hand the dolly back to OrbitControls so the user's own zoom is
   * never fought by the rig.
   */
  const settling = useRef(true);
  const lastKey = useRef("");
  const prevTarget = useRef(new Vector3(0, 0, 0));

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    const k = Math.min(1, dt * 1.8);

    const key = `${mode}|${focus ? "focus" : "free"}|${baseDistance.toFixed(3)}`;
    if (key !== lastKey.current) {
      lastKey.current = key;
      settling.current = true;
    }

    if (mode === "satellite" && focus) {
      desiredTarget.current.copy(focus);
      desiredDist.current = Math.max(0.45, baseDistance * 0.2);
    } else if (mode === "ground" && observer) {
      desiredTarget.current.copy(
        focus ?? geoToVec3(observer.latitude, observer.longitude, 2000, new Vector3()),
      );
      desiredDist.current = Math.max(1.2, baseDistance * 0.42);
    } else {
      desiredTarget.current.copy(focus ?? new Vector3(0, 0, 0)).multiplyScalar(focus ? 0.3 : 0);
      desiredDist.current = focus ? baseDistance * 0.94 : baseDistance;
    }

    prevTarget.current.copy(c.target);
    c.target.lerp(desiredTarget.current, k);
    if (settling.current) {
      const dir = camera.position.clone().sub(c.target);
      const dist = dir.length();
      const next = dist + (desiredDist.current - dist) * k;
      camera.position.copy(c.target).add(dir.normalize().multiplyScalar(next));
      if (Math.abs(desiredDist.current - next) < desiredDist.current * 0.005) {
        settling.current = false;
      }
    } else {
      // keep the user's own zoom, but ride along with a moving target
      camera.position.add(c.target.clone().sub(prevTarget.current));
    }
    c.update();
  });
  return null;
}

/* ------------------------------------------------------------------ */
/* Scene root                                                          */
/* ------------------------------------------------------------------ */

export function Scene({
  states,
  selectedId,
  onSelect,
  onHover,
  trail,
  observer,
  mode,
  now,
  onAnchor,
  quality,
  baseDistance,
}: SceneProps) {
  const sunRef = useRef(new Vector3(1, 0.2, 0.4).normalize());
  const light = useRef<import("three").DirectionalLight>(null);
  const controls = useRef<OrbitControlsImpl | null>(null);

  useEffect(() => {
    sunDirection(now, sunRef.current);
    if (light.current) light.current.position.copy(sunRef.current).multiplyScalar(8);
  }, [now]);

  const selected = states.find((s) => s.satellite.id === selectedId) ?? null;
  const focus = selected
    ? geoToVec3(
        selected.position.latitude,
        selected.position.longitude,
        selected.position.altitudeKm,
        new Vector3(),
      )
    : null;

  const observerPos = observer
    ? geoToVec3(observer.latitude, observer.longitude, 0, new Vector3())
    : null;

  return (
    <>
      <ambientLight intensity={0.18} />
      <directionalLight ref={light} intensity={2.1} position={[5, 2, 4]} />
      <Stars
        radius={40}
        depth={40}
        count={quality === "high" ? 4500 : 1500}
        factor={2.6}
        saturation={0.4}
        fade
        speed={0.4}
      />

      {/* faint nebula wash */}
      <mesh scale={60}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial
          color="#0a1430"
          side={BackSide}
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </mesh>

      <Earth sunRef={sunRef} quality={quality} />
      <Graticule />

      {observerPos && (
        <mesh position={observerPos} onUpdate={(mm) => mm.lookAt(0, 0, 0)}>
          <ringGeometry args={[0.012, 0.018, 24]} />
          <meshBasicMaterial color="#ffd166" side={2} toneMapped={false} />
        </mesh>
      )}

      <Satellites states={states} selectedId={selectedId} onSelect={onSelect} onHover={onHover} />
      {selected && <Focus state={selected} trail={trail} onAnchor={onAnchor} />}

      <OrbitControls
        ref={controls as never}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.45}
        minDistance={1.14}
        maxDistance={Math.max(6, baseDistance * 2.2)}
        autoRotate={!selectedId && mode === "orbit"}
        autoRotateSpeed={0.28}
      />
      <CameraRig
        mode={mode}
        focus={focus}
        observer={observer}
        controls={controls}
        baseDistance={baseDistance}
      />
    </>
  );
}
