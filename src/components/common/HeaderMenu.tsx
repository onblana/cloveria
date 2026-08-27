'use client';

import { useState } from 'react';

interface HeaderMenuProps {
  /** 확인까지 마쳤을 때 부른다. 기록을 지우는 일은 바깥이 맡는다 */
  onReset: () => void;
}

/**
 * 제목 오른쪽 끝의 ⋯ 메뉴.
 * 좁은 화면에서 상단 줄이 늘어나지 않도록, 자주 쓰지 않는 동작을 여기로 모은다.
 */
export function HeaderMenu({ onReset }: HeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  // 되돌릴 수 없는 동작이라 확인 창을 한 단계 둔다
  const [isConfirming, setIsConfirming] = useState(false);

  const askReset = () => {
    setIsOpen(false);
    setIsConfirming(true);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((open) => !open)}
        aria-label="메뉴 열기"
        aria-expanded={isOpen}
        className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-neutral-400"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
          <circle cx="4" cy="10" r="1.6" />
          <circle cx="10" cy="10" r="1.6" />
          <circle cx="16" cy="10" r="1.6" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* 바깥 아무 곳이나 눌러도 닫히도록 화면 전체를 덮는 닫기 영역을 깔아둔다 */}
          <button
            aria-label="메뉴 닫기"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
            <button
              onClick={askReset}
              className="flex min-h-12 w-full items-center px-4 text-left text-sm text-red-600"
            >
              처음부터 다시 하기
            </button>
          </div>
        </>
      )}

      {isConfirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <button
            aria-label="취소"
            onClick={() => setIsConfirming(false)}
            className="absolute inset-0 cursor-default"
          />

          <div className="relative w-full max-w-sm rounded-2xl bg-white p-4">
            <h2 className="text-sm font-semibold">처음부터 다시 시작할까요?</h2>
            <p className="mt-1 text-xs text-neutral-500">
              지금까지의 기록이 모두 사라지고 되돌릴 수 없습니다.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setIsConfirming(false)}
                className="min-h-12 flex-1 rounded-lg border border-neutral-300 text-sm text-neutral-600"
              >
                취소
              </button>
              <button
                onClick={onReset}
                className="min-h-12 flex-1 rounded-lg bg-red-600 text-sm font-semibold text-white"
              >
                다시 시작하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
