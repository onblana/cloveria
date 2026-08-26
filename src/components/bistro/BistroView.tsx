'use client';

import {
  CROPS,
  getDisplayBonusPercent,
  type CropId,
  type Customer,
  type Recipe,
} from '@/lib/game/data';

interface BistroViewProps {
  customer: Customer | null;
  /** 친밀도에 맞춰 고른 인사. 고르는 기준은 data.ts가 들고 있다 */
  greeting: string;
  /** 지금 단계 이름(점심·저녁). 손님이 다 다녀갔을 때 안내에 쓴다 */
  phaseName: string;
  recipe: Recipe | null;
  /** 진열대에 올라간 특별 작물 수. 판매가 보너스 계산에 쓰인다 */
  displayCount: number;
  canCook: boolean;
  canCookSpecial: boolean;
  onCook: (useSpecial: boolean) => void;
}

/** 식당 단계(점심·저녁) 화면 */
export function BistroView({
  customer,
  greeting,
  phaseName,
  recipe,
  displayCount,
  canCook,
  canCookSpecial,
  onCook,
}: BistroViewProps) {
  // 대기열이 비면 더 받을 손님이 없다
  if (!customer || !recipe) {
    return (
      <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
        모든 손님이 다녀갔다.
        <br />
        {phaseName} 장사를 마무리 해야겠다.
      </p>
    );
  }

  return (
    <>
      <section className="rounded-lg bg-amber-50 p-4">
        <h2 className="text-sm font-semibold text-amber-600">
          <p className="text-xs mb-1">{customer.name} 방문</p>
          {greeting}
        </h2>
        <p className="mt-1 text-xs">
          주문한 요리는 <strong>{recipe.name}</strong>!
        </p>
        <p className="mt-1 text-sm text-green-700">
          요리 재료:{' '}
          {(Object.entries(recipe.ingredients) as [CropId, number][])
            .map(([cropId, need]) => `${CROPS[cropId].name} ${need}개 필요`)
            .join(', ')}
          {displayCount > 0 && ` · 진열 보너스 +${getDisplayBonusPercent(displayCount)}%`}
        </p>
      </section>

      {/* 만들 수 없는 요리는 흐리게 두지 않고 아예 감춘다 */}
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
        <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
          요리 재료가 모자라 더 이상 장사를 할 수 없다.
          <br />
          농사를 더 지어야겠다.
        </p>
      )}
    </>
  );
}
