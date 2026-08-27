'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CoinIcon } from '@/components/icons/CoinIcon';
import { TimerIcon } from '@/components/icons/TimerIcon';
import { BistroView } from '@/components/bistro/BistroView';
import { CookingModal, type CookResult } from '@/components/bistro/CookingModal';
import { DayEndScreen } from '@/components/common/DayEndScreen';
import { HeaderMenu } from '@/components/common/HeaderMenu';
import { PhaseTransition } from '@/components/common/PhaseTransition';
import { useDisplay } from '@/components/farm/DisplayModal';
import { FarmView } from '@/components/farm/FarmView';
import {
  CROPS,
  CROP_IDS,
  CUSTOMERS,
  CUSTOMER_IDS,
  DISPLAY_BONUS_PER_ITEM,
  FRIENDSHIP_MAX,
  FRIENDSHIP_PER_DISH,
  INITIAL_GOLD,
  INITIAL_SEEDS,
  RECIPES,
  STARTER_CROP,
  createDailyRecord,
  createEmptyPlots,
  createEmptyStock,
  createInventory,
  createStarterSeeds,
  createFriendship,
  getDayNumber,
  getDayPhase,
  getFriendshipMessage,
  getGreeting,
  isPlotReady,
  revealGrownPlots,
  type CropId,
  type Customer,
  type Order,
  type Plot,
  type RecipeId,
} from '@/lib/game/data';
import { useRouter } from 'next/navigation';

import { clearGame, loadGame, saveGame } from '@/lib/game/storage';
import { LoadingScreen } from '@/components/LoadingScreen';

const RECIPE_IDS = Object.keys(RECIPES) as RecipeId[];

const pickComment = (customer: Customer, useSpecial: boolean) =>
  useSpecial
    ? customer.specialComment
    : customer.comments[Math.floor(Math.random() * customer.comments.length)];
const pickRecipe = () => RECIPE_IDS[Math.floor(Math.random() * RECIPE_IDS.length)];

/**
 * 한 번의 장사 동안 찾아올 손님들. 손님 순서를 섞어 한 명당 한 번씩만 오게 한다.
 * 장사를 열 때마다 새로 만들어서, 재료가 없어 마감해도 다음 장사엔 다른 손님이 온다.
 */
const createOrders = (): Order[] => {
  const shuffled = [...CUSTOMER_IDS];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.map((customer) => ({ customer, recipeId: pickRecipe() }));
};

/** 저장을 미루는 시간 (ms). 연달아 바뀌어도 마지막 한 번만 쓴다 */
const SAVE_DELAY_MS = 400;

/** 소식 창에 남겨두는 줄 수. 맨 위가 가장 최근이고 아래로 갈수록 옅어진다 */
const LOG_LINES = 3;
const LOG_TONES = ['text-neutral-900', 'text-neutral-500', 'text-neutral-400'];

/*
 * TODO: 이 화면이 모든 상태를 들고 있어 어떤 값이 바뀌어도 하위 화면이 전부 다시 그려진다.
 *       지금 규모에선 문제없지만, 밭 확장으로 칸이 크게 늘거나 캔버스 타일맵이 들어오면
 *       React.memo와 useCallback으로 다시 그리는 범위를 좁힐 것
 */
export default function PlayPage() {
  const router = useRouter();
  // 기록 읽기는 한 번만. 개발 모드에서 이펙트가 두 번 돌아도 로그가 겹치지 않게 한다
  const hasLoaded = useRef(false);
  // loading: 저장된 데이터를 읽는 동안. 읽기 전에 저장하면 기존 기록을 덮어쓰므로 구분이 필요하다
  const [screen, setScreen] = useState<'loading' | 'playing'>('loading');
  const [playerName, setPlayerName] = useState('');

  const [phaseCount, setPhaseCount] = useState(0);
  const [gold, setGold] = useState(INITIAL_GOLD);
  // TODO: 평판은 쓰이는 곳이 없어 주석처리. 손님 종류·레시피 해금을 붙일 때 다시 도입할 것
  // const [reputation, setReputation] = useState(0);
  const [seeds, setSeeds] = useState(createStarterSeeds);
  const [inventory, setInventory] = useState(createInventory);
  const [plots, setPlots] = useState(createEmptyPlots);
  // 이번 장사에 남은 손님들. 맨 앞이 지금 응대할 손님이다
  const [orders, setOrders] = useState<Order[]>([]);
  const [log, setLog] = useState<string[]>([]);
  // 손님별 친밀도. 요리를 낼 때마다 오른다
  const [friendship, setFriendship] = useState(createFriendship);
  // 오늘의 결과 화면에 보여줄 집계. 아침이 오면 비워진다
  const [daily, setDaily] = useState(createDailyRecord);
  // 조리 연출 창에 보여줄 결과. null이면 창이 닫힌 상태다
  const [cookResult, setCookResult] = useState<CookResult | null>(null);
  // 연출이 도는 동안 뒤 화면에 그대로 세워둘 손님. 대기열은 이미 다음으로 넘어가 있다
  const [servedOrder, setServedOrder] = useState<Order | null>(null);
  // 밤을 마무리하는 연출이 화면을 덮고 있는 동안 true
  const [isDayEnding, setIsDayEnding] = useState(false);
  // 전환 연출이 끝나면 넘어갈 단계. null이면 연출이 돌고 있지 않다
  const [pendingPhase, setPendingPhase] = useState<number | null>(null);

  const pushLog = useCallback((message: string) => {
    setLog((prev) => [message, ...prev].slice(0, LOG_LINES));
  }, []);

  const { display, setDisplay, displayCount, putOnDisplay, takeFromDisplay } = useDisplay({
    inventory,
    setInventory,
    pushLog,
  });

  const day = getDayNumber(phaseCount);
  const dayPhase = getDayPhase(phaseCount);
  const nextPhase = getDayPhase(phaseCount + 1);

  // 단계마다 '넘어가기'의 의미가 달라 문구를 따로 만든다
  const advanceLabel =
    dayPhase.kind === 'bistro'
      ? `${dayPhase.name} 장사 마감하기`
      : dayPhase.id === 'night'
        ? `${day}일차 마무리하기`
        : `${nextPhase.name} 장사 시작하기`;

  /*
   * 다 자란 칸의 특별 여부를 그 자리에서 정해 밭에 저장한다.
   * 수확할 때 뽑지 않으므로 화면에 미리 보여줄 수 있고, 새로고침해도 결과가 바뀌지 않는다.
   */
  const revealGrown = (grownPlots: (Plot | null)[], at: number) => {
    const { plots: next, revealed } = revealGrownPlots(grownPlots, at);

    setPlots(next);
    for (const cropId of revealed) {
      pushLog(`✨ ${CROPS[cropId].specialName}이(가) 자랐다! 요정이 반짝인다.`);
    }
  };

  // 시간은 이 버튼으로만 흐른다. 넘기는 일 자체는 전환 연출이 화면을 덮은 뒤에 일어난다
  const advancePhase = () => {
    // 밤은 곧바로 넘기지 않고 하루를 정리하는 화면을 먼저 띄운다
    if (dayPhase.id === 'night') {
      setIsDayEnding(true);
      return;
    }

    setPendingPhase(phaseCount + 1);
  };

  // 단계가 하나 넘어갈 때 밭의 작물도 한 단계만큼 자란다
  const applyPendingPhase = () => {
    if (pendingPhase === null) return;

    // 장사를 열 때마다 손님 대기열을 새로 짠다
    if (getDayPhase(pendingPhase).kind === 'bistro') {
      setOrders(createOrders());
    }
    setPhaseCount(pendingPhase);
    revealGrown(plots, pendingPhase);
  };

  // 연출 도중 타이머가 다시 걸리지 않도록 함수를 고정해 둔다
  const finishDayEnd = useCallback(() => setIsDayEnding(false), []);

  // 화면이 덮여 있는 동안 다음 날 아침으로 넘어가고 집계를 비운다
  const wakeUp = () => {
    const next = phaseCount + 1;
    setPhaseCount(next);
    setOrders([]);
    setDaily(createDailyRecord());
    pushLog(`${getDayNumber(next)}일차 아침이 밝았다.`);
    revealGrown(plots, next);
  };

  // 기록을 여는 화면이다. 읽을 기록이 없으면 이름부터 받도록 시작 화면으로 돌려보낸다
  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    loadGame()
      .then((saved) => {
        if (!saved) {
          router.replace('/');
          return;
        }

        setPlayerName(saved.playerName);
        setGold(saved.gold);
        setPhaseCount(saved.phaseCount);
        setSeeds({ ...createEmptyStock(), ...saved.seeds });
        setInventory({ ...createInventory(), ...saved.crops });
        setPlots(revealGrownPlots(saved.plots, saved.phaseCount).plots);
        setDisplay(saved.display);
        setDaily(saved.daily);
        setFriendship({ ...createFriendship(), ...saved.friendship });
        setOrders(saved.orders);
        setScreen('playing');

        // 시작 화면이 막 만든 기록이면 도입부를, 이어서 하는 기록이면 인사를 띄운다
        if (saved.introShown) {
          pushLog(`${saved.playerName}, 식당 문을 다시 열었다.`);
        } else {
          pushLog(`요정이 ${CROPS[STARTER_CROP].name} 씨앗 ${INITIAL_SEEDS}개를 건넸다.`);
          pushLog(`${saved.playerName}, 할머니가 남겨주신 낡은 식당에 도착했다.`);
        }
      })
      .catch(() => router.replace('/'));
    // setDisplay는 useDisplay가 돌려주는 setState라 값이 바뀌지 않는다
  }, [pushLog, setDisplay, router]);

  /*
   * 저장 대상이 바뀔 때마다 기록한다.
   * 한 번의 행동에도 여러 상태가 함께 바뀌므로, 조금 미뤘다가 마지막 한 번만 쓴다.
   */
  useEffect(() => {
    if (screen !== 'playing') return;

    const timer = setTimeout(() => {
      saveGame({
        playerName,
        gold,
        phaseCount,
        seeds,
        crops: inventory,
        plots,
        display,
        daily,
        friendship,
        orders,
        introShown: true,
      }).catch(() => undefined);
    }, SAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [
    screen,
    playerName,
    gold,
    phaseCount,
    seeds,
    inventory,
    plots,
    display,
    daily,
    friendship,
    orders,
  ]);

  const plant = (index: number, cropId: CropId) => {
    if (plots[index] || seeds[cropId] <= 0) return;

    setSeeds((prev) => ({ ...prev, [cropId]: prev[cropId] - 1 }));
    setPlots((prev) => prev.map((plot, i) => (i === index ? { cropId, plantedPhase: phaseCount } : plot)));
  };

  const harvest = (index: number) => {
    const plot = plots[index];
    if (!plot || !isPlotReady(plot, phaseCount)) return;

    // 특별 여부는 다 자란 순간 이미 정해져 저장돼 있다
    const isSpecial = plot.isSpecial ?? false;
    setInventory((prev) => ({
      ...prev,
      [plot.cropId]: {
        normal: prev[plot.cropId].normal + (isSpecial ? 0 : 1),
        special: prev[plot.cropId].special + (isSpecial ? 1 : 0),
      },
    }));
    setPlots((prev) => prev.map((p, i) => (i === index ? null : p)));
    setDaily((prev) => {
      const before = prev.harvest[plot.cropId] ?? { normal: 0, special: 0 };
      return {
        ...prev,
        harvest: {
          ...prev.harvest,
          [plot.cropId]: {
            normal: before.normal + (isSpecial ? 0 : 1),
            special: before.special + (isSpecial ? 1 : 0),
          },
        },
      };
    });
  };

  const order = orders[0] ?? null;
  const recipe = order ? RECIPES[order.recipeId] : null;

  /*
   * 화면에 세워둘 손님. 연출 중에는 방금 요리를 받은 손님을 그대로 두고,
   * 그릇을 치우면 그때 다음 손님으로 바뀐다. 대기열(order)은 새로고침에 대비해 먼저 줄여둔다.
   */
  const shownOrder = servedOrder ?? order;
  const shownRecipe = shownOrder ? RECIPES[shownOrder.recipeId] : null;

  const { canCook, canCookSpecial } = useMemo(() => {
    if (!recipe) return { canCook: false, canCookSpecial: false };

    const entries = Object.entries(recipe.ingredients) as [CropId, number][];
    // 두 요리는 쓰는 재료가 아예 다르다. 각자 필요한 만큼 있어야 만들 수 있다
    return {
      canCook: entries.every(([cropId, need]) => inventory[cropId].normal >= need),
      canCookSpecial: entries.every(([cropId, need]) => inventory[cropId].special >= need),
    };
  }, [recipe, inventory]);

  const cook = (useSpecial: boolean) => {
    if (!order || !recipe) return;
    if (useSpecial ? !canCookSpecial : !canCook) return;

    const entries = Object.entries(recipe.ingredients) as [CropId, number][];
    setInventory((prev) => {
      const next = { ...prev };
      for (const [cropId, need] of entries) {
        // 특별 요리는 특별 재료만, 일반 요리는 일반 재료만 쓴다
        const usedSpecial = useSpecial ? need : 0;
        next[cropId] = {
          normal: prev[cropId].normal - (need - usedSpecial),
          special: prev[cropId].special - usedSpecial,
        };
      }
      return next;
    });

    const basePrice = Math.round(
      useSpecial ? recipe.price * recipe.specialMultiplier : recipe.price,
    );
    // 진열대에 놓인 특별 작물이 많을수록 모든 요리가 비싸게 팔린다
    const price = Math.round(basePrice * (1 + displayCount * DISPLAY_BONUS_PER_ITEM));
    // 원래 금액과 따로 보여주려고 보너스만 떼어 둔다. 합계는 price 그대로다
    const displayBonus = price - basePrice;

    setGold((prev) => prev + price);
    setDaily((prev) => ({ ...prev, earned: prev.earned + price }));

    // 연출 도중에 새로고침해도 같은 손님을 다시 받지 않도록 여기서 대기열을 줄인다
    setOrders((prev) => prev.slice(1));
    setServedOrder(order);

    const customer = CUSTOMERS[order.customer];
    const dishName = useSpecial ? recipe.specialName : recipe.name;
    setCookResult({
      customerName: customer.name,
      playerName,
      dishName,
      basePrice,
      displayBonus,
      price,
      comment: pickComment(customer, useSpecial),
    });
    pushLog(
      useSpecial
        ? `${customer.name}에게 ${recipe.specialName}을(를) 냈다. 감탄하며 ${price}골드를 냈다!`
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

  // 그릇을 치우면 연출 창이 닫히고 다음 손님이 들어온다
  // 그릇을 치우는 순간 비로소 다음 손님이 화면에 선다
  const clearDishes = () => {
    setCookResult(null);
    setServedOrder(null);
  };

  const buySeed = (cropId: CropId, qty: number) => {
    const total = CROPS[cropId].seedPrice * qty;
    if (gold < total) return;

    setGold((prev) => prev - total);
    setSeeds((prev) => ({ ...prev, [cropId]: prev[cropId] + qty }));
    setDaily((prev) => ({ ...prev, spent: prev.spent + total }));
    pushLog(`${CROPS[cropId].name} 씨앗 ${qty}개를 ${total}골드에 샀다.`);
  };

  // 씨앗도 재료도 골드도 없고 자라는 작물마저 없으면 진행이 막히므로, 요정이 씨앗을 준다
  const totalSeeds = CROP_IDS.reduce((sum, id) => sum + seeds[id], 0);
  const totalCrops = CROP_IDS.reduce(
    (sum, id) => sum + inventory[id].normal + inventory[id].special,
    0,
  );
  const cheapestSeedPrice = Math.min(...CROP_IDS.map((id) => CROPS[id].seedPrice));
  const isStuck =
    screen === 'playing' &&
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

  if (screen === 'loading') {
    return <LoadingScreen message="기록을 불러오는 중..." />;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col p-2 gap-3 sm:gap-4 sm:p-8">
      {/* 좁은 화면에서 줄이 늘어나지 않도록 제목 줄과 상태 줄을 나눈다 */}
      <header className="border-b border-neutral-200 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">{playerName}의 식당</h1>
          <HeaderMenu onReset={resetGame} />
        </div>
        <div className="flex items-center gap-4 text-sm text-neutral-600">
          <span className="flex items-center gap-1">
            <CoinIcon className="text-amber-500" />
            {gold}골드
          </span>
          <span className="flex items-center gap-1">
            <TimerIcon />
            {day}일차 {dayPhase.name}
          </span>
        </div>
      </header>

      <section className="text-xs">
        {log.map((line, index) => (
          <p key={`${phaseCount}-${index}-${line}`} className={LOG_TONES[index]}>
            {line}
          </p>
        ))}
      </section>

      {dayPhase.kind === 'farm' && (
        <FarmView
          gold={gold}
          seeds={seeds}
          plots={plots}
          phaseCount={phaseCount}
          inventory={inventory}
          display={display}
          cropIds={CROP_IDS}
          isStuck={isStuck}
          onBuySeed={buySeed}
          onPlant={plant}
          onHarvest={harvest}
          onPutOnDisplay={putOnDisplay}
          onTakeFromDisplay={takeFromDisplay}
          onReceiveGiftSeed={receiveGiftSeed}
        />
      )}

      <section className="rounded-lg bg-neutral-50 p-4 text-sm">
        <h2 className="mb-2 text-sm font-bold">가지고 있는 요리 재료</h2>
        {CROP_IDS.map((cropId) => (
          <div key={cropId} className="flex flex-wrap items-center gap-4">
            <span>
              {CROPS[cropId].name} {inventory[cropId].normal}개
            </span>
            <span className="text-amber-700">
              ✨ {CROPS[cropId].specialName} {inventory[cropId].special}개
            </span>
          </div>
        ))}
      </section>

      {dayPhase.kind === 'bistro' && (
        <BistroView
          /* 손님이 바뀔 때마다 새로 붙어야 기다리는 연출이 다시 돈다 */
          key={shownOrder?.customer ?? 'empty'}
          customer={shownOrder ? CUSTOMERS[shownOrder.customer] : null}
          greeting={
            shownOrder
              ? getGreeting(CUSTOMERS[shownOrder.customer], friendship[shownOrder.customer])
              : ''
          }
          phaseName={dayPhase.name}
          recipe={shownRecipe}
          isTransitioning={pendingPhase !== null}
          displayCount={displayCount}
          canCook={canCook}
          canCookSpecial={canCookSpecial}
          onCook={cook}
        />
      )}

      {/*
        내용이 짧으면 mt-auto로 화면 아래에 붙고, 길면 sticky로 아래에 떠 있는다.
        좌우로 음수 여백을 줘 배경이 화면 끝까지 덮이게 하고, 그만큼 안쪽 여백으로 되돌린다.
      */}
      <div className="bottom-bar sticky bottom-0 -mx-2 mt-auto bg-background px-2 pt-2 sm:-mx-8 sm:px-8 sm:pt-4">
        <button
          onClick={advancePhase}
          className="min-h-12 w-full rounded-lg bg-neutral-800 py-3 text-sm font-semibold text-white"
        >
          {advanceLabel}
        </button>
      </div>

      {pendingPhase !== null && (
        <PhaseTransition
          onHalfway={applyPendingPhase}
          onFinish={() => setPendingPhase(null)}
        />
      )}

      {cookResult && <CookingModal result={cookResult} onClear={clearDishes} />}

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
