'use client';

import { useEffect, useState } from 'react';

/** 요리를 내고 손님이 먹기까지의 결과. 모달이 열리는 순간의 값을 그대로 들고 있는다 */
export interface CookResult {
  customerName: string;
  playerName: string;
  dishName: string;
  /** 진열 보너스가 붙기 전 금액 */
  basePrice: number;
  /** 진열대 덕분에 더 받은 금액. 진열대가 비어 있으면 0이다 */
  displayBonus: number;
  /** 손님이 실제로 낸 금액(원래 금액 + 진열 보너스) */
  price: number;
  /** 다 먹은 손님이 남기는 한마디 */
  comment: string;
}

interface CookingModalProps {
  result: CookResult;
  /** 그릇 치우기를 눌러 이 창을 닫을 때 */
  onClear: () => void;
}

/** 각 단계를 보여주는 시간 (ms) */
const COOKING_MS = 1500;
const EATING_MS = 1500;

/*
 * TODO: 지금은 기다리는 애니메이션뿐이다. 요리마다 2단계 미니게임으로 바꾸는 것을 검토할 것
 *       - 토마토 파스타: 면 삶기 → 토마토 볶기
 *       - 옥수수 스프: 옥수수 삶기 → 스프 끓이기
 */

/**
 * 요리 → 식사 → 결과를 차례로 보여주는 창.
 * 결과가 나오기 전에는 닫을 수 없고, 화면 전체를 덮어 뒤쪽 버튼도 눌리지 않는다.
 */
export function CookingModal({ result, onClear }: CookingModalProps) {
  const [stage, setStage] = useState<'cooking' | 'eating' | 'result'>('cooking');

  useEffect(() => {
    if (stage === 'cooking') {
      const timer = setTimeout(() => setStage('eating'), COOKING_MS);
      return () => clearTimeout(timer);
    }

    if (stage === 'eating') {
      const timer = setTimeout(() => setStage('result'), EATING_MS);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  return (
    // 바깥을 눌러도 닫히지 않는다. 결과를 보고 그릇을 치워야 다음으로 넘어간다
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-2 backdrop-blur-xs">
      <div className="modal-tall flex w-full flex-col justify-center overflow-y-auto rounded-2xl bg-white p-6">
        {stage === 'cooking' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <span className="animate-bounce text-5xl">🍳</span>
            <p className="animate-pulse text-sm text-neutral-600">음식을 만드는 중...</p>
          </div>
        )}

        {stage === 'eating' && (
          <div className="flex flex-col items-center gap-4 py-6">
            {/* 식사 단계가 짧아 기본 주기(2초)로는 한 번도 깜빡이지 못한다 */}
            <span className="animate-pulse text-5xl [animation-duration:750ms]">🍽️</span>
            <p className="text-center text-sm text-neutral-600">
              {result.customerName},
              <br />
              {result.dishName} 먹는 중
            </p>
          </div>
        )}

        {stage === 'result' && (
          <div className="space-y-4">
            <p className="text-center text-sm text-neutral-500 my-4">{result.customerName}</p>
            <p className="rounded-lg bg-amber-50 px-4 py-3 mb-10 text-sm text-amber-900">
              “{result.comment}”
            </p>
            <div className="space-y-1 text-center text-sm">
              {result.displayBonus > 0 && (
                <p className="text-neutral-800">
                  {result.basePrice}골드
                  <br />
                  <span className="font-semibold text-amber-600">
                    + 진열대 보너스 {result.displayBonus}골드
                  </span>
                </p>
              )}
              <p className="font-semibold mt-2">{result.price}골드를 얻었다!</p>
            </div>
            <button
              onClick={onClear}
              className="min-h-12 w-full rounded-lg bg-neutral-800 py-3 text-sm font-semibold text-white"
            >
              그릇 치우기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
