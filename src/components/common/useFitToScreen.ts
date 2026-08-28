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
       * getBoundingClientRect는 zoom이 반영된 높이라, 지금 배율로 나눠 원래 높이를 되돌린다.
       * 이렇게 해야 이미 줄어든 상태에서 다시 재도 같은 값이 나와 배율이 흔들리지 않는다.
       */
      const naturalHeight = element.getBoundingClientRect().height / zoom;
      if (naturalHeight <= 0) return;

      // 하한을 두지 않는다. 내용이 길수록 그만큼 계속 줄여 스크롤을 만들지 않는다
      const next = Math.min(1, window.innerHeight / naturalHeight);
      if (Math.abs(next - zoom) > EPSILON) setZoom(next);
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
  }, [element, zoom]);

  return { ref: setElement, zoom };
}
