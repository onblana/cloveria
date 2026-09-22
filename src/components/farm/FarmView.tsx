'use client';

import { useRef, useState } from 'react';

import { Modal } from '@/components/common/Modal';
import { DisplayModal } from '@/components/farm/DisplayModal';
import { ShopModal } from '@/components/farm/ShopModal';
import { VillagerModal } from '@/components/farm/VillagerModal';
import {
  CROPS,
  CROP_EMOJI,
  isPlotReady,
  type CropId,
  type Display,
  type Friendship,
  type Inventory,
  type Plot,
} from '@/lib/game/data';

/** 밭 위로 잠깐 떠오르는 이모지 한 개. 애니메이션이 끝나면 스스로 사라진다 */
interface PlotEffect {
  id: number;
  /** 어느 밭 칸 위에 띄울지 */
  index: number;
  emoji: string;
  kind: 'plant' | 'harvest';
}

interface FarmViewProps {
  gold: number;
  seeds: Record<CropId, number>;
  plots: (Plot | null)[];
  phaseCount: number;
  inventory: Inventory;
  /** 손님별 친밀도. 손님 목록 창에서만 쓴다 */
  friendship: Friendship;
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
  friendship,
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
  const [isShopOpen, setIsShopOpen] = useState(false);
  // 심기 모드에서 계속 심을 작물. null이면 심기 모드가 아니다
  const [plantingCrop, setPlantingCrop] = useState<CropId | null>(null);
  // 심기 모드에 들어가며 작물을 고르는 창
  const [isSeedPickerOpen, setIsSeedPickerOpen] = useState(false);
  const [isDisplayOpen, setIsDisplayOpen] = useState(false);
  const [isVillagersOpen, setIsVillagersOpen] = useState(false);
  // 심기·수확 연출. 같은 칸을 연달아 눌러도 겹쳐 보이도록 목록으로 들고 있는다
  const [effects, setEffects] = useState<PlotEffect[]>([]);
  const nextEffectId = useRef(0);

  const addEffect = (index: number, emoji: string, kind: PlotEffect['kind']) => {
    const id = nextEffectId.current++;

    setEffects((prev) => [...prev, { id, index, emoji, kind }]);
  };

  /*
   * 밭 칸 하나에 걸린 연출들.
   * 지우는 일은 타이머 대신 애니메이션이 끝나는 순간에 맡겨, 길이가 어긋날 일이 없다.
   */
  const renderEffects = (index: number) =>
    effects
      .filter((effect) => effect.index === index)
      .map((effect) => (
        <span
          key={effect.id}
          onAnimationEnd={() =>
            setEffects((prev) => prev.filter((item) => item.id !== effect.id))
          }
          className={`pointer-events-none absolute left-1/2 top-0 text-2xl ${
            effect.kind === 'plant' ? 'plot-drop' : 'plot-rise'
          }`}
        >
          {effect.emoji}
        </span>
      ));

  // 고른 작물을 들고 심기 모드로 들어간다
  const chooseCrop = (cropId: CropId) => {
    if (seeds[cropId] <= 0) return;

    setPlantingCrop(cropId);
    setIsSeedPickerOpen(false);
  };

  // 밭에 보이던 모습 그대로 떠오르도록, 특별 작물이면 ✨까지 함께 띄운다
  const tapGrownPlot = (index: number, plot: Plot) => {
    onHarvest(index);
    addEffect(index, `${plot.isSpecial ? '✨' : ''}${CROP_EMOJI[plot.cropId]}`, 'harvest');
  };

  /*
   * 빈 밭은 심기 모드에서 씨앗을 들고 있을 때만 반응한다.
   * 그 밖에는 아무 일도 하지 않아, 밭을 누르다 창이 열리는 일이 없다.
   */
  const tapEmptyPlot = (index: number) => {
    if (!plantingCrop) return;

    // 씨앗이 떨어지면 더 심을 수 없으니 심기 모드를 끝낸다
    if (seeds[plantingCrop] <= 0) {
      setPlantingCrop(null);
      return;
    }

    onPlant(index, plantingCrop);
    addEffect(index, '🌱', 'plant');
  };

  return (
    <>
      <div className="flex gap-1 my-4">
        <button
          onClick={() => setIsDisplayOpen(true)}
          className="h-10 flex-1 rounded-lg border border-amber-300 bg-amber-200 px-3 text-sm"
        >
          진열대
        </button>
        <button
          onClick={() => setIsShopOpen(true)}
          className="h-10 flex-1 rounded-lg border border-lime-400 bg-lime-200 px-3 text-sm"
        >
          상점
        </button>
        <button
          onClick={() => setIsVillagersOpen(true)}
          className="h-10 flex-1 rounded-lg border border-sky-300 bg-sky-200 px-3 text-sm"
        >
          손님 목록
        </button>
      </div>

      <section>
        <div className={`mt-2 items-center ${
          plantingCrop
            ? 'grid grid-cols-2 justify-between gap-2'
            : 'flex justify-center'
        }`}
        >
          {plantingCrop
            ? <h2 className="ml-1 text-center font-bold text-sm text-green-700">
              {CROPS[plantingCrop].name} 씨앗 심는 중
            </h2>
            : <span></span>
          }
          <button
            onClick={() =>
              plantingCrop ? setPlantingCrop(null) : setIsSeedPickerOpen(true)
            }
            className={`h-10 shrink-0 rounded-lg border text-sm px-3 mb-1 ${
              plantingCrop
                ? 'border-neutral-300 bg-gray-50 font-semibold text-green-800'
                : 'border-neutral-300 bg-green-800 font-bold text-white px-22'
            }`}
          >
            {plantingCrop ? '심기 종료' : '씨앗 심기'}
          </button>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {plots.map((plot, index) => {
            if (!plot) {
              return (
                // 연출이 밭 칸을 기준으로 떠오르도록 칸마다 자리를 잡아 둔다
                <div key={index} className="relative">
                  <button
                    onClick={() => tapEmptyPlot(index)}
                    className="h-20 w-full rounded-lg border border-soil-edge bg-soil text-xs text-soil-text max-h-[20vw]"
                  >
                    빈 밭
                  </button>
                  {renderEffects(index)}
                </div>
              );
            }

            const crop = CROPS[plot.cropId];
            const grown = phaseCount - plot.plantedPhase;
            const ready = isPlotReady(plot, phaseCount);

            return (
              <div key={index} className="relative">
                <button
                  onClick={() => tapGrownPlot(index, plot)}
                  disabled={!ready}
                  className={`h-20 w-full rounded-lg border text-xs max-h-[20vw] ${
                    !ready
                      ? 'border-neutral-200 text-neutral-600 bg-lime-50'
                      : plot.isSpecial
                        ? 'border-amber-500 bg-amber-100 font-semibold text-amber-800'
                        : 'border-green-600 bg-green-100 font-semibold text-green-800'
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
                      {crop.name}
                      <br />
                      {Math.floor((grown / crop.growPhases) * 100)}%
                    </>
                  )}
                </button>
                {renderEffects(index)}
              </div>
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
          🍀 요정에게 도움 요청하기
        </button>
      )}

      {isShopOpen && (
        <ShopModal
          gold={gold}
          seeds={seeds}
          cropIds={cropIds}
          onBuySeed={onBuySeed}
          onClose={() => setIsShopOpen(false)}
        />
      )}

      {isSeedPickerOpen && (
        <Modal
          title="심을 작물 고르기"
          onClose={() => setIsSeedPickerOpen(false)}
        >
          <div className="grid grid-cols-2 gap-2 mb-6">
            {cropIds.map((cropId) => (
              <button
                key={cropId}
                onClick={() => chooseCrop(cropId)}
                disabled={seeds[cropId] <= 0}
                className="flex min-h-16 flex-col items-start justify-center gap-0.5 rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-40"
              >
                <span>
                  {CROP_EMOJI[cropId]} {CROPS[cropId].name} 씨앗
                </span>
                <span className="mt-1 text-right tabular-nums text-neutral-600">
                  보유 {seeds[cropId].toLocaleString()}개
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {isVillagersOpen && (
        <VillagerModal friendship={friendship} onClose={() => setIsVillagersOpen(false)} />
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
