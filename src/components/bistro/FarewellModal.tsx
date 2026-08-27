'use client';

interface FarewellModalProps {
  customerName: string;
  /** 요리를 받지 못하고 돌아가는 손님이 남기는 한마디 */
  comment: string;
  /** 인사를 확인해 이 창을 닫을 때. 그 뒤에 장사가 마감된다 */
  onClose: () => void;
}

/**
 * 재료가 모자라 손님을 그냥 보내며 장사를 마감할 때 뜨는 창.
 * 바깥을 눌러도 닫히지 않고, 버튼으로만 넘어간다.
 */
export function FarewellModal({ customerName, comment, onClose }: FarewellModalProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-2 backdrop-blur-xs">
      <div className="w-full rounded-2xl bg-white p-6">
        <p className="text-center text-sm text-neutral-500 my-4">{customerName}</p>
        <p className="mt-3 rounded-lg bg-amber-50 px-4 py-3 mb-20 text-sm text-amber-900">
          “{comment}”
        </p>
        <button
          onClick={onClose}
          className="mt-4 min-h-12 w-full rounded-lg bg-neutral-800 py-3 text-sm font-semibold text-white"
        >
          다음에 또 와주세요
        </button>
      </div>
    </div>
  );
}
