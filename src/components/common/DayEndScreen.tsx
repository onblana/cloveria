'use client';

import { useEffect, useState } from 'react';

import { CROPS, CROP_EMOJI, type CropId, type DailyRecord } from '@/lib/game/data';

interface DayEndScreenProps {
  day: number;
  record: DailyRecord;
  cropIds: CropId[];
  /** 밝아지기 시작할 때. 어두운 동안 다음 날로 넘겨야 아침 화면이 드러난다 */
  onWake: () => void;
  /** 연출이 모두 끝나 이 화면을 걷어도 될 때 */
  onFinish: () => void;
}

/** 흰 화면이 된 뒤 아침 문구를 띄워 두는 시간 */
const MORNING_MS = 1500;
const FADE_MS = 1000;

/**
 * 하루가 끝날 때 화면을 덮는 연출.
 * 밤처럼 어두워지며 오늘의 결과를 보여주고, 잠들기를 누르면 아침처럼 하얗게 밝아진다.
 * 문구를 보여주는 동안에도 화면을 덮고 있다가, 다 끝나면 걷혀서 게임 화면이 드러난다.
 */
export function DayEndScreen({ day, record, cropIds, onWake, onFinish }: DayEndScreenProps) {
  // night: 어두워지는 중, result: 결과를 보는 중, dawn: 하얘지는 중,
  // morning: 아침 문구, fadeOut: 덮개가 걷히는 중
  const [stage, setStage] = useState<'night' | 'result' | 'dawn' | 'morning' | 'fadeOut'>('night');
  // 첫 렌더는 투명한 상태여야 transition이 걸린다. 붙자마자 한 번 더 그려서 어둡게 만든다
  const [isMounted, setIsMounted] = useState(false);
  // 밝아지는 동안 날짜가 넘어가므로, 처음 받은 값을 붙잡아 두고 보여준다
  const [shown] = useState({ day, record });

  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsMounted(true));
    const timer = setTimeout(() => setStage('result'), FADE_MS);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, []);

  // 밝아짐 → 아침 문구 → 종료. 중간에 화면이 걷히면 남은 타이머를 정리한다
  useEffect(() => {
    if (stage === 'dawn') {
      const timer = setTimeout(() => setStage('morning'), FADE_MS);
      return () => clearTimeout(timer);
    }

    if (stage === 'morning') {
      const timer = setTimeout(() => setStage('fadeOut'), MORNING_MS);
      return () => clearTimeout(timer);
    }

    if (stage === 'fadeOut') {
      const timer = setTimeout(onFinish, FADE_MS);
      return () => clearTimeout(timer);
    }
  }, [stage, onFinish]);

  const sleep = () => {
    if (stage !== 'result') return;

    setStage('dawn');
    // 화면이 덮여 있는 동안 날짜를 넘겨 둔다. 연출이 끝나면 아침 화면이 바로 나온다
    onWake();
  };

  const harvested = cropIds
    .map((cropId) => ({ cropId, ...shown.record.harvest[cropId] }))
    .filter((item) => (item.normal ?? 0) + (item.special ?? 0) > 0);

  const isNightColor = stage === 'night' || stage === 'result';
  const isCovering = isMounted && stage !== 'fadeOut';

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-6">
      {/*
        덮개는 연출이 끝날 때까지 계속 화면을 가린다.
        어두워질 때만 서서히 나타나고, 그 뒤로는 검정에서 흰색으로 색만 바뀐다.
      */}
      <div
        className={`absolute inset-0 transition duration-1000 ${
          isNightColor ? 'bg-neutral-900' : 'bg-white'
        } ${isCovering ? 'opacity-100' : 'opacity-0'}`}
      />

      {stage === 'result' && (
        <div className="relative w-full max-w-sm space-y-5 text-neutral-100">
          <h2 className="text-center text-lg font-semibold">{shown.day}일차를 마쳤다</h2>

          <dl className="space-y-2 border-y border-neutral-700 py-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-neutral-300">장사로 번 돈</dt>
              <dd className="tabular-nums text-amber-300">+{shown.record.earned}골드</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-neutral-300">오늘 쓴 돈</dt>
              <dd className="tabular-nums text-neutral-200">−{shown.record.spent}골드</dd>
            </div>
          </dl>

          <div className="space-y-2 text-sm">
            <h3 className="text-neutral-300">수확한 작물</h3>
            {harvested.length === 0 ? (
              <p className="text-neutral-400">오늘은 거둔 것이 없다.</p>
            ) : (
              <ul className="space-y-1">
                {/* 둘 다 거뒀으면 한 행을 반씩 나눠 쓰고, 하나뿐이면 flex-1이 전체를 채운다 */}
                {harvested.map(({ cropId, normal = 0, special = 0 }) => (
                  <li key={cropId} className="flex items-center gap-6">
                    {normal > 0 && (
                      <span className="flex flex-1 items-center justify-between gap-2">
                        <span>
                          {CROP_EMOJI[cropId]} {CROPS[cropId].name}
                        </span>
                        <span className="tabular-nums text-neutral-200">{normal}개</span>
                      </span>
                    )}
                    {special > 0 && (
                      <span className="flex flex-1 items-center justify-between gap-2">
                        <span className="text-amber-300">
                          ✨{CROP_EMOJI[cropId]} {CROPS[cropId].specialName}
                        </span>
                        <span className="tabular-nums text-amber-300">{special}개</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            onClick={sleep}
            className="min-h-12 w-full rounded-lg bg-neutral-100 py-3 text-sm font-semibold text-neutral-900"
          >
            잠들기
          </button>
        </div>
      )}

      {(stage === 'morning' || stage === 'fadeOut') && (
        // 흰 덮개 위에 올라가는 문구. 덮개가 걷힐 때 같이 사라진다
        <p
          className={`relative text-lg font-semibold text-neutral-900 transition duration-1500 ${
            stage === 'morning' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {shown.day + 1}일차의 아침이 밝았다
        </p>
      )}
    </div>
  );
}
