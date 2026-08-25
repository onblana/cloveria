'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { LoadingScreen } from './LoadingScreen';

// 화면에서 실제로 쓰는 굵기만 기다린다. 선언만 되어 있는 나머지는 내려받지 않는다
const REQUIRED_FONTS = ['400 1rem MaruBuri', '600 1rem MaruBuri'];

// 폰트 서버가 느리거나 막혀도 게임이 열리지 않는 상태로 남지 않도록 상한을 둔다
const TIMEOUT_MS = 5000;

/** 마루부리를 다 내려받을 때까지 로딩 화면을 보여준다 (명조체라 폰트가 바뀌는 순간이 눈에 띈다) */
export function FontGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const finish = () => {
      if (!cancelled) setReady(true);
    };

    const timer = setTimeout(finish, TIMEOUT_MS);

    // load()는 해당 굵기의 다운로드를 실제로 시작시키고, 끝나면 완료된다
    // 폰트 API를 지원하지 않는 환경에서는 기다리지 않고 바로 넘어간다
    const loading = document.fonts
      ? Promise.all(REQUIRED_FONTS.map((font) => document.fonts.load(font)))
      : Promise.resolve([]);

    loading
      .catch(() => undefined)
      .finally(() => {
        clearTimeout(timer);
        finish();
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (!ready) return <LoadingScreen />;

  return <>{children}</>;
}
