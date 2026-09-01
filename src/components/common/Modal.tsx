'use client';

import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  /** 제목 아래 한 줄 안내. 없으면 표시하지 않는다 */
  description?: string;
  /** 이전 단계로 돌아가는 창일 때만 넘긴다. 없으면 뒤로가기 버튼을 감춘다 */
  onBack?: () => void;
  onClose: () => void;
  /** 창 안에 담을 내용. 화면마다 달라 바깥에서 넘긴다 */
  children: ReactNode;
}

/**
 * 화면을 덮는 창의 껍데기.
 * 제목·닫기 버튼과 배경만 맡고, 안에 담기는 내용은 쓰는 쪽에서 정한다.
 */
export function Modal({
  title,
  description,
  onBack,
  onClose,
  children,
}: ModalProps) {
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      {/* 바깥을 눌러도 닫히도록 오버레이 자체를 버튼으로 둔다 */}
      <button
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <div className="relative w-full max-w-sm rounded-2xl bg-white p-4">
        <div className="flex items-center gap-1">
          {onBack && (
            <button
              aria-label="뒤로가기"
              onClick={onBack}
              className="-ml-2 h-11 w-11 shrink-0 text-lg text-neutral-500"
            >
              ←
            </button>
          )}
          <div>
            <h2 className="text-lg font-semibold mb-4">{title}</h2>
            {description && <p className="mb-2 text-xs text-neutral-800">{description}</p>}
          </div>
        </div>

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
