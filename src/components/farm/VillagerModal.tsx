'use client';

import {
  CUSTOMERS,
  CUSTOMER_IDS,
  FRIENDSHIP_MAX,
  getFriendshipLabel,
  type Friendship,
} from '@/lib/game/data';

interface VillagerModalProps {
  friendship: Friendship;
  onClose: () => void;
}

/**
 * 마을 사람들과의 친밀도를 한눈에 보는 창.
 * 사람이 늘어도 창 높이는 그대로 두고 목록 칸만 스크롤한다.
 */
export function VillagerModal({ friendship, onClose }: VillagerModalProps) {
  // TODO: 작물을 해금하면 마을 사람도 한 명씩 늘어난다.
  //       그때는 CUSTOMER_IDS 전체가 아니라 만난 사람만 추려서 넘길 것
  const villagerIds = CUSTOMER_IDS;

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      {/* 바깥을 눌러도 닫히도록 오버레이 자체를 버튼으로 둔다 */}
      <button
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <div className="modal-tall-80 relative flex w-full max-w-sm flex-col rounded-2xl bg-white p-4">
        <h2 className="text-lg font-semibold">손님 목록</h2>
        <p className="mt-1 mb-4 text-xs text-neutral-800">
          요리를 낼수록 친해지고 그냥 돌려보내면 멀어진다
        </p>

        {/* 남는 높이를 이 칸이 모두 가져가 목록만 스크롤된다 */}
        <ul className="always-scroll -mr-1 min-h-0 flex-1 space-y-2 pr-1">
          {villagerIds.map((customerId) => {
            const customer = CUSTOMERS[customerId];
            const value = friendship[customerId];

            return (
              <li key={customerId} className="rounded-lg border border-neutral-200 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">{customer.name}</span>
                  {/*<span className="shrink-0 text-xs tabular-nums text-neutral-500">*/}
                  {/*  {getFriendshipLabel(value)}*/}
                  {/*</span>*/}
                  <span className="shrink-0 text-xs tabular-nums text-neutral-500">
                    {getFriendshipLabel(value)} · {value.toLocaleString()} /{' '}
                    {FRIENDSHIP_MAX.toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-green-600"
                    style={{ width: `${(value / FRIENDSHIP_MAX) * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        <button
          onClick={onClose}
          className="mt-3 min-h-12 w-full shrink-0 rounded-lg border border-neutral-300 text-sm text-neutral-600"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
