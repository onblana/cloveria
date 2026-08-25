'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { CoinIcon } from '@/components/icons/CoinIcon';
import { TimerIcon } from '@/components/icons/TimerIcon';
import { BistroView } from '@/components/bistro/BistroView';
import { CropPickerModal } from '@/components/common/CropPickerModal';
import { DayEndScreen } from '@/components/common/DayEndScreen';
import { FarmView } from '@/components/farm/FarmView';
import {
  CROPS,
  CROP_EMOJI,
  CUSTOMERS,
  CUSTOMER_IDS,
  DISPLAY_BONUS_PER_ITEM,
  DISPLAY_SLOTS,
  FRIENDSHIP_MAX,
  FRIENDSHIP_PER_DISH,
  INITIAL_GOLD,
  INITIAL_SEEDS,
  RECIPES,
  createDailyRecord,
  createEmptyPlots,
  createFriendship,
  getDayNumber,
  getDayPhase,
  getDisplayBonusPercent,
  getFriendshipMessage,
  getGreeting,
  type CropId,
  type CustomerId,
  type Inventory,
  type RecipeId,
} from '@/lib/game/data';
import { clearGame, loadGame, saveGame } from '@/lib/game/storage';
import { LoadingScreen } from '@/components/LoadingScreen';

interface Order {
  customer: CustomerId;
  recipeId: RecipeId;
}

const CROP_IDS = Object.keys(CROPS) as CropId[];
const RECIPE_IDS = Object.keys(RECIPES) as RecipeId[];

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

const pickCustomer = () => CUSTOMER_IDS[Math.floor(Math.random() * CUSTOMER_IDS.length)];
const pickRecipe = () => RECIPE_IDS[Math.floor(Math.random() * RECIPE_IDS.length)];
const createOrder = (): Order => ({ customer: pickCustomer(), recipeId: pickRecipe() });
const rollMutation = (rate: number) => Math.random() < rate;

/** 소식 창에 남겨두는 줄 수. 맨 위가 가장 최근이고 아래로 갈수록 옅어진다 */
const LOG_LINES = 3;
const LOG_TONES = ['text-neutral-900', 'text-neutral-500', 'text-neutral-400'];

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
  const [log, setLog] = useState<string[]>([]);
  // 손님별 친밀도. 요리를 낼 때마다 오른다
  const [friendship, setFriendship] = useState(createFriendship);
  // 오늘의 결과 화면에 보여줄 집계. 아침이 오면 비워진다
  const [daily, setDaily] = useState(createDailyRecord);
  // 밤을 마무리하는 연출이 화면을 덮고 있는 동안 true
  const [isDayEnding, setIsDayEnding] = useState(false);
  // 진열대 빈 칸을 눌렀을 때 올릴 작물을 고르는 창
  const [isDisplayPickerOpen, setIsDisplayPickerOpen] = useState(false);

  const pushLog = useCallback((message: string) => {
    setLog((prev) => [message, ...prev].slice(0, LOG_LINES));
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
    // 밤은 곧바로 넘기지 않고 하루를 정리하는 화면을 먼저 띄운다
    if (dayPhase.id === 'night') {
      setIsDayEnding(true);
      return;
    }

    setTick(tick + 1);
  };

  // 연출 도중 타이머가 다시 걸리지 않도록 함수를 고정해 둔다
  const finishDayEnd = useCallback(() => setIsDayEnding(false), []);

  // 화면이 덮여 있는 동안 다음 날 아침으로 넘어가고 집계를 비운다
  const wakeUp = () => {
    const next = tick + 1;
    setTick(next);
    setDaily(createDailyRecord());
    pushLog(`${getDayNumber(next)}일차 아침이 밝았다.`);
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
        setDaily(saved.daily);
        setFriendship({ ...createFriendship(), ...saved.friendship });
        setOrder(createOrder());
        setPhase('playing');
        pushLog(`${saved.playerName}, 식당 문을 다시 열었다.`);
      })
      .catch(() => setPhase('naming'));
  }, [pushLog]);

  // 저장 대상이 바뀔 때마다 기록한다
  useEffect(() => {
    if (phase !== 'playing') return;

    saveGame({
      playerName,
      gold,
      tick,
      seeds,
      crops: inventory,
      plots,
      display,
      daily,
      friendship,
    }).catch(() => undefined);
  }, [phase, playerName, gold, tick, seeds, inventory, plots, display, daily, friendship]);

  const startGame = () => {
    const name = nameInput.trim();
    if (!name) return;

    setPlayerName(name);
    setPhase('playing');
    setOrder(createOrder());
    pushLog(`요정이 ${CROPS[STARTER_CROP].name} 씨앗 ${INITIAL_SEEDS}개를 건넸다.`);
    pushLog(`${name}, 할머니가 남겨주신 낡은 식당에 도착했다.`);
  };

  const plant = (index: number, cropId: CropId) => {
    if (plots[index] || seeds[cropId] <= 0) return;

    setSeeds((prev) => ({ ...prev, [cropId]: prev[cropId] - 1 }));
    setPlots((prev) => prev.map((plot, i) => (i === index ? { cropId, plantedTick: tick } : plot)));
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
    setDaily((prev) => {
      const before = prev.harvest[plot.cropId] ?? { normal: 0, mutant: 0 };
      return {
        ...prev,
        harvest: {
          ...prev.harvest,
          [plot.cropId]: {
            normal: before.normal + (isMutant ? 0 : 1),
            mutant: before.mutant + (isMutant ? 1 : 0),
          },
        },
      };
    });

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
    setDaily((prev) => ({ ...prev, earned: prev.earned + price }));
    setOrder(createOrder());

    const customer = CUSTOMERS[order.customer];
    pushLog(
      useSignature
        ? `${customer.name}에게 ${recipe.signatureName}을(를) 냈다. 감탄하며 ${price}골드를 냈다!`
        : `${customer.name}에게 ${recipe.name}을(를) 냈다. ${price}골드를 받았다.`,
    );

    // 요리를 하나 낼 때마다 그 손님과 가까워진다
    const before = friendship[customer.id];
    const after = Math.min(before + FRIENDSHIP_PER_DISH, FRIENDSHIP_MAX);
    setFriendship((prev) => ({ ...prev, [customer.id]: after }));

    // 정해진 단계를 넘어설 때만 한 번씩 알린다
    const message = getFriendshipMessage(customer, before, after);
    if (message) {
      pushLog(message);
    }
  };

  const buySeed = (cropId: CropId, qty: number) => {
    const total = CROPS[cropId].seedPrice * qty;
    if (gold < total) return;

    setGold((prev) => prev - total);
    setSeeds((prev) => ({ ...prev, [cropId]: prev[cropId] + qty }));
    setDaily((prev) => ({ ...prev, spent: prev.spent + total }));
    pushLog(`${CROPS[cropId].name} 씨앗 ${qty}개를 ${total}골드에 샀다.`);
  };

  const putOnDisplay = (cropId: CropId) => {
    if (display.length >= DISPLAY_SLOTS || inventory[cropId].mutant <= 0) return;

    setInventory((prev) => ({
      ...prev,
      [cropId]: { ...prev[cropId], mutant: prev[cropId].mutant - 1 },
    }));
    setDisplay((prev) => [...prev, cropId]);
    setIsDisplayPickerOpen(false);
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
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-5 p-2 sm:gap-6 sm:p-8">
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

      <section className="space-y-1 text-sm text-neutral-600">
        {log.map((line, index) => (
          <p key={`${tick}-${index}-${line}`} className={LOG_TONES[index]}>
            {line}
          </p>
        ))}
      </section>

      {dayPhase.kind === 'farm' && (
        <FarmView
          gold={gold}
          seeds={seeds}
          plots={plots}
          tick={tick}
          cropIds={CROP_IDS}
          isStuck={isStuck}
          onBuySeed={buySeed}
          onPlant={plant}
          onHarvest={harvest}
          onReceiveGiftSeed={receiveGiftSeed}
        />
      )}

      {dayPhase.kind === 'bistro' && (
        <BistroView
          customer={order ? CUSTOMERS[order.customer] : null}
          greeting={order ? getGreeting(CUSTOMERS[order.customer], friendship[order.customer]) : ''}
          recipe={recipe}
          displayCount={display.length}
          canCook={canCook}
          canCookSignature={canCookSignature}
          onCook={cook}
        />
      )}

      <section className="space-y-1 rounded-lg bg-neutral-50 p-4 text-sm">
        {CROP_IDS.map((cropId) => (
          <div key={cropId} className="flex flex-wrap items-center gap-4">
            {dayPhase.kind === 'farm' &&
              <span>
                {CROPS[cropId].name} 씨앗 {seeds[cropId]}개
              </span>
            }
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

      <section>
        <h2 className="text-sm font-semibold">진열대</h2>
        <p className="mb-2 text-xs text-neutral-500">
          놓아둔 만큼 모든 요리가 비싸게 팔린다 (개당 +{getDisplayBonusPercent(1)}%)
        </p>
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: DISPLAY_SLOTS }, (_, index) => {
            const cropId = display[index];

            if (!cropId) {
              return (
                <button
                  key={index}
                  onClick={() => setIsDisplayPickerOpen(true)}
                  className="h-20 rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-400"
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

      {isDisplayPickerOpen && (
        <CropPickerModal
          title="진열할 작물 고르기"
          description="변이 작물만 진열할 수 있다"
          onClose={() => setIsDisplayPickerOpen(false)}
        >
          {CROP_IDS.map((cropId) => (
            <button
              key={cropId}
              onClick={() => putOnDisplay(cropId)}
              className="flex min-h-12 w-full items-center justify-between rounded-lg border border-neutral-300 px-4 text-sm"
            >
              <span>
                {CROP_EMOJI[cropId]} ✨ {CROPS[cropId].mutantName}
              </span>
              <span className="tabular-nums text-neutral-500">
                {inventory[cropId].mutant}개
              </span>
            </button>
          ))}
        </CropPickerModal>
      )}

      {isDayEnding && (
        <DayEndScreen
          day={day}
          record={daily}
          cropIds={CROP_IDS}
          onWake={wakeUp}
          onFinish={finishDayEnd}
        />
      )}
    </main>
  );
}
