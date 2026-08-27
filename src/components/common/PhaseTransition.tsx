'use client';

import { useEffect, useRef, useState } from 'react';

interface PhaseTransitionProps {
  /** 화면이 완전히 덮인 순간. 이때 다음 단계로 넘겨야 교체 장면이 보이지 않는다 */
  onHalfway: () => void;
  /** 덮개가 모두 걷힌 순간 */
  onFinish: () => void;
}

/**
 * 덮이는 시간과 걷히는 시간 (ms). 둘을 합쳐 전환 1초가 된다.
 * globals.css의 wipe-turn 애니메이션 길이와 반드시 같아야 한다.
 */
const HALF_MS = 1000;

/**
 * 단계가 넘어갈 때 화면을 덮는 연출.
 * 시계바늘처럼 한 바퀴 돌며 덮이고, 그동안 다음 단계로 넘긴 뒤 다시 한 바퀴 돌며 걷힌다.
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
      }, HALF_MS);

      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => latest.current.onFinish(), HALF_MS);

    return () => clearTimeout(timer);
  }, [stage]);

  return (
    /*
     * key로 단계마다 요소를 새로 만든다.
     * 두 클래스가 같은 animation-name을 써서, 같은 요소에 클래스만 바꾸면
     * 브라우저가 이미 끝난 애니메이션으로 보고 다시 돌리지 않는다.
     */
    <div
      key={stage}
      aria-hidden
      className={`fixed inset-0 z-20 bg-background ${
        stage === 'cover' ? 'clock-cover' : 'clock-reveal'
      }`}
    />
  );
}
