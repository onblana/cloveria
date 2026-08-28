'use client';

export interface Toast {
  id: number;
  message: string;
  /**
   * normal은 시간이 지나면 저절로 사라진다.
   * milestone은 친밀도가 한 단계 오른 것처럼 놓치면 아까운 소식이라, 누를 때까지 남는다.
   */
  kind: 'normal' | 'milestone';
}

interface ToastStackProps {
  toasts: Toast[];
  /** milestone 알림을 눌러 닫을 때 */
  onDismiss: (id: number) => void;
}

/**
 * 화면 위쪽에 잠깐 떠오르는 알림.
 * 빠르게 여러 번 뜨면 쌓이고, 가장 나중에 뜬 것이 맨 위에 놓인다.
 */
export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-40 flex flex-col items-center gap-1 px-2">
      {/* 배열 앞쪽이 최신이라 그대로 그리면 최신이 맨 위에 온다 */}
      {toasts.map((toast) =>
        toast.kind === 'milestone' ? (
          // 감싼 상자가 터치를 흘려보내므로 이 알림만 다시 받도록 되돌린다
          <button
            key={toast.id}
            onClick={() => onDismiss(toast.id)}
            className="toast-item pointer-events-auto flex min-h-11 max-w-sm items-center whitespace-pre-line rounded-lg bg-amber-500/95 px-4 py-2 text-center text-xs text-white"
          >
            {toast.message}
          </button>
        ) : (
          <p
            key={toast.id}
            className="toast-item max-w-sm whitespace-pre-line rounded-lg bg-neutral-900/85 px-4 py-2 text-center text-xs text-white"
          >
            {toast.message}
          </p>
        ),
      )}
    </div>
  );
}
