'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';

import { CropPickerModal } from '@/components/common/CropPickerModal';
import {
  CROPS,
  CROP_EMOJI,
  createEmptyDisplay,
  getDisplayBonusPercent,
  type CropId,
  type Display,
  type Inventory,
} from '@/lib/game/data';

interface UseDisplayOptions {
  inventory: Inventory;
  setInventory: Dispatch<SetStateAction<Inventory>>;
  pushToast: (message: string) => void;
}

/**
 * 진열대에 올리고 내리는 상태와 동작.
 * 진열 목록은 저장 대상이자 판매가 계산에 쓰여 화면 바깥에서도 읽어야 하므로 여기서 함께 돌려준다.
 */
export function useDisplay({ inventory, setInventory, pushToast }: UseDisplayOptions) {
  const [display, setDisplay] = useState<Display>(createEmptyDisplay);

  // 고른 칸에 그대로 올린다. 앞으로 당겨 채우지 않아 유저가 놓은 자리가 유지된다
  const putOnDisplay = (index: number, cropId: CropId) => {
    if (display[index] || inventory[cropId].special <= 0) return;

    setInventory((prev) => ({
      ...prev,
      [cropId]: { ...prev[cropId], special: prev[cropId].special - 1 },
    }));
    setDisplay((prev) => prev.map((slot, i) => (i === index ? cropId : slot)));
    pushToast(`${CROPS[cropId].specialName}을(를) 진열했다. 손님들이 눈을 떼지 못한다.`);
  };

  // 내린 칸은 비워만 두고 뒤 칸을 당기지 않는다
  const takeFromDisplay = (index: number) => {
    const cropId = display[index];
    if (!cropId) return;

    setInventory((prev) => ({
      ...prev,
      [cropId]: { ...prev[cropId], special: prev[cropId].special + 1 },
    }));
    setDisplay((prev) => prev.map((slot, i) => (i === index ? null : slot)));
    pushToast(`${CROPS[cropId].specialName}을(를) 진열대에서 내렸다.`);
  };

  /** 판매가 보너스는 칸 위치가 아니라 올려둔 개수로만 정해진다 */
  const displayCount = display.filter(Boolean).length;

  return { display, setDisplay, displayCount, putOnDisplay, takeFromDisplay };
}

interface DisplayModalProps {
  display: Display;
  inventory: Inventory;
  cropIds: CropId[];
  onPutOnDisplay: (index: number, cropId: CropId) => void;
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
  // 작물을 고르는 중인 진열 칸. null이면 진열대 화면을 보여준다
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);

  // 올리고 나면 결과를 볼 수 있도록 진열대 화면으로 돌아간다
  const putOnDisplay = (cropId: CropId) => {
    if (pickerSlot === null) return;

    onPutOnDisplay(pickerSlot, cropId);
    setPickerSlot(null);
  };

  if (pickerSlot !== null) {
    return (
      <CropPickerModal
        title={`${pickerSlot + 1}번 칸에 올릴 작물 고르기`}
        description="특별한 작물만 진열할 수 있다"
        onBack={() => setPickerSlot(null)}
        onClose={onClose}
      >
        <div className="grid grid-cols-2 gap-2">
          {cropIds.map((cropId) => (
            <button
              key={cropId}
              onClick={() => putOnDisplay(cropId)}
              disabled={inventory[cropId].special <= 0}
              className="flex min-h-16 flex-col items-start justify-center gap-0.5 rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-40"
            >
              <span>
                {CROP_EMOJI[cropId]} ✨ {CROPS[cropId].specialName}
              </span>
              <span className="text-xs tabular-nums text-neutral-500">
                {inventory[cropId].special}개
              </span>
            </button>
          ))}
        </div>
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
        {display.map((cropId, index) => {
          if (!cropId) {
            return (
              <button
                key={index}
                onClick={() => setPickerSlot(index)}
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
              ✨ {CROPS[cropId].specialName}
              <br />
              <span className="font-normal text-amber-600">내리기</span>
            </button>
          );
        })}
      </div>
    </CropPickerModal>
  );
}
