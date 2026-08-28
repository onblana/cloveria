'use client';

import { useEffect, useState } from 'react';

/** 이 정도 차이는 무시한다. 값이 미세하게 흔들리며 다시 그리는 것을 막는다 */
const EPSILON = 0.005;

/**
 * 내용이 화면보다 길면 그만큼 화면 전체를 줄여 세로 스크롤을 없앤다.
 *
 * transform: scale()이 아니라 zoom을 쓰는 이유는 fixed 때문이다.
 * transform이 걸린 요소는 자손 position: fixed의 기준점이 되어,
 * 화면 전체를 덮어야 할 모달과 전환 덮개가 그 안에 갇힌다. zoom은 그러지 않는다.
 */
export function useFitToScreen<T extends HTMLElement>() {
  /*
   * useRef가 아니라 콜백 ref로 요소를 state에 담는다.
   * 잴 대상이 로딩 화면 뒤에 붙는 탓에, ref였다면 마운트 시점에 아직 null이라
   * 이펙트가 그냥 빠져나가고 다시 돌 일이 없어 아무것도 재지 못한다.
   */
  const [element, setElement] = useState<T | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!element) return;

    const fit = () => {
      /*
       * getBoundingClientRect는 배율이 반영된 높이다. 원래 높이를 되돌리려면 나눠야 하는데,
       * 나누는 값은 state가 아니라 DOM에 실제로 적용된 배율을 읽는다.
       * state를 쓰면 아직 반영 전인 낡은 값으로 나눠 한 번 잘못 계산하고 다시 그리게 된다.
       */
      const applied = parseFloat(getComputedStyle(element).zoom) || 1;
      const naturalHeight = element.getBoundingClientRect().height / applied;
      if (naturalHeight <= 0) return;

      // 하한을 두지 않는다. 내용이 길수록 그만큼 계속 줄여 스크롤을 만들지 않는다
      const next = Math.min(1, window.innerHeight / naturalHeight);

      // 차이가 미미하면 같은 값을 돌려줘 다시 그리지 않게 한다
      setZoom((prev) => (Math.abs(next - prev) > EPSILON ? next : prev));
    };

    fit();

    // 내용이 늘거나 줄 때(밭 확장, 로그 줄 수 변화)와 화면 회전에 모두 반응한다
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    window.addEventListener('resize', fit);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fit);
    };
    // 배율이 바뀌어도 다시 구독하지 않는다. 재는 값을 DOM에서 읽으므로 그럴 이유가 없다
  }, [element]);

  return { ref: setElement, zoom };
}
