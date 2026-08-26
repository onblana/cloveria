'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';

import { CropPickerModal } from '@/components/common/CropPickerModal';
import {
  CROPS,
  CROP_EMOJI,
  DISPLAY_SLOTS,
  getDisplayBonusPercent,
  type CropId,
  type Inventory,
} from '@/lib/game/data';

interface UseDisplayOptions {
  inventory: Inventory;
  setInventory: Dispatch<SetStateAction<Inventory>>;
  pushLog: (message: string) => void;
}

/**
 * 진열대에 올리고 내리는 상태와 동작.
 * 진열 목록은 저장 대상이자 판매가 계산에 쓰여 화면 바깥에서도 읽어야 하므로 여기서 함께 돌려준다.
 */
export function useDisplay({ inventory, setInventory, pushLog }: UseDisplayOptions) {
  const [display, setDisplay] = useState<CropId[]>([]);

  const putOnDisplay = (cropId: CropId) => {
    if (display.length >= DISPLAY_SLOTS || inventory[cropId].mutant <= 0) return;

    setInventory((prev) => ({
      ...prev,
      [cropId]: { ...prev[cropId], mutant: prev[cropId].mutant - 1 },
    }));
    setDisplay((prev) => [...prev, cropId]);
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

  return { display, setDisplay, putOnDisplay, takeFromDisplay };
}

interface DisplayModalProps {
  display: CropId[];
  inventory: Inventory;
  cropIds: CropId[];
  onPutOnDisplay: (cropId: CropId) => void;
  onTakeFromDisplay: (index: number) => void;
  onClose: () => void;
}

/**
 * 진열대 창.
 * 창을 겹치지 않고 '진열대 → 작물 고르기'로 단계만 바꿔 모바일에서 딤이 겹치지 않게 한다.
 */
export function DisplayModal({
  display,
  inventory,
  cropIds,
  onPutOnDisplay,
  onTakeFromDisplay,
  onClose,
}: DisplayModalProps) {
  const [step, setStep] = useState<'shelf' | 'picker'>('shelf');

  // 올리고 나면 결과를 볼 수 있도록 진열대 화면으로 돌아간다
  const putOnDisplay = (cropId: CropId) => {
    onPutOnDisplay(cropId);
    setStep('shelf');
  };

  if (step === 'picker') {
    return (
      <CropPickerModal
        title="진열할 작물 고르기"
        description="특별한 작물만 진열할 수 있다"
        onBack={() => setStep('shelf')}
        onClose={onClose}
      >
        {cropIds.map((cropId) => (
          <button
            key={cropId}
            onClick={() => putOnDisplay(cropId)}
            disabled={inventory[cropId].mutant <= 0}
            className="flex min-h-12 w-full items-center justify-between rounded-lg border border-neutral-300 px-4 text-sm disabled:opacity-40"
          >
            <span>
              {CROP_EMOJI[cropId]} ✨ {CROPS[cropId].mutantName}
            </span>
            <span className="tabular-nums text-neutral-500">{inventory[cropId].mutant}개</span>
          </button>
        ))}
      </CropPickerModal>
    );
  }

  return (
    <CropPickerModal
      title="진열대"
      description={`놓아둔 만큼 모든 요리가 비싸게 팔린다 (개당 +${getDisplayBonusPercent(1)}%)`}
      onClose={onClose}
    >
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: DISPLAY_SLOTS }, (_, index) => {
          const cropId = display[index];

          if (!cropId) {
            return (
              <button
                key={index}
                onClick={() => setStep('picker')}
                className="h-20 rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-400"
              >
                비어있는
                <br />
                진열대
              </button>
            );
          }

          return (
            <button
              key={index}
              onClick={() => onTakeFromDisplay(index)}
              className="h-20 rounded-lg border border-amber-400 bg-amber-50 text-xs font-semibold text-amber-800"
            >
              ✨ {CROPS[cropId].mutantName}
              <br />
              <span className="font-normal text-amber-600">내리기</span>
            </button>
          );
        })}
      </div>
    </CropPickerModal>
  );
}
