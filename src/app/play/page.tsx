'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CoinIcon } from '@/components/icons/CoinIcon';
import { BistroView } from '@/components/bistro/BistroView';
import { CookingModal, type CookResult } from '@/components/bistro/CookingModal';
import { FarewellModal } from '@/components/bistro/FarewellModal';
import { DayEndScreen } from '@/components/common/DayEndScreen';
import { HeaderMenu } from '@/components/common/HeaderMenu';
import { PhaseTransition } from '@/components/common/PhaseTransition';
import { RestScreen } from '@/components/common/RestScreen';
import { ToastStack, type Toast } from '@/components/common/ToastStack';
import { useFitToScreen } from '@/components/common/useFitToScreen';
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
  FRIENDSHIP_PER_MISS,
  INITIAL_GOLD,
  INITIAL_SEEDS,
  RECIPES,
  STARTER_CROP,
  createDailyRecord,
  createEmptyPlots,
  createEmptyStock,
  createInventory,
  createStarterSeeds,
  createUnlockedCrops,
  createFriendship,
  getDayNumber,
  getDayPhase,
  getFriendshipMessage,
  getGreeting,
  getOrderableRecipeIds,
  growOvernight,
  isPlotReady,
  revealGrownPlots,
  type CropId,
  type Customer,
  type Order,
  type RecipeId,
} from '@/lib/game/data';
import { useRouter } from 'next/navigation';

import { clearGame, loadGame, saveGame } from '@/lib/game/storage';
import { LoadingScreen } from '@/components/LoadingScreen';


const pickComment = (customer: Customer, useSpecial: boolean) =>
  useSpecial
    ? customer.specialComment
    : customer.comments[Math.floor(Math.random() * customer.comments.length)];
const pickRecipe = (recipeIds: RecipeId[]) =>
  recipeIds[Math.floor(Math.random() * recipeIds.length)];

/**
 * 한 번의 장사 동안 찾아올 손님들. 손님 순서를 섞어 한 명당 한 번씩만 오게 한다.
 * 장사를 열 때마다 새로 만들어서, 재료가 없어 마감해도 다음 장사엔 다른 손님이 온다.
 */
const createOrders = (recipeIds: RecipeId[]): Order[] => {
  const shuffled = [...CUSTOMER_IDS];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.map((customer) => ({ customer, recipeId: pickRecipe(recipeIds) }));
};

/** 저장을 미루는 시간 (ms). 연달아 바뀌어도 마지막 한 번만 쓴다 */
const SAVE_DELAY_MS = 400;

/** 소식 창에 남겨두는 줄 수. 맨 위가 가장 최근이고 아래로 갈수록 옅어진다 */
/** 토스트 하나가 화면에 머무는 시간 (ms) */
const TOAST_MS = 3000;

/*
 * TODO: 이 화면이 모든 상태를 들고 있어 어떤 값이 바뀌어도 하위 화면이 전부 다시 그려진다.
 *       지금 규모에선 문제없지만, 밭 확장으로 칸이 크게 늘거나 캔버스 타일맵이 들어오면
 *       React.memo와 useCallback으로 다시 그리는 범위를 좁힐 것
 */
export default function PlayPage() {
  const router = useRouter();
  // 내용이 화면보다 길면 전체를 줄여 세로 스크롤을 없앤다
  const { ref: mainRef, zoom } = useFitToScreen<HTMLElement>();
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
  // 한 번이라도 수확해 본 작물. 여기 없는 작물이 든 요리는 주문으로 나오지 않는다
  const [unlockedCrops, setUnlockedCrops] = useState(createUnlockedCrops);
  // 화면 위에 잠깐 떠오르는 알림들. 저장하지 않고 시간이 지나면 사라진다
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
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
  // 장사를 건너뛰는 연출이 화면을 덮고 있는 동안 true
  const [isResting, setIsResting] = useState(false);
  // 요리를 못 받고 돌아가는 손님의 인사. 손님을 하나씩 돌려보낼 때만 띄운다
  const [farewell, setFarewell] = useState<{
    customerName: string;
    comment: string;
  } | null>(null);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (message: string, kind: Toast['kind'] = 'normal') => {
      toastId.current += 1;
      const id = toastId.current;

      // 배열 앞에 넣어 최신 알림이 맨 위에 쌓이게 한다
      setToasts((prev) => [{ id, message, kind }, ...prev]);
      // 눌러야 닫히는 알림은 시간이 지나도 그대로 둔다
      if (kind === 'normal') {
        setTimeout(() => dismissToast(id), TOAST_MS);
      }
    },
    [dismissToast],
  );

  const { display, setDisplay, displayCount, putOnDisplay, takeFromDisplay } = useDisplay({
    inventory,
    setInventory,
    pushToast,
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

  const skipLabel = `${nextPhase.name} 장사 건너뛰기`;

  // 농사 단계에서 바로 다음이 장사일 때만 건너뛸 수 있다
  const canSkipBistro = dayPhase.kind === 'farm' && nextPhase.kind === 'bistro';

  // 시간은 이 버튼으로만 흐른다. 넘기는 일 자체는 전환 연출이 화면을 덮은 뒤에 일어난다
  const advancePhase = () => {
    // 밤은 곧바로 넘기지 않고 하루를 정리하는 화면을 먼저 띄운다
    if (dayPhase.id === 'night') {
      setIsDayEnding(true);
      return;
    }

    if (dayPhase.kind === 'bistro') {
      closeShop();
      return;
    }

    setPendingPhase(phaseCount + 1);
  };

  /*
   * 장사를 마감한다. 기다리던 손님이 있으면 재료가 남았든 아니든 헛걸음을 시킨 셈이라
   * 친밀도가 깎인다. 유저가 스스로 고른 일이라 인사 창까지 띄우지 않고 토스트로만 알린다.
   */
  const closeShop = () => {
    if (order) {
      sendCustomerHome(CUSTOMERS[order.customer]);
    }

    setPendingPhase(phaseCount + 1);
  };

  /** 헛걸음한 손님과는 사이가 멀어진다. 0 아래로는 내려가지 않는다 */
  const sendCustomerHome = (customer: Customer) => {
    const before = friendship[customer.id];
    const after = Math.max(before - FRIENDSHIP_PER_MISS, 0);

    setFriendship((prev) => ({ ...prev, [customer.id]: after }));
    // TODO: 친밀도 변화 표기는 값을 확인하려고 붙인 것이다. 밸런스를 정하고 나면 지울 것
    pushToast(
      `${customer.name}${customer.postpositionSubject} 그냥 돌아갔다.\n친밀도 ${before.toLocaleString()} => ${after.toLocaleString()}`,
    );
  };

  /*
   * 장사를 열지 않고 다음 농사 단계로 건너뛴다.
   * 시계 전환 대신 하얗게 덮는 연출을 쓴다. 하루를 마무리할 때와 같은 결이다.
   */
  const skipBistro = () => setIsResting(true);

  // 인사를 닫으면 뒤이어 다음 손님을 받는다
  const closeFarewell = () => {
    setFarewell(null);
    setServedOrder(null);
  };

  /** 손님 하나를 그냥 돌려보내고 다음 손님으로 넘어간다 */
  const sendAway = () => {
    if (!order) return;

    const customer = CUSTOMERS[order.customer];

    // 인사가 떠 있는 동안 뒤 화면에 이 손님을 세워 둔다
    setOrders((prev) => prev.slice(1));
    setServedOrder(order);
    sendCustomerHome(customer);

    setFarewell({ customerName: customer.name, comment: customer.missedComment });
  };

  // 단계가 하나 넘어갈 때 밭의 작물도 한 단계만큼 자란다
  const applyPhase = (next: number) => {
    // 장사를 열 때마다 손님 대기열을 새로 짠다
    if (getDayPhase(next).kind === 'bistro') {
      setOrders(createOrders(getOrderableRecipeIds(unlockedCrops)));
    }
    setPhaseCount(next);
    // 다 자란 칸의 특별 여부를 그 자리에서 정해 둔다. 밭에 ✨로 바로 드러난다
    setPlots(revealGrownPlots(plots, next));
  };

  const applyPendingPhase = () => {
    if (pendingPhase === null) return;

    // 시계 전환의 덮개가 다 덮인 순간이라, 이때 흰 화면을 걷어야 티가 나지 않는다
    setIsResting(false);
    applyPhase(pendingPhase);
  };

  // 연출 도중 타이머가 다시 걸리지 않도록 함수를 고정해 둔다
  const finishDayEnd = useCallback(() => setIsDayEnding(false), []);

  // 화면이 덮여 있는 동안 다음 날 아침으로 넘어가고 집계를 비운다
  const wakeUp = () => {
    const next = phaseCount + 1;
    setPhaseCount(next);
    setOrders([]);
    setDaily(createDailyRecord());
    // 밤을 지나며 한 단계 더 자란 뒤에 특별 여부를 판정한다
    setPlots(revealGrownPlots(growOvernight(plots), next));
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
        setPlots(revealGrownPlots(saved.plots, saved.phaseCount));
        setDisplay(saved.display);
        setDaily(saved.daily);
        setFriendship({ ...createFriendship(), ...saved.friendship });
        setOrders(saved.orders);
        setUnlockedCrops(saved.unlockedCrops);
        setScreen('playing');

        // 시작 화면이 막 만든 기록이면 도입부를, 이어서 하는 기록이면 인사를 띄운다
        if (saved.introShown) {
          pushToast(`${saved.playerName}, 식당 문을 다시 열었다.`);
        } else {
          pushToast(`요정이 ${CROPS[STARTER_CROP].name} 씨앗 ${INITIAL_SEEDS.toLocaleString()}개를 건넸다.`);
          pushToast(`${saved.playerName}, 할머니가 남겨주신 낡은 식당에 도착했다.`);
        }
      })
      .catch(() => router.replace('/'));
    // setDisplay는 useDisplay가 돌려주는 setState라 값이 바뀌지 않는다
  }, [pushToast, setDisplay, router]);

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
        unlockedCrops,
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
    unlockedCrops,
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

    // 처음 거둔 작물은 그때부터 그 작물이 든 요리가 주문에 나온다
    setUnlockedCrops((prev) => (prev.includes(plot.cropId) ? prev : [...prev, plot.cropId]));
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

  /*
   * 주문에 나올 수 있는 요리 중 하나라도 만들 수 있는지.
   * 하나도 없으면 손님을 바꿔 봐야 소용이 없어, 오늘 장사는 여기서 접는 수밖에 없다.
   */
  const canCookAny = useMemo(
    () =>
      getOrderableRecipeIds(unlockedCrops).some((recipeId) => {
        const entries = Object.entries(RECIPES[recipeId].ingredients) as [CropId, number][];

        return (
          entries.every(([cropId, need]) => inventory[cropId].normal >= need) ||
          entries.every(([cropId, need]) => inventory[cropId].special >= need)
        );
      }),
    [unlockedCrops, inventory],
  );

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

    // 요리를 하나 낼 때마다 친밀도가 오른다
    const before = friendship[customer.id];
    const after = Math.min(before + FRIENDSHIP_PER_DISH, FRIENDSHIP_MAX);
    setFriendship((prev) => ({ ...prev, [customer.id]: after }));

    // TODO: 친밀도 변화를 보려고 띄우는 알림이다. 밸런스를 정하고 나면 이 토스트째로 지울 것
    pushToast(
      `${customer.name}에게 ${dishName}${recipe.postpositionObject} 냈다.\n친밀도 ${before.toLocaleString()} => ${after.toLocaleString()}`,
    );

    // 정해진 단계를 넘어설 때만 한 번씩 알린다
    const message = getFriendshipMessage(customer, before, after);
    if (message) {
      pushToast(message, 'milestone');
    }
  };

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
    pushToast(`${CROPS[cropId].name} 씨앗 ${qty.toLocaleString()}개를 ${total.toLocaleString()}골드에 샀다.`);
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
    pushToast('요정이 조용히 씨앗 주머니 하나를 놓고 갔다.');
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
    <main
      ref={mainRef}
      style={{ zoom }}
      className={`mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 bg-surface p-2 sm:gap-4 sm:p-8 ${
        dayPhase.kind === 'farm' ? 'phase-farm' : 'phase-bistro'
      }`}
    >
      <header className="border-b border-neutral-200 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">
            {playerName}의 {dayPhase.kind === 'farm' ? '텃밭' : '식당'}
          </h1>
          <HeaderMenu onReset={resetGame} />
        </div>
        <div className="flex items-center gap-4 text-sm text-neutral-600">
          <span className="flex items-center gap-1">
            <CoinIcon className="text-amber-500" />
            {gold.toLocaleString()}골드
          </span>
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${
              dayPhase.kind === 'farm'
                ? 'bg-green-100 text-green-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {dayPhase.kind === 'farm' ? '🌱' : '🍳'} {day}일차 {dayPhase.name}
          </span>
        </div>
      </header>

      {dayPhase.kind === 'farm' && (
        <FarmView
          /*
           * 단계가 넘어가면 심기 모드와 상점 상태를 처음으로 되돌린다.
           * 밤과 다음날 아침은 둘 다 농사 단계라 이 화면이 그대로 남아,
           * 놔두면 잠든 뒤에도 어제 고른 씨앗을 계속 들고 있는 것처럼 보인다.
           */
          key={phaseCount}
          gold={gold}
          seeds={seeds}
          plots={plots}
          phaseCount={phaseCount}
          inventory={inventory}
          friendship={friendship}
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
              {CROPS[cropId].name} {inventory[cropId].normal.toLocaleString()}개
            </span>
            <span className="text-amber-700">
              ✨ {CROPS[cropId].specialName} {inventory[cropId].special.toLocaleString()}개
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
          canCookAny={canCookAny}
          onCook={cook}
          onSendAway={sendAway}
        />
      )}

      {/*
        내용이 짧으면 mt-auto로 화면 아래에 붙고, 길면 sticky로 아래에 떠 있는다.
        좌우로 음수 여백을 줘 배경이 화면 끝까지 덮이게 하고, 그만큼 안쪽 여백으로 되돌린다.
      */}
      <div className="bottom-bar sticky bottom-0 -mx-2 mt-auto flex gap-2 bg-surface px-2 pt-2 sm:-mx-8 sm:px-8 sm:pt-4">
        <button
          onClick={advancePhase}
          className="min-h-12 flex-1 rounded-lg bg-neutral-800 py-3 text-sm font-semibold text-white"
        >
          {advanceLabel}
        </button>
        {canSkipBistro && (
          <button
            onClick={skipBistro}
            className="min-h-12 flex-1 rounded-lg border border-neutral-300 bg-neutral-100 py-3 text-sm text-neutral-600"
          >
            {skipLabel}
          </button>
        )}
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {isResting && (
        <RestScreen
          message={`${nextPhase.name} 장사를 쉬었다`}
          onFinish={() => setPendingPhase(phaseCount + 2)}
        />
      )}

      {pendingPhase !== null && (
        <PhaseTransition
          onHalfway={applyPendingPhase}
          onFinish={() => setPendingPhase(null)}
        />
      )}

      {farewell && (
        <FarewellModal
          customerName={farewell.customerName}
          comment={farewell.comment}
          onClose={closeFarewell}
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
