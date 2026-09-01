'use client';

import { useEffect, useRef, useState } from 'react';

import { CropPickerModal } from '@/components/common/CropPickerModal';
import { CROPS, CROP_EMOJI, type CropId } from '@/lib/game/data';

/** 수량 버튼을 길게 눌렀다고 판단하기까지의 시간 (ms) */
const REPEAT_DELAY = 400;
/** 길게 누르는 동안 수량이 한 칸씩 바뀌는 간격 (ms) */
const REPEAT_INTERVAL = 100;

interface ShopModalProps {
  gold: number;
  seeds: Record<CropId, number>;
  cropIds: CropId[];
  onBuySeed: (cropId: CropId, qty: number) => void;
  onClose: () => void;
}

/** 씨앗을 사는 창. 창이 열릴 때마다 고른 작물과 수량은 초기 상태에서 시작한다 */
export function ShopModal({ gold, seeds, cropIds, onBuySeed, onClose }: ShopModalProps) {
  const [shopCrop, setShopCrop] = useState<CropId | null>(null);
  const [seedQty, setSeedQty] = useState(1);

  // 길게 누르기용 타이머. 누르기 시작한 뒤의 대기와 그 뒤의 반복을 따로 잡는다
  const delayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const seedTotal = shopCrop ? CROPS[shopCrop].seedPrice * seedQty : 0;
  const canBuy = shopCrop !== null && gold >= seedTotal;
  // 지금 가진 골드로 살 수 있는 씨앗 수. 한 개도 못 사더라도 1보다 아래로는 내리지 않는다
  const maxSeedQty = shopCrop
    ? Math.max(Math.floor(gold / CROPS[shopCrop].seedPrice), 1)
    : 1;

  const changeQty = (diff: number) => setSeedQty((q) => Math.max(q + diff, 1));

  const stopRepeat = () => {
    if (delayTimer.current) clearTimeout(delayTimer.current);
    if (repeatTimer.current) clearInterval(repeatTimer.current);
    delayTimer.current = null;
    repeatTimer.current = null;
  };

  const startRepeat = (diff: number) => {
    stopRepeat();
    changeQty(diff);
    delayTimer.current = setTimeout(() => {
      repeatTimer.current = setInterval(() => changeQty(diff), REPEAT_INTERVAL);
    }, REPEAT_DELAY);
  };

  useEffect(() => {
    window.addEventListener('pointerup', stopRepeat);
    window.addEventListener('pointercancel', stopRepeat);

    return () => {
      window.removeEventListener('pointerup', stopRepeat);
      window.removeEventListener('pointercancel', stopRepeat);
      stopRepeat();
    };
  }, []);

  // 여러 번 살 수 있도록 사고 나서도 창을 닫지 않는다.
  // 다만 고른 작물은 비워 같은 작물을 잘못 연달아 사는 일을 막는다. 수량은 그대로.
  const buy = () => {
    if (!shopCrop || !canBuy) return;

    onBuySeed(shopCrop, seedQty);
    setShopCrop(null);
  };

  return (
    <CropPickerModal
      title="상점"
      description={` 골드: ${gold.toLocaleString()}골드`}
      onClose={onClose}
    >
      <div className="grid grid-cols-3 gap-1">
        {cropIds.map((cropId) => (
          <button
            key={cropId}
            onClick={() => setShopCrop(cropId)}
            className={`flex min-h-16 flex-col items-start justify-center gap-0.5 rounded-lg border px-3 py-2 text-sm ${
              shopCrop === cropId
                ? 'border-green-500 bg-green-50 font-semibold text-green-800'
                : 'border-neutral-300'
            }`}
          >
            <span className="text-xs">
              <span className="text-lg">{CROP_EMOJI[cropId]}</span><br />
              {CROPS[cropId].name} 씨앗
            </span>
            <span className="text-xs w-full text-center tabular-nums text-neutral-500">
              개당 {CROPS[cropId].seedPrice.toLocaleString()}골드<br />
              {seeds[cropId].toLocaleString()}개 보유
            </span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onPointerDown={() => startRepeat(-1)}
          disabled={seedQty <= 1}
          className="h-11 w-11 shrink-0 select-none touch-manipulation rounded-lg border border-neutral-300 text-lg disabled:opacity-40"
        >
          −
        </button>
        <span className="my-auto text-center tabular-nums">
          {seedQty.toLocaleString()}
        </span>
        <button
          onPointerDown={() => startRepeat(1)}
          className="h-11 w-11 shrink-0 select-none touch-manipulation rounded-lg border border-neutral-300 text-lg"
        >
          +
        </button>
        <button
          onClick={() => setSeedQty(maxSeedQty)}
          disabled={shopCrop === null}
          className="h-11 shrink-0 rounded-lg border border-neutral-300 px-2 text-xs disabled:opacity-40"
        >
          최대
        </button>
      </div>
      <button
        onClick={buy}
        disabled={!canBuy}
        className="h-11 rounded-lg bg-green-600 px-3 text-sm font-semibold text-white disabled:bg-neutral-300"
      >
        {shopCrop ? `${seedTotal.toLocaleString()}골드에 사기` : '작물 선택'}
      </button>
    </CropPickerModal>
  );
}
