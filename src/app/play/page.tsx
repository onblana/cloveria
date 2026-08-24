'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CROPS,
  CUSTOMER_NAMES,
  INITIAL_GOLD,
  INITIAL_SEEDS,
  PLOT_COUNT,
  RECIPES,
  TICK_MS,
  type CropId,
  type RecipeId,
} from '@/lib/game/data';

interface Plot {
  cropId: CropId;
  plantedTick: number;
}

interface Order {
  customer: string;
  recipeId: RecipeId;
}

/** 작물별 보유 수량 (일반 / 변이) */
type Inventory = Record<CropId, { normal: number; mutant: number }>;

const createInventory = (): Inventory => ({ tomato: { normal: 0, mutant: 0 } });
const createSeeds = (): Record<CropId, number> => ({ tomato: INITIAL_SEEDS });
const createPlots = (): (Plot | null)[] => Array.from({ length: PLOT_COUNT }, () => null);

const pickCustomer = () => CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
const createOrder = (): Order => ({ customer: pickCustomer(), recipeId: 'tomatoPasta' });
const rollMutation = (rate: number) => Math.random() < rate;

export default function PlayPage() {
  const [phase, setPhase] = useState<'naming' | 'playing'>('naming');
  const [nameInput, setNameInput] = useState('');
  const [playerName, setPlayerName] = useState('');

  const [tick, setTick] = useState(0);
  const [gold, setGold] = useState(INITIAL_GOLD);
  const [reputation, setReputation] = useState(0);
  const [seeds, setSeeds] = useState(createSeeds);
  const [inventory, setInventory] = useState(createInventory);
  const [plots, setPlots] = useState(createPlots);
  const [order, setOrder] = useState<Order | null>(null);
  const [log, setLog] = useState<string[]>([]);

  // 최근 소식이 위로 오도록 앞에 쌓고 6줄까지만 유지
  const pushLog = useCallback((message: string) => {
    setLog((prev) => [message, ...prev].slice(0, 6));
  }, []);

  // 세션 기반 시간: 페이지가 열려 있는 동안에만 틱이 흐른다
  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(timer);
  }, [phase]);

  const startGame = () => {
    const name = nameInput.trim();
    if (!name) return;

    setPlayerName(name);
    setPhase('playing');
    setOrder(createOrder());
    pushLog(`요정이 토마토 씨앗 ${INITIAL_SEEDS}개를 건넸다.`);
    pushLog(`${name}, 할머니의 낡은 식당에 도착했다.`);
  };

  const plant = (index: number) => {
    if (plots[index] || seeds.tomato <= 0) return;

    setSeeds((prev) => ({ ...prev, tomato: prev.tomato - 1 }));
    setPlots((prev) =>
      prev.map((plot, i) => (i === index ? { cropId: 'tomato', plantedTick: tick } : plot)),
    );
    pushLog('토마토 씨앗을 심었다.');
  };

  const harvest = (index: number) => {
    const plot = plots[index];
    if (!plot) return;

    const crop = CROPS[plot.cropId];
    if (tick - plot.plantedTick < crop.growTicks) return;

    const isMutant = rollMutation(crop.mutationRate);
    setInventory((prev) => ({
      ...prev,
      [plot.cropId]: {
        normal: prev[plot.cropId].normal + (isMutant ? 0 : 1),
        mutant: prev[plot.cropId].mutant + (isMutant ? 1 : 0),
      },
    }));
    setPlots((prev) => prev.map((p, i) => (i === index ? null : p)));

    pushLog(isMutant ? `✨ ${crop.mutantName}이(가) 자랐다! 요정이 반짝인다.` : `${crop.name}을(를) 수확했다.`);
  };

  const recipe = order ? RECIPES[order.recipeId] : null;

  const { canCook, canCookSignature } = useMemo(() => {
    if (!recipe) return { canCook: false, canCookSignature: false };

    const entries = Object.entries(recipe.ingredients) as [CropId, number][];
    return {
      canCook: entries.every(([cropId, need]) => inventory[cropId].normal >= need),
      canCookSignature: entries.every(
        ([cropId, need]) =>
          inventory[cropId].mutant >= 1 &&
          inventory[cropId].normal + inventory[cropId].mutant >= need,
      ),
    };
  }, [recipe, inventory]);

  const cook = (useSignature: boolean) => {
    if (!order || !recipe) return;
    if (useSignature ? !canCookSignature : !canCook) return;

    const entries = Object.entries(recipe.ingredients) as [CropId, number][];
    setInventory((prev) => {
      const next = { ...prev };
      for (const [cropId, need] of entries) {
        // 시그니처는 변이 재료를 우선 소모하고, 일반 조리는 일반 재료만 쓴다
        const usedMutant = useSignature ? Math.min(prev[cropId].mutant, need) : 0;
        next[cropId] = {
          normal: prev[cropId].normal - (need - usedMutant),
          mutant: prev[cropId].mutant - usedMutant,
        };
      }
      return next;
    });

    const price = useSignature
      ? Math.round(recipe.price * recipe.signatureMultiplier)
      : recipe.price;

    setGold((prev) => prev + price);
    setReputation((prev) => prev + (useSignature ? 3 : 1));
    setOrder(createOrder());

    pushLog(
      useSignature
        ? `${order.customer}에게 ${recipe.signatureName}을(를) 냈다. 감탄하며 ${price}골드를 냈다!`
        : `${order.customer}에게 ${recipe.name}을(를) 냈다. ${price}골드를 받았다.`,
    );
  };

  const buySeed = () => {
    const price = CROPS.tomato.seedPrice;
    if (gold < price) return;

    setGold((prev) => prev - price);
    setSeeds((prev) => ({ ...prev, tomato: prev.tomato + 1 }));
    pushLog(`토마토 씨앗을 ${price}골드에 샀다.`);
  };

  // 씨앗도 재료도 골드도 없고 자라는 작물마저 없으면 진행이 막히므로 요정이 씨앗을 준다
  const isStuck =
    phase === 'playing' &&
    seeds.tomato === 0 &&
    gold < CROPS.tomato.seedPrice &&
    plots.every((plot) => plot === null) &&
    inventory.tomato.normal + inventory.tomato.mutant < 2;

  const receiveGiftSeed = () => {
    setSeeds((prev) => ({ ...prev, tomato: prev.tomato + 1 }));
    pushLog('요정이 조용히 씨앗 하나를 놓고 갔다.');
  };

  if (phase === 'naming') {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-8">
        <div className="space-y-3 text-sm leading-relaxed text-neutral-600">
          <p>클로버 마을에는 오래된 전설이 있다.</p>
          <p>
            이 마을에서 농사를 지으면 클로버의 행운으로 희귀한 작물을 얻을 수 있다는 것. 단,
            선택받은 자만이 그 행운을 얻는다.
          </p>
          <p>이제는 아무도 믿지 않는 구닥다리 이야기다.</p>
        </div>

        <div className="space-y-3">
          <label htmlFor="player-name" className="block text-lg font-semibold">
            당신의 이름은 무엇인가요?
          </label>
          <input
            id="player-name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startGame()}
            placeholder="이름을 입력하세요"
            className="w-full rounded-lg border border-neutral-300 px-4 py-2 outline-none focus:border-green-500"
          />
          <button
            onClick={startGame}
            disabled={!nameInput.trim()}
            className="w-full rounded-lg bg-green-600 py-2 font-medium text-white disabled:bg-neutral-300"
          >
            마을로 돌아가기
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <h1 className="text-lg font-semibold">{playerName}의 식당</h1>
        <div className="flex gap-4 text-sm text-neutral-600">
          <span>🪙 {gold}골드</span>
          <span>⭐ 평판 {reputation}</span>
          <span>⏱ {tick}틱</span>
        </div>
      </header>

      {order && recipe && (
        <section className="rounded-lg bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">주문</h2>
          <p className="mt-1 text-sm">
            {order.customer} — <strong>{recipe.name}</strong>
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            필요 재료: 토마토 {recipe.ingredients.tomato}개
          </p>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">밭</h2>
        <div className="grid grid-cols-4 gap-2">
          {plots.map((plot, index) => {
            if (!plot) {
              return (
                <button
                  key={index}
                  onClick={() => plant(index)}
                  disabled={seeds.tomato <= 0}
                  className="h-24 rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-500 disabled:opacity-40"
                >
                  빈 밭
                  <br />
                  심기
                </button>
              );
            }

            const crop = CROPS[plot.cropId];
            const grown = tick - plot.plantedTick;
            const ready = grown >= crop.growTicks;

            return (
              <button
                key={index}
                onClick={() => harvest(index)}
                disabled={!ready}
                className={`h-24 rounded-lg border text-xs ${
                  ready
                    ? 'border-green-500 bg-green-50 font-medium text-green-800'
                    : 'border-neutral-200 text-neutral-500'
                }`}
              >
                {ready ? (
                  <>
                    🍅
                    <br />
                    수확하기
                  </>
                ) : (
                  <>
                    🌱
                    <br />
                    {grown} / {crop.growTicks}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-4 rounded-lg bg-neutral-50 p-4 text-sm">
        <span>씨앗 {seeds.tomato}개</span>
        <span>토마토 {inventory.tomato.normal}개</span>
        <span className="text-amber-700">✨ 황금 토마토 {inventory.tomato.mutant}개</span>
        <button
          onClick={buySeed}
          disabled={gold < CROPS.tomato.seedPrice}
          className="ml-auto rounded-lg border border-neutral-300 px-3 py-1 disabled:opacity-40"
        >
          씨앗 구매 ({CROPS.tomato.seedPrice}골드)
        </button>
      </section>

      <section className="flex gap-2">
        <button
          onClick={() => cook(false)}
          disabled={!canCook}
          className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white disabled:bg-neutral-300"
        >
          요리해서 내놓기
        </button>
        <button
          onClick={() => cook(true)}
          disabled={!canCookSignature}
          className="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-medium text-white disabled:bg-neutral-300"
        >
          ✨ 시그니처로 만들기
        </button>
      </section>

      {isStuck && (
        <button
          onClick={receiveGiftSeed}
          className="rounded-lg border border-green-300 bg-green-50 py-2 text-sm text-green-800"
        >
          🍀 요정에게 도움 청하기
        </button>
      )}

      <section className="space-y-1 border-t border-neutral-200 pt-4 text-sm text-neutral-600">
        {log.map((line, index) => (
          <p key={`${tick}-${index}-${line}`} className={index === 0 ? 'text-neutral-900' : ''}>
            {line}
          </p>
        ))}
      </section>
    </main>
  );
}
