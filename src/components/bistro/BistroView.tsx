'use client';

import { useEffect, useState } from 'react';

import {
  CROPS,
  getDisplayBonusPercent,
  type CropId,
  type Customer,
  type Recipe,
} from '@/lib/game/data';

/** 기다리는 동안 0.5초마다 무작위로 바꿔 보여줄 문구 */
const WAITING_LINES = [
  '재료를 손질하는 중 😌',
  '신메뉴 구상하는 중 🤔',
  '손님을 기다리는 중 😗',
  '테이블 닦는 중 🙂',
  '멍 때리는 중 🤤',
];

/** 문구가 바뀌는 간격 (ms) */
const LINE_STEP_MS = 800;

/** 손님 한 명이 들어오기까지 기다리는 시간의 최소·최대 (ms) */
const WAIT_MIN_MS = 2000;
const WAIT_MAX_MS = 5000;

interface BistroViewProps {
  customer: Customer | null;
  /** 친밀도에 맞춰 고른 인사. 고르는 기준은 data.ts가 들고 있다 */
  greeting: string;
  /** 지금 단계 이름(점심·저녁). 손님이 다 다녀갔을 때 안내에 쓴다 */
  phaseName: string;
  recipe: Recipe | null;
  /** 화면전환 연출이 도는 중인지. 덮개가 걷힌 뒤에 기다리는 연출을 시작한다 */
  isTransitioning: boolean;
  /** 진열대에 올라간 특별 작물 수. 판매가 보너스 계산에 쓰인다 */
  displayCount: number;
  canCook: boolean;
  canCookSpecial: boolean;
  onCook: (useSpecial: boolean) => void;
  /** 재료가 없어 손님을 그냥 돌려보낼 때 */
  onSendAway: () => void;
}

/** 식당 단계(점심·저녁) 화면 */
export function BistroView({
  customer,
  greeting,
  phaseName,
  recipe,
  isTransitioning,
  displayCount,
  canCook,
  canCookSpecial,
  onCook,
  onSendAway,
}: BistroViewProps) {
  // 장사를 열자마자 손님이 서 있으면 어색해 잠깐 비워 둔다
  const [isWaiting, setIsWaiting] = useState(true);
  const [lineIndex, setLineIndex] = useState(0);

  /*
   * 손님이 바뀔 때마다 이 화면이 새로 붙으므로(key) 시간 재기는 한 번이면 된다.
   * 다만 장사를 여는 순간에는 아직 화면전환 덮개가 남아 있어, 그게 걷힌 뒤부터 센다.
   */
  useEffect(() => {
    if (isTransitioning) return;

    const delay = WAIT_MIN_MS + Math.random() * (WAIT_MAX_MS - WAIT_MIN_MS);
    const timer = setTimeout(() => setIsWaiting(false), delay);

    return () => clearTimeout(timer);
  }, [isTransitioning]);

  useEffect(() => {
    if (!isWaiting || isTransitioning) return;

    const interval = setInterval(
      () =>
        setLineIndex((index) => {
          // 같은 문구가 연달아 나오면 멈춘 것처럼 보여, 직전 것을 뺀 나머지에서 고른다
          const picked = Math.floor(Math.random() * (WAITING_LINES.length - 1));

          return picked >= index ? picked + 1 : picked;
        }),
      LINE_STEP_MS,
    );

    return () => clearInterval(interval);
  }, [isWaiting, isTransitioning]);

  // 대기열이 비면 더 받을 손님이 없다. 기다릴 이유도 없으니 먼저 판정한다
  if (!customer || !recipe) {
    return (
      <p className="rounded-lg bg-white px-4 py-3 text-sm text-neutral-500">
        모든 손님이 다녀갔다.
        <br />
        {phaseName} 장사를 마무리 해야겠다.
      </p>
    );
  }

  // 기다리는 동안에는 주문도 요리 버튼도 보여주지 않는다
  if (isWaiting) {
    return (
      <p className="rounded-lg bg-white px-4 py-3 text-sm text-neutral-500">
        {WAITING_LINES[lineIndex]}
      </p>
    );
  }

  return (
    <>
      <section className="rounded-lg bg-yellow-50 p-4">
        <h2 className="text-sm font-semibold text-amber-600">
          <p className="text-xs mb-1">{customer.name} 방문</p>
          {greeting}
        </h2>
        <p className="mt-1 text-xs">
          주문한 요리: <strong>{recipe.name}</strong>
        </p>
        <p className="mt-1 text-sm text-green-700">
          요리 재료:{' '}
          {(Object.entries(recipe.ingredients) as [CropId, number][])
            .map(([cropId, need]) => `${CROPS[cropId].name} ${need.toLocaleString()}개 필요`)
            .join(', ')}
          {displayCount > 0 && ` · 진열 보너스 +${getDisplayBonusPercent(displayCount)}%`}
        </p>
      </section>

      {canCook || canCookSpecial ? (
        <section className="flex gap-2">
          {canCook && (
            <button
              onClick={() => onCook(false)}
              className="min-h-12 flex-1 rounded-lg bg-green-600 px-2 py-3 text-sm font-semibold text-white"
            >
              🍳 요리해서 내놓기
            </button>
          )}
          {canCookSpecial && (
            <button
              onClick={() => onCook(true)}
              className="min-h-12 flex-1 rounded-lg bg-amber-500 px-2 py-3 text-sm font-semibold text-white"
            >
              ✨ 특별한 요리 만들기
            </button>
          )}
        </section>
      ) : (
        /* 만들 수 없다고 장사가 끝나는 것은 아니다. 이 손님만 보내고 다음 손님을 받는다 */
        <section className="space-y-2">
          <p className="rounded-lg bg-white px-4 py-3 text-sm text-neutral-500">
            재료가 모자라 이 요리는 만들 수 없다.
          </p>
          <button
            onClick={onSendAway}
            className="min-h-12 w-full rounded-lg border border-neutral-300 px-2 py-3 text-sm text-neutral-600"
          >
            돌려보내기
          </button>
        </section>
      )}
    </>
  );
}
