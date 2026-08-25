'use client';

import type { ReactNode } from 'react';

interface CropPickerModalProps {
  title: string;
  /** 제목 아래 한 줄 안내. 없으면 표시하지 않는다 */
  description?: string;
  onClose: () => void;
  /** 고를 항목 목록. 화면마다 조건이 달라 목록 자체는 바깥에서 넘긴다 */
  children: ReactNode;
}

/**
 * 작물을 고르는 창의 껍데기.
 * 씨앗 구매와 진열이 같은 모양을 쓰되 안에 담기는 항목만 달라진다.
 */
export function CropPickerModal({ title, description, onClose, children }: CropPickerModalProps) {
  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      {/* 바깥을 눌러도 닫히도록 오버레이 자체를 버튼으로 둔다 */}
      <button
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <div className="relative w-full max-w-sm rounded-2xl bg-white p-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-1 text-xs text-neutral-500">{description}</p>}

        <div className="mt-3 space-y-2">{children}</div>

        <button
          onClick={onClose}
          className="mt-3 min-h-12 w-full rounded-lg border border-neutral-300 text-sm text-neutral-600"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
