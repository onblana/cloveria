'use client';

import { useEffect, useRef } from 'react';
import { isWalkableTile, SAMPLE_MAP, TILE_COLORS } from '@/lib/game/tilemap';

const GRID_SIZE = 10;
const TILE_SIZE = 48;
const CANVAS_SIZE = GRID_SIZE * TILE_SIZE;
const PLAYER_SIZE = 32;
const PLAYER_SPEED = 200; // px/sec

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // 캐릭터 위치는 React state가 아닌 ref로 관리해 리렌더링 없이 매 프레임 갱신
    const player = { x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 };
    const pressedKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => pressedKeys.add(e.key);
    const handleKeyUp = (e: KeyboardEvent) => pressedKeys.delete(e.key);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let lastTime = performance.now();
    let animationFrameId: number;

    function drawTiles() {
      if (!ctx) return;
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          ctx.fillStyle = TILE_COLORS[SAMPLE_MAP[row][col]];
          ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TILE_SIZE, 0);
        ctx.lineTo(i * TILE_SIZE, CANVAS_SIZE);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * TILE_SIZE);
        ctx.lineTo(CANVAS_SIZE, i * TILE_SIZE);
        ctx.stroke();
      }
    }

    // 플레이어 사각형의 네 꼭짓점이 전부 걸을 수 있는 타일 위에 있는지 확인
    function canMoveTo(x: number, y: number) {
      const half = PLAYER_SIZE / 2;
      const corners = [
        [x - half, y - half],
        [x + half, y - half],
        [x - half, y + half],
        [x + half, y + half],
      ];

      return corners.every(([cx, cy]) => {
        const col = Math.floor(cx / TILE_SIZE);
        const row = Math.floor(cy / TILE_SIZE);
        if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return false;
        return isWalkableTile(SAMPLE_MAP[row][col]);
      });
    }

    function update(deltaSec: number) {
      let dx = 0;
      let dy = 0;
      if (pressedKeys.has('ArrowUp') || pressedKeys.has('w')) dy -= 1;
      if (pressedKeys.has('ArrowDown') || pressedKeys.has('s')) dy += 1;
      if (pressedKeys.has('ArrowLeft') || pressedKeys.has('a')) dx -= 1;
      if (pressedKeys.has('ArrowRight') || pressedKeys.has('d')) dx += 1;

      if (dx === 0 && dy === 0) return;

      const length = Math.hypot(dx, dy);
      const moveX = (dx / length) * PLAYER_SPEED * deltaSec;
      const moveY = (dy / length) * PLAYER_SPEED * deltaSec;

      // 축별로 따로 검사해서 벽에 닿아도 다른 축으로는 미끄러지듯 이동 가능
      if (canMoveTo(player.x + moveX, player.y)) player.x += moveX;
      if (canMoveTo(player.x, player.y + moveY)) player.y += moveY;
    }

    function render() {
      if (!ctx) return;
      drawTiles();

      ctx.fillStyle = '#4a6b3a';
      ctx.fillRect(
        player.x - PLAYER_SIZE / 2,
        player.y - PLAYER_SIZE / 2,
        PLAYER_SIZE,
        PLAYER_SIZE,
      );
    }

    function loop(now: number) {
      const deltaSec = (now - lastTime) / 1000;
      lastTime = now;

      update(deltaSec);
      render();

      animationFrameId = requestAnimationFrame(loop);
    }

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 p-8">
      <h1 className="text-xl font-semibold">게임 화면 프로토타입</h1>
      <p className="text-sm text-neutral-500">방향키 또는 WASD로 이동해보세요</p>
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="rounded-lg border border-neutral-300 shadow-sm"
      />
    </div>
  );
}
