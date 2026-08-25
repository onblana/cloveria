interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = '클로버 마을로 가는 중...' }: LoadingScreenProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <span className="animate-pulse text-4xl">🍀</span>
      <p className="text-sm text-neutral-500">{message}</p>
    </main>
  );
}
