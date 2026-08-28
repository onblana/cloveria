'use client';

export interface Toast {
  id: number;
  message: string;
}

interface ToastStackProps {
  toasts: Toast[];
}

/**
 * 화면 위쪽에 잠깐 떠오르는 알림.
 * 빠르게 여러 번 뜨면 쌓이고, 가장 나중에 뜬 것이 맨 위에 놓인다.
 */
export function ToastStack({ toasts }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-40 flex flex-col items-center gap-1 px-2">
      {/* 배열 앞쪽이 최신이라 그대로 그리면 최신이 맨 위에 온다 */}
      {toasts.map((toast) => (
        <p
          key={toast.id}
          className="toast-item max-w-sm rounded-lg bg-neutral-900/85 px-4 py-2 text-center text-xs text-white"
        >
          {toast.message}
        </p>
      ))}
    </div>
  );
}
