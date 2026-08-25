'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { CoinIcon } from '@/components/icons/CoinIcon';
import { TimerIcon } from '@/components/icons/TimerIcon';
import {
  CROPS,
  CUSTOMER_NAMES,
  DISPLAY_BONUS_PER_ITEM,
  DISPLAY_SLOTS,
  INITIAL_GOLD,
  INITIAL_SEEDS,
  RECIPES,
  createEmptyPlots,
  getDayNumber,
  getDayPhase,
  type CropId,
  type RecipeId,
} from '@/lib/game/data';
import { clearGame, loadGame, saveGame } from '@/lib/game/storage';
import { LoadingScreen } from '@/components/LoadingScreen';

interface Order {
  customer: string;
  recipeId: RecipeId;
}

/** 작물별 보유 수량 (일반 / 변이) */
type Inventory = Record<CropId, { normal: number; mutant: number }>;

const CROP_IDS = Object.keys(CROPS) as CropId[];
const RECIPE_IDS = Object.keys(RECIPES) as RecipeId[];

/** 밭과 탭에서 작물을 한눈에 구분하기 위한 표시용 아이콘 */
const CROP_EMOJI: Record<CropId, string> = { tomato: '🍅', corn: '🌽' };

/** 시작 작물은 토마토 하나뿐이다 (도입부에서 요정이 건네는 씨앗) */
const STARTER_CROP: CropId = 'tomato';

const createInventory = (): Inventory =>
  Object.fromEntries(CROP_IDS.map((id) => [id, { normal: 0, mutant: 0 }])) as Inventory;
const createSeeds = (): Record<CropId, number> =>
  Object.fromEntries(
    CROP_IDS.map((id) => [id, id === STARTER_CROP ? INITIAL_SEEDS : 0]),
  ) as Record<CropId, number>;
// 저장된 기록을 덮어씌울 바탕. 기록에 없는 작물은 0개로 남는다
const emptySeeds = (): Record<CropId, number> =>
  Object.fromEntries(CROP_IDS.map((id) => [id, 0])) as Record<CropId, number>;

const pickCustomer = () => CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
const pickRecipe = () => RECIPE_IDS[Math.floor(Math.random() * RECIPE_IDS.length)];
const createOrder = (): Order => ({ customer: pickCustomer(), recipeId: pickRecipe() });
const rollMutation = (rate: number) => Math.random() < rate;

/** 진열 보너스를 화면에 보여줄 퍼센트 값으로 바꾼다 */
const bonusPercent = (count: number) => Math.round(count * DISPLAY_BONUS_PER_ITEM * 100);

export default function PlayPage() {
  // loading: 저장된 데이터를 읽는 동안. 읽기 전에 저장하면 기존 기록을 덮어쓰므로 구분이 필요하다
  const [phase, setPhase] = useState<'loading' | 'naming' | 'playing'>('loading');
  const [nameInput, setNameInput] = useState('');
  const [playerName, setPlayerName] = useState('');

  const [tick, setTick] = useState(0);
  const [gold, setGold] = useState(INITIAL_GOLD);
  // TODO: 평판은 쓰이는 곳이 없어 주석처리. 손님 종류·레시피 해금을 붙일 때 다시 도입할 것
  // const [reputation, setReputation] = useState(0);
  const [seeds, setSeeds] = useState(createSeeds);
  const [inventory, setInventory] = useState(createInventory);
  const [plots, setPlots] = useState(createEmptyPlots);
  const [order, setOrder] = useState<Order | null>(null);
  const [display, setDisplay] = useState<CropId[]>([]);
  const [seedQty, setSeedQty] = useState(1);
  const [log, setLog] = useState<string[]>([]);
  // 씨앗 구매·파종·진열이 모두 이 선택을 따른다
  const [selectedCrop, setSelectedCrop] = useState<CropId>(STARTER_CROP);

  // 최근 소식이 위로 오도록 앞에 쌓고 6줄까지만 유지
  const pushLog = useCallback((message: string) => {
    setLog((prev) => [message, ...prev].slice(0, 6));
  }, []);

  const day = getDayNumber(tick);
  const dayPhase = getDayPhase(tick);
  const nextPhase = getDayPhase(tick + 1);

  // 단계마다 '넘어가기'의 의미가 달라 문구를 따로 만든다
  const advanceLabel =
    dayPhase.kind === 'bistro'
      ? `${dayPhase.name} 장사 마감하기`
      : dayPhase.id === 'night'
        ? `${day}일차 마무리하기`
        : `${nextPhase.name} 장사 시작하기`;

  // 시간은 이 버튼으로만 흐른다. 단계가 하나 넘어갈 때 밭의 작물도 1틱만큼 자란다
  const advancePhase = () => {
    const next = tick + 1;
    setTick(next);
    if (getDayPhase(next).id === 'morning') {
      pushLog(`${getDayNumber(next)}일차 아침이 밝았다.`);
    }
  };

  // 첫 진입 시 저장된 기록이 있으면 이어서 시작한다
  useEffect(() => {
    loadGame()
      .then((saved) => {
        if (!saved) {
          setPhase('naming');
          return;
        }

        setPlayerName(saved.playerName);
        setGold(saved.gold);
        setTick(saved.tick);
        setSeeds({ ...emptySeeds(), ...saved.seeds });
        setInventory({ ...createInventory(), ...saved.crops });
        setPlots(saved.plots);
        setDisplay(saved.display);
        setOrder(createOrder());
        setPhase('playing');
        pushLog(`${saved.playerName}, 식당 문을 다시 열었다.`);
      })
      .catch(() => setPhase('naming'));
  }, [pushLog]);

  // 저장 대상이 바뀔 때마다 기록한다
  useEffect(() => {
    if (phase !== 'playing') return;

    saveGame({ playerName, gold, tick, seeds, crops: inventory, plots, display }).catch(
      () => undefined,
    );
  }, [phase, playerName, gold, tick, seeds, inventory, plots, display]);

  const startGame = () => {
    const name = nameInput.trim();
    if (!name) return;

    setPlayerName(name);
    setPhase('playing');
    setOrder(createOrder());
    pushLog(`요정이 ${CROPS[STARTER_CROP].name} 씨앗 ${INITIAL_SEEDS}개를 건넸다.`);
    pushLog(`${name}, 할머니가 남겨주신 낡은 식당에 도착했다.`);
  };

  const plant = (index: number) => {
    if (plots[index] || seeds[selectedCrop] <= 0) return;

    setSeeds((prev) => ({ ...prev, [selectedCrop]: prev[selectedCrop] - 1 }));
    setPlots((prev) =>
      prev.map((plot, i) => (i === index ? { cropId: selectedCrop, plantedTick: tick } : plot)),
    );
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

    // 일반 수확은 너무 잦아 로그를 남기지 않고, 드물게 나오는 변이만 알린다
    if (isMutant) {
      pushLog(`✨ ${crop.mutantName}이(가) 자랐다! 요정이 반짝인다.`);
    }
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

    const basePrice = useSignature
      ? recipe.price * recipe.signatureMultiplier
      : recipe.price;
    // 진열대에 놓인 변이 작물이 많을수록 모든 요리가 비싸게 팔린다
    const price = Math.round(basePrice * (1 + display.length * DISPLAY_BONUS_PER_ITEM));

    setGold((prev) => prev + price);
    setOrder(createOrder());

    pushLog(
      useSignature
        ? `${order.customer}에게 ${recipe.signatureName}을(를) 냈다. 감탄하며 ${price}골드를 냈다!`
        : `${order.customer}에게 ${recipe.name}을(를) 냈다. ${price}골드를 받았다.`,
    );
  };

  const seedPrice = CROPS[selectedCrop].seedPrice;
  const seedTotal = seedPrice * seedQty;

  const buySeed = () => {
    if (gold < seedTotal) return;

    setGold((prev) => prev - seedTotal);
    setSeeds((prev) => ({ ...prev, [selectedCrop]: prev[selectedCrop] + seedQty }));
    pushLog(`${CROPS[selectedCrop].name} 씨앗 ${seedQty}개를 ${seedTotal}골드에 샀다.`);
  };

  const putOnDisplay = (cropId: CropId) => {
    if (display.length >= DISPLAY_SLOTS || inventory[cropId].mutant <= 0) return;

    setInventory((prev) => ({
      ...prev,
      [cropId]: { ...prev[cropId], mutant: prev[cropId].mutant - 1 },
    }));
    setDisplay((prev) => [...prev, cropId]);
    pushLog(`${CROPS[cropId].mutantName}을(를) 진열했다. 손님들이 눈을 떼지 못한다.`);
  };

  const takeFromDisplay = (index: number) => {
    const cropId = display[index];
    if (!cropId) return;

    setInventory((prev) => ({
      ...prev,
      [cropId]: { ...prev[cropId], mutant: prev[cropId].mutant + 1 },
    }));
    setDisplay((prev) => prev.filter((_, i) => i !== index));
    pushLog(`${CROPS[cropId].mutantName}을(를) 진열대에서 내렸다.`);
  };

  // 씨앗도 재료도 골드도 없고 자라는 작물마저 없으면 진행이 막히므로, 요정이 씨앗을 준다
  const totalSeeds = CROP_IDS.reduce((sum, id) => sum + seeds[id], 0);
  const totalCrops = CROP_IDS.reduce(
    (sum, id) => sum + inventory[id].normal + inventory[id].mutant,
    0,
  );
  const cheapestSeedPrice = Math.min(...CROP_IDS.map((id) => CROPS[id].seedPrice));
  const isStuck =
    phase === 'playing' &&
    totalSeeds === 0 &&
    gold < cheapestSeedPrice &&
    plots.every((plot) => plot === null) &&
    totalCrops < 2;

  const receiveGiftSeed = () => {
    setSeeds((prev) => ({ ...prev, [STARTER_CROP]: prev[STARTER_CROP] + 1 }));
    pushLog('요정이 조용히 씨앗 주머니 하나를 놓고 갔다.');
  };

  const resetGame = () => {
    clearGame()
      .then(() => window.location.reload())
      .catch(() => undefined);
  };

  if (phase === 'loading') {
    return <LoadingScreen message="기록을 불러오는 중..." />;
  }

  if (phase === 'naming') {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-8">
        <div className="space-y-3 text-sm leading-relaxed text-neutral-600">
          <p>클로버 마을에는 오래된 전설이 있다.</p>
          <p>
            이 마을에서 농사를 지으면 클로버의 행운으로 희귀한 작물을 얻을 수 있다는 것. 단,
            선택받은 자만이 그 행운을 얻을 자격이 있다고 한다.
          </p>
          <p>이제는 아무도 믿지 않는 이야기다.</p>
          <p>당신은 할머니가 남겨 주신, 텃밭이 딸린 작은 식당을 운영하기 위해 도시에서 시골로 내려왔다.</p>
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
            className="w-full rounded-lg bg-green-600 py-2 font-semibold text-white disabled:bg-neutral-300"
          >
            마을로 돌아가기
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-5 p-4 sm:gap-6 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-neutral-200 pb-4">
        <h1 className="text-lg font-semibold">{playerName}의 식당</h1>
        <div className="flex items-center gap-4 text-sm text-neutral-600">
          <span className="flex items-center gap-1">
            <CoinIcon className="text-amber-500" />
            {gold}골드
          </span>
          <span className="flex items-center gap-1">
            <TimerIcon />
            {day}일차 {dayPhase.name}
          </span>
          <button onClick={resetGame} className="text-xs text-neutral-400 underline">
            처음부터 다시 시작하기
          </button>
        </div>
      </header>

      {/* 작물 선택은 두 단계에서 같이 쓴다. 농사 단계에선 심을 작물, 장사 단계에선 진열할 작물 */}
      <section className="flex gap-2">
        {CROP_IDS.map((cropId) => (
          <button
            key={cropId}
            onClick={() => setSelectedCrop(cropId)}
            className={`h-11 flex-1 rounded-lg border text-sm ${
              selectedCrop === cropId
                ? 'border-green-500 bg-green-50 font-semibold text-green-800'
                : 'border-neutral-300 text-neutral-600'
            }`}
          >
            {CROP_EMOJI[cropId]} {CROPS[cropId].name}
          </button>
        ))}
      </section>

      {dayPhase.kind === 'farm' && (
        <>
          <section className="flex items-center gap-2">
            <button
              onClick={() => setSeedQty((q) => Math.max(q - 1, 1))}
              disabled={seedQty <= 1}
              className="h-11 w-11 shrink-0 rounded-lg border border-neutral-300 text-lg disabled:opacity-40"
            >
              −
            </button>
            <span className="w-8 text-center tabular-nums">{seedQty}</span>
            <button
              onClick={() => setSeedQty((q) => q + 1)}
              className="h-11 w-11 shrink-0 rounded-lg border border-neutral-300 text-lg"
            >
              +
            </button>
            <button
              onClick={buySeed}
              disabled={gold < seedTotal}
              className="h-11 flex-1 rounded-lg border border-neutral-300 px-3 text-sm disabled:opacity-40"
            >
              {CROPS[selectedCrop].name} 씨앗 구매 ({seedTotal}골드)
            </button>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold">밭</h2>
            <div className="grid grid-cols-5 gap-2">
              {plots.map((plot, index) => {
                if (!plot) {
                  return (
                    <button
                      key={index}
                      onClick={() => plant(index)}
                      disabled={seeds[selectedCrop] <= 0}
                      className="h-24 rounded-lg border border-dashed border-neutral-400 text-xs text-neutral-400"
                    >
                      <span className="text-xs font-light">{CROPS[selectedCrop].name} 심기</span>
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
                        ? 'border-green-500 bg-green-50 font-semibold text-green-800'
                        : 'border-neutral-200 text-neutral-500'
                    }`}
                  >
                    {ready ? (
                      <>
                        {CROP_EMOJI[plot.cropId]}
                        <br />
                        수확하기
                      </>
                    ) : (
                      <>
                        🌱
                        <br />
                        {Math.floor((grown / crop.growTicks) * 100)}%
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {isStuck && (
            <button
              onClick={receiveGiftSeed}
              className="min-h-12 rounded-lg border border-green-300 bg-green-50 py-3 text-sm text-green-800"
            >
              🍀 요정에게 도움 청하기
            </button>
          )}
        </>
      )}

      {dayPhase.kind === 'bistro' && (
        <>
          {order && recipe && (
            <section className="rounded-lg bg-amber-50 p-4">
              <h2 className="text-sm font-semibold text-amber-900">주문</h2>
              <p className="mt-1 text-sm">
                {order.customer} — <strong>{recipe.name}</strong>
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                필요 재료:{' '}
                {(Object.entries(recipe.ingredients) as [CropId, number][])
                  .map(([cropId, need]) => `${CROPS[cropId].name} ${need}개`)
                  .join(', ')}
                {display.length > 0 && ` · 진열 보너스 +${bonusPercent(display.length)}%`}
              </p>
            </section>
          )}

          <section className="flex gap-2">
            <button
              onClick={() => cook(false)}
              disabled={!canCook}
              className="min-h-12 flex-1 rounded-lg bg-green-600 px-2 py-3 text-sm font-semibold text-white disabled:bg-neutral-300"
            >
              🍳 요리해서 내놓기
            </button>
            <button
              onClick={() => cook(true)}
              disabled={!canCookSignature}
              className="min-h-12 flex-1 rounded-lg bg-amber-500 px-2 py-3 text-sm font-semibold text-white disabled:bg-neutral-300"
            >
              ✨ 시그니처로 만들기
            </button>
          </section>

          <section>
            <h2 className="text-sm font-semibold">진열대</h2>
            <p className="mb-2 text-xs text-neutral-500">
              놓아둔 만큼 모든 요리가 비싸게 팔린다 (개당 +{bonusPercent(1)}%)
            </p>
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: DISPLAY_SLOTS }, (_, index) => {
                const cropId = display[index];

                if (!cropId) {
                  return (
                    <button
                      key={index}
                      onClick={() => putOnDisplay(selectedCrop)}
                      disabled={inventory[selectedCrop].mutant <= 0}
                      className="h-20 rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-500 disabled:opacity-40"
                    >
                      빈 진열대
                      <br />
                      올리기
                    </button>
                  );
                }

                return (
                  <button
                    key={index}
                    onClick={() => takeFromDisplay(index)}
                    className="h-20 rounded-lg border border-amber-400 bg-amber-50 text-xs font-semibold text-amber-800"
                  >
                    ✨ {CROPS[cropId].mutantName}
                    <br />
                    <span className="font-normal text-amber-600">내리기</span>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}

      <section className="space-y-1 rounded-lg bg-neutral-50 p-4 text-sm">
        {CROP_IDS.map((cropId) => (
          <div key={cropId} className="flex flex-wrap items-center gap-4">
            <span>
              {CROPS[cropId].name} 씨앗 {seeds[cropId]}개
            </span>
            <span>
              {CROPS[cropId].name} {inventory[cropId].normal}개
            </span>
            <span className="text-amber-700">
              ✨ {CROPS[cropId].mutantName} {inventory[cropId].mutant}개
            </span>
          </div>
        ))}
      </section>

      <button
        onClick={advancePhase}
        className="min-h-12 rounded-lg bg-neutral-800 py-3 text-sm font-semibold text-white"
      >
        {advanceLabel}
      </button>

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
