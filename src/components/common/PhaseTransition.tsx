'use client';

import { useEffect, useRef, useState } from 'react';

interface PhaseTransitionProps {
  /** 화면이 완전히 덮인 순간. 이때 다음 단계로 넘겨야 교체 장면이 보이지 않는다 */
  onHalfway: () => void;
  /** 덮개가 모두 걷힌 순간 */
  onFinish: () => void;
}

/**
 * 화면을 가리는 시간과 시계바늘이 한 바퀴 도는 시간 (ms)
 * globals.css의 wipe-fade-in, wipe-turn 애니메이션 길이와 반드시 같아야 한다.
 */
const COVER_MS = 100;
const REVEAL_MS = 500;

/**
 * 단계가 넘어갈 때 화면을 덮는 연출.
 * 덮개가 짧게 스며들어 화면을 가리고, 그 사이에 다음 단계로 넘긴 뒤, 시계바늘처럼 한 바퀴 돌며 걷힌다.
 * 화면 전체를 덮고 있어 전환이 끝날 때까지 아무것도 눌리지 않는다.
 */
export function PhaseTransition({ onHalfway, onFinish }: PhaseTransitionProps) {
  const [stage, setStage] = useState<'cover' | 'reveal'>('cover');
  // 바깥 상태가 바뀌어도 타이머가 다시 걸리지 않도록 최신 함수만 따로 들고 있는다
  const latest = useRef({ onHalfway, onFinish });

  useEffect(() => {
    latest.current = { onHalfway, onFinish };
  });

  useEffect(() => {
    if (stage === 'cover') {
      const timer = setTimeout(() => {
        latest.current.onHalfway();
        setStage('reveal');
      }, COVER_MS);

      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => latest.current.onFinish(), REVEAL_MS);

    return () => clearTimeout(timer);
  }, [stage]);

  return (
    /* key로 단계마다 요소를 새로 만들어 애니메이션이 처음부터 돌게 한다 */
    <div
      key={stage}
      aria-hidden
      className={`fixed inset-0 z-20 bg-background ${
        stage === 'cover' ? 'clock-cover' : 'clock-reveal'
      }`}
    />
  );
}
