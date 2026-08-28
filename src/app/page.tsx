'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { LoadingScreen } from '@/components/LoadingScreen';
import { createNewSave, loadGame, saveGame } from '@/lib/game/storage';

/** 이름을 묻기 전에 보여주는 도입부. 한 줄씩 차례로 나타난다 */
const STORY_LINES = [
  '클로버 마을에는 오래된 전설이 있다.',
  '이 마을에서 농사를 지으면 클로버의 행운으로 희귀한 작물을 얻을 수 있다는 것.',
  '오직 클로버 요정에게 선택 받은 자만이\n그 행운을 얻을 자격이 있다고 한다.',
  '하지만 이제는 아무도 믿지 않는 옛날 이야기다.',
  '당신은 할머니가 남겨 주신 텃밭이 딸린 작은 식당을 운영하기 위해 도시에서 시골로 내려왔다.',
];

/** 문단이 하나씩 나타나는 간격 (ms) */
const STORY_STEP_MS = 2000;

/** 이야기 문단들과 그 뒤에 오는 이름 입력까지 합한 수 */
const TOTAL_BLOCKS = STORY_LINES.length + 1;

export default function Home() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [nameInput, setNameInput] = useState('');
  // 지금까지 보여준 덩어리 수. 첫 문단은 들어오자마자 보인다
  const [shownBlocks, setShownBlocks] = useState(1);

  const isStoryDone = shownBlocks >= TOTAL_BLOCKS;

  const showNextBlock = () => setShownBlocks((count) => Math.min(count + 1, TOTAL_BLOCKS));

  /*
   * 시간이 되면 다음 덩어리를 보여준다.
   * shownBlocks가 의존성이라, 터치로 미리 넘기면 타이머도 그 시점부터 다시 센다.
   */
  useEffect(() => {
    if (isChecking || isStoryDone) return;

    const timer = setTimeout(showNextBlock, STORY_STEP_MS);

    return () => clearTimeout(timer);
  }, [isChecking, isStoryDone, shownBlocks]);

  // 이어서 할 기록이 있으면 도입부를 건너뛰고 곧바로 게임 화면으로 보낸다
  useEffect(() => {
    loadGame()
      .then((saved) => {
        if (saved) {
          router.replace('/play');
          return;
        }

        setIsChecking(false);
      })
      .catch(() => setIsChecking(false));
  }, [router]);

  // play에서 쓸 수 있게 새 게임 기록을 만들어 넘김
  const startGame = () => {
    const name = nameInput.trim();
    if (!name) return;

    saveGame(createNewSave(name))
      .then(() => router.replace('/play'))
      .catch(() => undefined);
  };

  if (isChecking) {
    return <LoadingScreen message="기록을 불러오는 중..." />;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-8">
      {/* 이야기가 도는 동안에만 화면을 덮어, 아무 데나 눌러도 다음 문단으로 넘어가게 한다 */}
      {!isStoryDone && (
        <button
          aria-label="다음 문단 보기"
          onClick={showNextBlock}
          className="fixed inset-0 z-10 cursor-default"
        />
      )}

      <div className="space-y-3 text-sm leading-relaxed text-neutral-600">
        {STORY_LINES.slice(0, shownBlocks).map((line) => (
          <p key={line} className="story-line whitespace-pre-line">
            {line}
          </p>
        ))}
      </div>

      {isStoryDone && (
        <div className="story-line space-y-3">
          <label htmlFor="player-name" className="block text-lg font-semibold">
            당신의 이름은 무엇인가요?
          </label>
          <input
            id="player-name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startGame()}
            placeholder="이름을 입력하세요"
            className="w-full rounded-lg border border-neutral-300 px-4 py-2 outline-none focus:border-green-500"
          />
          <button
            onClick={startGame}
            disabled={!nameInput.trim()}
            className="min-h-12 w-full rounded-lg bg-green-600 py-2 font-semibold text-white disabled:bg-neutral-300"
          >
            시작하기
          </button>
        </div>
      )}
    </main>
  );
}
