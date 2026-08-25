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
  recipe: Recipe | null;
  /** 진열대에 올라간 변이 작물 수. 판매가 보너스 계산에 쓰인다 */
  displayCount: number;
  canCook: boolean;
  canCookSignature: boolean;
  onCook: (useSignature: boolean) => void;
}

/** 식당 단계(점심·저녁) 화면 */
export function BistroView({
  customer,
  greeting,
  recipe,
  displayCount,
  canCook,
  canCookSignature,
  onCook,
}: BistroViewProps) {
  return (
    <>
      {customer && recipe && (
        <section className="rounded-lg bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-600">
            {greeting} - {customer.name} 방문
          </h2>
          <p className="mt-1 text-sm">
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
      )}

      {canCook || canCookSignature ? (
        <section className="flex gap-2">
          <button
            onClick={() => onCook(false)}
            disabled={!canCook}
            className="min-h-12 flex-1 rounded-lg bg-green-600 px-2 py-3 text-sm font-semibold text-white disabled:bg-neutral-300"
          >
            🍳 요리해서 내놓기
          </button>
          <button
            onClick={() => onCook(true)}
            disabled={!canCookSignature}
            className="min-h-12 flex-1 rounded-lg bg-amber-500 px-2 py-3 text-sm font-semibold text-white disabled:bg-neutral-300"
          >
            ✨ 시그니처로 만들기
          </button>
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
