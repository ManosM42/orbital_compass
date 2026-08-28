import React, { useEffect, useRef, useState } from 'react';

// --- TYPES ---
interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

interface Bullet extends GameObject {}

interface Meteor extends GameObject {
  rotation: number;
  rotSpeed: number;
  color: string;
}

interface EnemyShip extends GameObject {
  shootTimer: number;
  color: string;
}

interface EnemyBullet extends GameObject {
  color: string;
}

interface HeartPickup extends GameObject {}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
  life: number;
  maxLife: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

interface Boss {
  x: number;
  y: number;
  width: number;
  height: number;
  maxHealth: number;
  health: number;
  speed: number;
  direction: number;
  shootTimer: number;
  color: string;
  secondary: string;
}

// Preset color themes mapped by score tier multipliers (200, 400, 600...)
const THEME_COLORS = [
  { primary: '#38bdf8', secondary: '#0284c7', glow: '#7dd3fc' }, // Cyan / Sky
  { primary: '#a855f7', secondary: '#7e22ce', glow: '#d8b4fe' }, // Purple / Violet
  { primary: '#ec4899', secondary: '#be185d', glow: '#f472b6' }, // Pink / Rose
  { primary: '#eab308', secondary: '#a16207', glow: '#fde047' }, // Yellow / Amber
  { primary: '#10b981', secondary: '#047857', glow: '#6ee7b7' }, // Emerald / Green
];

export default function ArcadeGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'GAMEOVER'>('IDLE');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [hearts, setHearts] = useState<number>(5);
  const [bossActive, setBossActive] = useState<boolean>(false);
  const [bossHealthPercent, setBossHealthPercent] = useState<number>(100);

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const scoreRef = useRef(0);
  scoreRef.current = score;

  const isDraggingRef = useRef(false);
  const playerRef = useRef({ x: 800 / 2 - 25, y: 500 - 70, width: 50, height: 40, speed: 6 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const WIDTH = 800;
    const HEIGHT = 500;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let player = playerRef.current;
    player.x = WIDTH / 2 - player.width / 2;
    player.y = HEIGHT - 70;

    let bullets: Bullet[] = [];
    let meteors: Meteor[] = [];
    let enemyShips: EnemyShip[] = [];
    let enemyBullets: EnemyBullet[] = [];
    let heartPickups: HeartPickup[] = [];
    let particles: Particle[] = [];
    let shockwaves: Shockwave[] = [];
    let currentBoss: Boss | null = null;
    let pendingBossTrigger = false;

    // Multi-layered starfield setup
    let stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      size: Math.random() * 2.5 + 0.5,
      alpha: Math.random(),
      speed: Math.random() * 0.8 + 0.2
    }));

    const getTierTheme = (currentScore: number) => {
      const tierIndex = Math.floor(currentScore / 200) % THEME_COLORS.length;
      return THEME_COLORS[tierIndex];
    };

    // Input handlers
    const keys: { [key: string]: boolean } = {};
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', ' ', 'Space'].includes(e.key)) {
        if (gameStateRef.current === 'PLAYING') e.preventDefault();
      }
      keys[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const getCanvasCoordinates = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * (WIDTH / rect.width),
        y: (clientY - rect.top) * (HEIGHT / rect.height)
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (gameStateRef.current !== 'PLAYING') return;
      const touch = e.touches[0];
      const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
      if (
        coords.x >= player.x - 30 &&
        coords.x <= player.x + player.width + 30 &&
        coords.y >= player.y - 30 &&
        coords.y <= player.y + player.height + 30
      ) {
        isDraggingRef.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || gameStateRef.current !== 'PLAYING') return;
      e.preventDefault();
      const touch = e.touches[0];
      const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
      player.x = Math.max(10, Math.min(WIDTH - player.width - 10, coords.x - player.width / 2));
    };

    const handleTouchEnd = () => { isDraggingRef.current = false; };

    const handleMouseDown = (e: MouseEvent) => {
      if (gameStateRef.current !== 'PLAYING') return;
      const coords = getCanvasCoordinates(e.clientX, e.clientY);
      if (
        coords.x >= player.x - 30 &&
        coords.x <= player.x + player.width + 30 &&
        coords.y >= player.y - 30 &&
        coords.y <= player.y + player.height + 30
      ) {
        isDraggingRef.current = true;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || gameStateRef.current !== 'PLAYING') return;
      const coords = getCanvasCoordinates(e.clientX, e.clientY);
      player.x = Math.max(10, Math.min(WIDTH - player.width - 10, coords.x - player.width / 2));
    };

    const handleMouseUp = () => { isDraggingRef.current = false; };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    const createCinematicExplosion = (x: number, y: number, color: string, intensity = 1) => {
      shockwaves.push({ x, y, radius: 5, maxRadius: 40 * intensity, color, alpha: 0.8 });
      for (let i = 0; i < 25 * intensity; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 1;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: Math.random() > 0.5 ? color : '#ffffff',
          alpha: 1,
          size: Math.random() * 4 + 1.5,
          life: 0,
          maxLife: Math.random() * 30 + 20
        });
      }
    };

    let meteorTimer = 0;
    let enemyTimer = 0;
    let animationFrameId: number;

    const updateGame = () => {
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      stars.forEach(star => {
        star.y += star.speed;
        if (star.y > HEIGHT) star.y = 0;
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });

      if (gameStateRef.current === 'PLAYING') {
        if ((keys['ArrowLeft'] || keys['a']) && player.x > 10) player.x -= player.speed;
        if ((keys['ArrowRight'] || keys['d']) && player.x < WIDTH - player.width - 10) player.x += player.speed;

        if ((keys[' '] || keys['Space']) && !(keys as any).spaceLocked) {
          bullets.push({ x: player.x + player.width / 2 - 3, y: player.y, width: 6, height: 16, speed: 10 });
          (keys as any).spaceLocked = true;
          setTimeout(() => { (keys as any).spaceLocked = false; }, 180);
        }

        const currentScore = scoreRef.current;
        const activeTheme = getTierTheme(currentScore);

        // --- BULLET-PROOF 200-POINT BOSS TRIGGER CHECK ---
        // Whenever the score hits a multiple of 200 and no boss is currently active, flag the spawn.
        if (currentScore > 0 && currentScore % 200 === 0 && !currentBoss && !pendingBossTrigger) {
          pendingBossTrigger = true;
        }

        // Trigger boss instantiation when flagged
        if (pendingBossTrigger && !currentBoss) {
          pendingBossTrigger = false;
          currentBoss = {
            x: WIDTH / 2 - 75,
            y: -100,
            width: 150,
            height: 70,
            maxHealth: 35,
            health: 35,
            speed: 1.5,
            direction: 1,
            shootTimer: 0,
            color: activeTheme.primary,
            secondary: activeTheme.secondary
          };
          setBossActive(true);
          setBossHealthPercent(100);
          
          // Clear active small meteors and enemy ships so ONLY the boss appears
          meteors = [];
          enemyShips = [];
        }

        // Normal Spawning (Strictly suspended if a boss is active)
        if (!currentBoss) {
          meteorTimer++;
          if (meteorTimer > 65) {
            meteors.push({
              x: Math.random() * (WIDTH - 40),
              y: -50,
              width: Math.random() * 30 + 25,
              height: Math.random() * 30 + 25,
              speed: Math.random() * 2.5 + 2,
              rotation: 0,
              rotSpeed: (Math.random() - 0.5) * 0.04,
              color: activeTheme.secondary
            });
            meteorTimer = 0;
          }

          enemyTimer++;
          if (enemyTimer > 140) {
            enemyShips.push({
              x: Math.random() * (WIDTH - 50),
              y: -40,
              width: 44,
              height: 32,
              speed: 1.8,
              shootTimer: 0,
              color: activeTheme.primary
            });
            enemyTimer = 0;
          }
        }

        // --- UPDATE BOSS ---
        if (currentBoss) {
          if (currentBoss.y < 50) {
            currentBoss.y += currentBoss.speed;
          } else {
            currentBoss.x += currentBoss.speed * currentBoss.direction;
            if (currentBoss.x <= 30 || currentBoss.x >= WIDTH - currentBoss.width - 30) {
              currentBoss.direction *= -1;
            }
          }

          currentBoss.shootTimer++;
          if (currentBoss.shootTimer > 45) {
            enemyBullets.push({ x: currentBoss.x + 30, y: currentBoss.y + currentBoss.height, width: 6, height: 14, speed: 5, color: currentBoss.color });
            enemyBullets.push({ x: currentBoss.x + currentBoss.width - 36, y: currentBoss.y + currentBoss.height, width: 6, height: 14, speed: 5, color: currentBoss.color });
            currentBoss.shootTimer = 0;
          }

          bullets.forEach((b, bIndex) => {
            if (currentBoss &&
              b.x < currentBoss.x + currentBoss.width &&
              b.x + b.width > currentBoss.x &&
              b.y < currentBoss.y + currentBoss.height &&
              b.y + b.height > currentBoss.y
            ) {
              bullets.splice(bIndex, 1);
              currentBoss.health -= 1;
              setBossHealthPercent(Math.max(0, Math.floor((currentBoss.health / currentBoss.maxHealth) * 100)));
              createCinematicExplosion(b.x, b.y, currentBoss.color, 0.4);

              if (currentBoss.health <= 0) {
                const bossCenterX = currentBoss.x + currentBoss.width / 2;
                const bossCenterY = currentBoss.y + currentBoss.height / 2;
                createCinematicExplosion(bossCenterX, bossCenterY, currentBoss.color, 2.5);
                
                // Spawn falling bonus hearts filling max health (5 hearts)
                for (let h = 0; h < 3; h++) {
                  heartPickups.push({
                    x: bossCenterX + (h - 1) * 35,
                    y: bossCenterY,
                    width: 24,
                    height: 24,
                    speed: 2
                  });
                }

                setScore(s => {
                  const ns = s + 100;
                  if (ns > highScore) setHighScore(ns);
                  return ns;
                });
                currentBoss = null;
                setBossActive(false);
              }
            }
          });
        }

        // Update Heart Pickups
        heartPickups.forEach((hp, hpIndex) => {
          hp.y += hp.speed;
          
          if (
            player.x < hp.x + hp.width &&
            player.x + player.width > hp.x &&
            player.y < hp.y + hp.height &&
            player.y + player.height > hp.y
          ) {
            heartPickups.splice(hpIndex, 1);
            setHearts(5); // Refills health to full
          }

          if (hp.y > HEIGHT) {
            heartPickups.splice(hpIndex, 1);
          }
        });

        // Update Bullets
        bullets.forEach((b, index) => {
          b.y -= b.speed;
          if (b.y < 0) bullets.splice(index, 1);
        });

        // Update Meteors
        meteors.forEach((m, mIndex) => {
          m.y += m.speed;
          m.rotation += m.rotSpeed;

          if (
            player.x < m.x + m.width &&
            player.x + player.width > m.x &&
            player.y < m.y + m.height &&
            player.y + player.height > m.y
          ) {
            meteors.splice(mIndex, 1);
            createCinematicExplosion(m.x + m.width / 2, m.y + m.height / 2, m.color, 1.2);
            setHearts(prev => {
              const next = prev - 1;
              if (next <= 0) setGameState('GAMEOVER');
              return next;
            });
          }

          bullets.forEach((b, bIndex) => {
            if (
              b.x < m.x + m.width &&
              b.x + b.width > m.x &&
              b.y < m.y + m.height &&
              b.y + b.height > m.y
            ) {
              meteors.splice(mIndex, 1);
              bullets.splice(bIndex, 1);
              createCinematicExplosion(m.x + m.width / 2, m.y + m.height / 2, m.color, 0.8);
              setScore(s => {
                const ns = s + 10;
                if (ns > highScore) setHighScore(ns);
                return ns;
              });
            }
          });

          if (m.y > HEIGHT) meteors.splice(mIndex, 1);
        });

        // Update Enemy Ships
        enemyShips.forEach((e, eIndex) => {
          e.y += e.speed;
          e.shootTimer++;
          if (e.shootTimer > 80) {
            enemyBullets.push({ x: e.x + e.width / 2 - 2, y: e.y + e.height, width: 4, height: 12, speed: 4, color: e.color });
            e.shootTimer = 0;
          }

          bullets.forEach((b, bIndex) => {
            if (
              b.x < e.x + e.width &&
              b.x + b.width > e.x &&
              b.y < e.y + e.height &&
              b.y + b.height > e.y
            ) {
              enemyShips.splice(eIndex, 1);
              bullets.splice(bIndex, 1);
              createCinematicExplosion(e.x + e.width / 2, e.y + e.height / 2, e.color, 1);
              setScore(s => {
                const ns = s + 25;
                if (ns > highScore) setHighScore(ns);
                return ns;
              });
            }
          });

          if (
            player.x < e.x + e.width &&
            player.x + player.width > e.x &&
            player.y < e.y + e.height &&
            player.y + player.height > e.y
          ) {
            enemyShips.splice(eIndex, 1);
            createCinematicExplosion(e.x + e.width / 2, e.y + e.height / 2, e.color, 1.2);
            setHearts(prev => {
              const next = prev - 1;
              if (next <= 0) setGameState('GAMEOVER');
              return next;
            });
          }

          if (e.y > HEIGHT) enemyShips.splice(eIndex, 1);
        });

        // Enemy Bullets
        enemyBullets.forEach((eb, ebIndex) => {
          eb.y += eb.speed;
          if (
            player.x < eb.x + eb.width &&
            player.x + player.width > eb.x &&
            player.y < eb.y + eb.height &&
            player.y + player.height > eb.y
          ) {
            enemyBullets.splice(ebIndex, 1);
            createCinematicExplosion(player.x + player.width / 2, player.y + player.height / 2, eb.color, 0.9);
            setHearts(prev => {
              const next = prev - 1;
              if (next <= 0) setGameState('GAMEOVER');
              return next;
            });
          }
          if (eb.y > HEIGHT) enemyBullets.splice(ebIndex, 1);
        });
      }

      // --- RENDER SHOCKWAVES & PARTICLES ---
      shockwaves.forEach((sw, idx) => {
        sw.radius += 2.5;
        sw.alpha -= 0.04;
        if (sw.alpha <= 0) {
          shockwaves.splice(idx, 1);
          return;
        }
        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = sw.alpha;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      });

      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        p.alpha = 1 - p.life / p.maxLife;
        if (p.life >= p.maxLife) {
          particles.splice(idx, 1);
          return;
        }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.restore();
      });

      // --- RENDER PLAYER SATELLITE ---
      ctx.save();
      ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
      
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#38bdf8';
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-28, -6, 20, 12);
      ctx.fillRect(8, -6, 20, 12);
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-28, -6, 20, 12);
      ctx.strokeRect(8, -6, 20, 12);

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -20);
      ctx.stroke();

      ctx.restore();

      // --- RENDER BOSS (If Active) ---
      if (currentBoss) {
        ctx.save();
        ctx.translate(currentBoss.x + currentBoss.width / 2, currentBoss.y + currentBoss.height / 2);
        ctx.shadowBlur = 20;
        ctx.shadowColor = currentBoss.color;
        ctx.fillStyle = currentBoss.secondary;
        ctx.strokeStyle = currentBoss.color;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(0, currentBoss.height / 2);
        ctx.lineTo(-currentBoss.width / 2, -currentBoss.height / 3);
        ctx.lineTo(-currentBoss.width / 4, -currentBoss.height / 2);
        ctx.lineTo(0, -currentBoss.height / 3);
        ctx.lineTo(currentBoss.width / 4, -currentBoss.height / 2);
        ctx.lineTo(currentBoss.width / 2, -currentBoss.height / 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // --- RENDER HEART PICKUPS ---
      heartPickups.forEach(hp => {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ef4444';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❤️', hp.x + hp.width / 2, hp.y + hp.height / 2);
        ctx.restore();
      });

      // --- RENDER BULLETS ---
      bullets.forEach(b => {
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#4ade80';
        ctx.fillStyle = '#bbf7d0';
        ctx.fillRect(b.x, b.y, b.width, b.height);
        ctx.restore();
      });

      // --- RENDER METEORS ---
      meteors.forEach(m => {
        ctx.save();
        ctx.translate(m.x + m.width / 2, m.y + m.height / 2);
        ctx.rotate(m.rotation);
        ctx.fillStyle = m.secondary;
        ctx.strokeStyle = m.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const r = m.width / 2;
        ctx.moveTo(-r * 0.8, -r * 0.6);
        ctx.lineTo(r * 0.5, -r * 0.9);
        ctx.lineTo(r * 0.9, r * 0.3);
        ctx.lineTo(r * 0.2, r * 0.9);
        ctx.lineTo(-r * 0.7, r * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      // --- RENDER ENEMY SHIPS ---
      enemyShips.forEach(e => {
        ctx.save();
        ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.moveTo(0, 16);
        ctx.lineTo(-22, -10);
        ctx.lineTo(-8, -4);
        ctx.lineTo(0, -16);
        ctx.lineTo(8, -4);
        ctx.lineTo(22, -10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // --- RENDER ENEMY BULLETS ---
      enemyBullets.forEach(eb => {
        ctx.fillStyle = eb.color;
        ctx.fillRect(eb.x, eb.y, eb.width, eb.height);
      });

      animationFrameId = requestAnimationFrame(updateGame);
    };

    animationFrameId = requestAnimationFrame(updateGame);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [gameState]);

  const shootNeonBullet = () => {
    if (gameStateRef.current !== 'PLAYING') return;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    setTimeout(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }));
    }, 50);
  };

  const startGame = () => {
    setScore(0);
    setHearts(5);
    setBossActive(false);
    setGameState('PLAYING');
  };

  return (
    <div className="w-full flex flex-col items-center justify-center bg-slate-950 py-10 px-4 font-sans select-none">
      <div className="text-center mb-4">
        <span className="text-xs uppercase tracking-widest text-sky-400 font-bold px-3 py-1 bg-sky-950/60 rounded-full border border-sky-800/50">
          Orbital Compass Interactive Arcade
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-2 tracking-wide">
          SATELLITE DEFENDER: BOSS EDITION
        </h2>
      </div>

      <div className="relative flex items-center justify-center w-full max-w-4xl">
        
        {/* GAME CANVAS & HUD CONTAINER */}
        <div className="relative border-4 border-slate-800 rounded-2xl overflow-hidden shadow-2xl bg-black w-full max-w-[800px]">
          
          {/* TOP HUD BAR */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 pointer-events-none bg-gradient-to-b from-slate-950/90 to-transparent">
            <div className="flex items-center gap-1 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 mr-1">SHIELD:</span>
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={`text-sm ${i < hearts ? 'text-red-500 animate-pulse' : 'text-slate-700'}`}>
                  ❤️
                </span>
              ))}
            </div>

            {/* BOSS HEALTH BAR */}
            {bossActive && (
              <div className="flex flex-col items-center bg-red-950/90 px-4 py-1.5 rounded-lg border border-red-700 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                <span className="text-[9px] font-extrabold tracking-widest text-red-300">⚠️ ROGUE ALIEN CRUISER ⚠️</span>
                <div className="w-32 md:w-48 h-2.5 bg-slate-950 rounded-full overflow-hidden border border-red-500 mt-1">
                  <div className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-200" style={{ width: `${bossHealthPercent}%` }}></div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 bg-slate-900/90 px-4 py-1.5 rounded-lg border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 mr-1.5">SCORE:</span>
                <span className="text-sky-400 font-mono font-bold">{score}</span>
              </div>
              <div className="border-l border-slate-700 pl-3">
                <span className="text-slate-400 mr-1.5">HI:</span>
                <span className="text-amber-400 font-mono font-bold">{highScore}</span>
              </div>
            </div>
          </div>

          <canvas ref={canvasRef} className="block w-full h-auto aspect-[16/10] touch-none cursor-grab active:cursor-grabbing" />

          {/* IDLE / START OVERLAY */}
          {gameState === 'IDLE' && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <div className="text-center p-6 max-w-md">
                <div className="w-16 h-16 bg-sky-500/10 border border-sky-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-[0_0_20px_rgba(56,189,248,0.2)]">
                  🛰️
                </div>
                <h3 className="text-2xl font-black text-white tracking-wider mb-2">CINEMATIC DEFENDER</h3>
                <p className="text-slate-400 text-xs md:text-sm mb-6 leading-relaxed">
                  Bosses spawn strictly at every <strong className="text-amber-400">200 points</strong> (200, 400, 600...) alone with thematic colors and falling heart refills upon defeat!
                </p>
                <button
                  onClick={startGame}
                  className="px-8 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold tracking-wider rounded-xl shadow-[0_0_25px_rgba(56,189,248,0.4)] transition-all transform hover:scale-105 active:scale-95"
                >
                  ▶ START MISSION
                </button>
              </div>
            </div>
          )}

          {/* GAME OVER OVERLAY */}
          {gameState === 'GAMEOVER' && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <div className="text-center p-6 max-w-md animate-fade-in">
                <span className="text-4xl">💥</span>
                <h3 className="text-3xl font-black text-red-500 tracking-wider mt-2 mb-1">STATION DESTROYED</h3>
                <p className="text-slate-400 text-xs md:text-sm mb-4">Your satellite hull integrity dropped to 0%.</p>
                
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 flex justify-around">
                  <div>
                    <div className="text-[10px] text-slate-500">FINAL SCORE</div>
                    <div className="text-lg font-mono font-bold text-sky-400">{score}</div>
                  </div>
                  <div className="border-r border-slate-800"></div>
                  <div>
                    <div className="text-[10px] text-slate-500">HIGH SCORE</div>
                    <div className="text-lg font-mono font-bold text-amber-400">{highScore}</div>
                  </div>
                </div>

                <button
                  onClick={startGame}
                  className="px-8 py-3 bg-gradient-to-r from-red-500 to-amber-600 hover:from-red-400 hover:to-amber-500 text-white font-bold tracking-wider rounded-xl shadow-[0_0_25px_rgba(239,68,68,0.4)] transition-all transform hover:scale-105 active:scale-95"
                >
                  🔄 TRY AGAIN
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MIDDLE-RIGHT MOBILE SHOOT BUTTON */}
        {gameState === 'PLAYING' && (
          <div className="absolute right-2 md:-right-16 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center">
            <button
              onClick={shootNeonBullet}
              className="w-16 h-16 md:w-20 md:h-20 bg-emerald-500/20 hover:bg-emerald-500/30 border-2 border-emerald-400/80 rounded-full flex flex-col items-center justify-center text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.4)] active:scale-90 transition-transform touch-manipulation backdrop-blur-md"
              title="Shoot Neon Blast"
            >
              <span className="text-xl">🚀</span>
              <span className="text-[9px] font-black uppercase tracking-tighter mt-0.5">BLAST</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}