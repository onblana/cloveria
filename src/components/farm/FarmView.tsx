'use client';

import { useState } from 'react';

import { CropPickerModal } from '@/components/common/CropPickerModal';
import { DisplayModal } from '@/components/farm/DisplayModal';
import {
  CROPS,
  CROP_EMOJI,
  isPlotReady,
  type CropId,
  type Display,
  type Inventory,
  type Plot,
} from '@/lib/game/data';

interface FarmViewProps {
  gold: number;
  seeds: Record<CropId, number>;
  plots: (Plot | null)[];
  phaseCount: number;
  inventory: Inventory;
  /** 진열대의 칸별 내용. 비어 있는 칸은 null이다 */
  display: Display;
  cropIds: CropId[];
  /** 진행이 막혀 요정의 도움이 필요한 상태인지 */
  isStuck: boolean;
  onBuySeed: (cropId: CropId, qty: number) => void;
  onPlant: (index: number, cropId: CropId) => void;
  onHarvest: (index: number) => void;
  onPutOnDisplay: (index: number, cropId: CropId) => void;
  onTakeFromDisplay: (index: number) => void;
  onReceiveGiftSeed: () => void;
}

/** 농사 단계(아침·오후·밤) 화면 */
export function FarmView({
  gold,
  seeds,
  plots,
  phaseCount,
  inventory,
  display,
  cropIds,
  isStuck,
  onBuySeed,
  onPlant,
  onHarvest,
  onPutOnDisplay,
  onTakeFromDisplay,
  onReceiveGiftSeed,
}: FarmViewProps) {
  // 씨앗 가게에서 고른 작물과 수량. 저장 대상이 아니라 이 화면에서만 쓰는 값이다
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [shopCrop, setShopCrop] = useState<CropId | null>(null);
  const [seedQty, setSeedQty] = useState(1);
  // 심을 작물을 고르는 중인 밭 칸. null이면 창이 닫힌 상태다
  const [plantTarget, setPlantTarget] = useState<number | null>(null);
  const [isDisplayOpen, setIsDisplayOpen] = useState(false);

  const seedTotal = shopCrop ? CROPS[shopCrop].seedPrice * seedQty : 0;
  const canBuy = shopCrop !== null && gold >= seedTotal;

  const openShop = () => {
    // 창을 열 때마다 고른 작물과 수량을 초기 상태로 되돌린다
    setShopCrop(null);
    setSeedQty(1);
    setIsShopOpen(true);
  };

  // 여러 번 살 수 있도록 사고 나서도 창을 닫지 않는다.
  // 다만 고른 작물은 비워 같은 작물을 잘못 연달아 사는 일을 막는다. 수량은 그대로 둔다
  const buy = () => {
    if (!shopCrop || !canBuy) return;

    onBuySeed(shopCrop, seedQty);
    setShopCrop(null);
  };

  const plant = (cropId: CropId) => {
    if (plantTarget === null || seeds[cropId] <= 0) return;

    onPlant(plantTarget, cropId);
    setPlantTarget(null);
  };

  return (
    <>
      <div className="flex gap-2 my-4">
        <button
          onClick={openShop}
          className="h-11 flex-1 rounded-lg border border-lime-400 bg-lime-200 px-3 text-sm"
        >
          씨앗 상점
        </button>
        <button
          onClick={() => setIsDisplayOpen(true)}
          className="h-11 flex-1 rounded-lg border border-amber-300 bg-amber-200 px-3 text-sm"
        >
          특별 작물 진열대
        </button>
      </div>

      <section>
        <h2 className="mb-2 text-base font-bold">밭</h2>
        {/* 5열 고정. 밭 확장으로 칸이 늘면 아래로 행이 하나씩 늘어난다 */}
        <div className="grid grid-cols-5 gap-2">
          {plots.map((plot, index) => {
            if (!plot) {
              return (
                <button
                  key={index}
                  onClick={() => setPlantTarget(index)}
                  className="h-20 rounded-lg border border-soil-edge bg-soil text-xs text-soil-text"
                >
                  빈 밭
                  <br />
                  심기
                </button>
              );
            }

            const crop = CROPS[plot.cropId];
            const grown = phaseCount - plot.plantedPhase;
            const ready = isPlotReady(plot, phaseCount);

            return (
              <button
                key={index}
                onClick={() => onHarvest(index)}
                disabled={!ready}
                className={`h-20 rounded-lg border text-xs ${
                  !ready
                    ? 'border-neutral-200 text-neutral-500'
                    : plot.isSpecial
                      ? 'border-amber-400 bg-amber-50 font-semibold text-amber-800'
                      : 'border-green-500 bg-green-50 font-semibold text-green-800'
                }`}
              >
                {ready ? (
                  <>
                    {/* 특별 작물은 수확 전에 ✨로 알아볼 수 있다 */}
                    {plot.isSpecial && '✨'}
                    {CROP_EMOJI[plot.cropId]}
                    <br />
                    수확하기
                  </>
                ) : (
                  <>
                    🌱
                    <br />
                    {crop.name}
                    <br />
                    {Math.floor((grown / crop.growPhases) * 100)}%
                  </>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* TODO: 밭 확장 업그레이드 상점. 여기에 '밭 넓히기' 버튼이 들어간다 */}

      {isStuck && (
        <button
          onClick={onReceiveGiftSeed}
          className="min-h-12 rounded-lg border border-green-300 bg-green-50 py-3 text-sm text-green-800"
        >
          🍀 요정에게 도움 청하기
        </button>
      )}

      {isShopOpen && (
        <CropPickerModal
          title="씨앗 상점"
          description={`가진 골드 ${gold}골드`}
          onClose={() => setIsShopOpen(false)}
        >
          {cropIds.map((cropId) => (
            <button
              key={cropId}
              onClick={() => setShopCrop(cropId)}
              className={`flex min-h-12 w-full items-center justify-between rounded-lg border px-4 text-sm ${
                shopCrop === cropId
                  ? 'border-green-500 bg-green-50 font-semibold text-green-800'
                  : 'border-neutral-300'
              }`}
            >
              <span>
                {CROP_EMOJI[cropId]} {CROPS[cropId].name}
              </span>
              <span className="tabular-nums text-neutral-500">
                {CROPS[cropId].seedPrice}골드 · 보유 {seeds[cropId]}개
              </span>
            </button>
          ))}

          {/* 작물을 고르기 전에는 살 수량을 정할 수 없다 */}
          <div className="flex items-center gap-2 pt-1">
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
              onClick={buy}
              disabled={!canBuy}
              className="h-11 flex-1 rounded-lg bg-green-600 px-3 text-sm font-semibold text-white disabled:bg-neutral-300"
            >
              {shopCrop ? `${seedTotal}골드에 사기` : '작물 선택'}
            </button>
          </div>
        </CropPickerModal>
      )}

      {plantTarget !== null && (
        <CropPickerModal
          title="심을 작물 고르기"
          description="씨앗이 있는 작물만 심을 수 있다"
          onClose={() => setPlantTarget(null)}
        >
          {cropIds.map((cropId) => (
            <button
              key={cropId}
              onClick={() => plant(cropId)}
              disabled={seeds[cropId] <= 0}
              className="flex min-h-12 w-full items-center justify-between rounded-lg border border-neutral-300 px-4 text-sm disabled:opacity-40"
            >
              <span>
                {CROP_EMOJI[cropId]} {CROPS[cropId].name}
              </span>
              <span className="tabular-nums text-neutral-500">씨앗 {seeds[cropId]}개</span>
            </button>
          ))}
        </CropPickerModal>
      )}

      {isDisplayOpen && (
        <DisplayModal
          display={display}
          inventory={inventory}
          cropIds={cropIds}
          onPutOnDisplay={onPutOnDisplay}
          onTakeFromDisplay={onTakeFromDisplay}
          onClose={() => setIsDisplayOpen(false)}
        />
      )}
    </>
  );
}
