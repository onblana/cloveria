'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 덮개가 나타나고 사라지는 시간 (ms).
 * 아래 duration-* 클래스와 반드시 같은 값으로 맞춰야 한다.
 * 어긋나면 다 하얘진 뒤 남은 시간만큼 빈 화면이 멈춰 있는 것처럼 보인다.
 */
const FADE_MS = 1000;

/** 문구를 띄워 두는 시간 */
const MESSAGE_MS = 1500;

/**
 * 문구가 스며들고 사라지는 시간 (ms).
 * 아래 문구의 duration-* 클래스와 반드시 같은 값으로 맞춰야 한다.
 * 짧으면 문구가 남아 있는 채로 시계 전환이 시작해 겹쳐 보인다.
 */
const MESSAGE_FADE_MS = 1500;

interface RestScreenProps {
  message: string;
  /** 문구를 다 보여준 순간. 덮개는 그대로 두고 다음 연출에 넘긴다 */
  onFinish: () => void;
}

/**
 * 장사를 건너뛸 때 하얗게 덮으며 한마디를 보여주는 화면.
 * 하루를 마무리하는 연출과 같은 색·속도를 써서 같은 세계의 일처럼 보이게 한다.
 * 걷히는 일은 하지 않는다. 문구가 다 사라지면 덮은 채로 시계 전환에 자리를 넘긴다.
 */
export function RestScreen({ message, onFinish }: RestScreenProps) {
  // covering: 덮개가 스며드는 중, message: 문구를 띄운 채, fadingOut: 문구가 사라지는 중
  const [stage, setStage] = useState<'covering' | 'message' | 'fadingOut'>('covering');
  // 첫 렌더는 투명한 상태여야 transition이 걸린다. 붙자마자 한 번 더 그려서 덮는다
  const [isMounted, setIsMounted] = useState(false);
  // 바깥 상태가 바뀌어도 타이머가 다시 걸리지 않도록 최신 함수만 따로 들고 있는다
  const latest = useRef({ onFinish });

  useEffect(() => {
    latest.current = { onFinish };
  });

  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsMounted(true));

    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (stage === 'covering') {
      const timer = setTimeout(() => setStage('message'), FADE_MS);

      return () => clearTimeout(timer);
    }

    if (stage === 'message') {
      const timer = setTimeout(() => setStage('fadingOut'), MESSAGE_MS);

      return () => clearTimeout(timer);
    }

    // 문구가 다 사라진 뒤에야 다음 연출로 넘긴다
    const timer = setTimeout(() => latest.current.onFinish(), MESSAGE_FADE_MS);

    return () => clearTimeout(timer);
  }, [stage]);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-6">
      <div
        className={`absolute inset-0 bg-white transition duration-1000 ${
          isMounted ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* 흰 덮개 위에 올라가는 문구 */}
      <p
        className={`relative text-center text-lg font-semibold text-neutral-900 transition duration-1500 ${
          stage === 'message' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {message}
      </p>
    </div>
  );
}
