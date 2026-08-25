# 저작권 · 라이선스

이 프로젝트가 사용하는 외부 리소스의 라이선스를 한곳에 모은 문서다.
**리소스를 추가할 때마다 여기에 먼저 기록한다.** 상용 배포 시점에 뒤늦게 확인하면 교체 비용이 크다.

## 요약

| 리소스 | 라이선스 | 상업적 사용 | 의무 |
| --- | --- | --- | --- |
| 마루부리 (네이버) | 자체 라이선스 | 가능 | 출처 표기 (권장) |
| Lucide 아이콘 | ISC | 가능 | 저작권 고지 유지 |
| Next.js / React / Tailwind CSS / supabase-js / ESLint | MIT | 가능 | 저작권 고지 유지 |
| TypeScript | Apache-2.0 | 가능 | 저작권 고지 유지 |

의무가 있는 항목은 모두 "저작권 문구를 지운 채 재배포하지 말 것"이라는 뜻이고, 소스 공개나 사용료 의무는 어디에도 없다.

## 폰트 — 마루부리

> 이 페이지에는 네이버에서 제공한 마루부리 글꼴이 적용되어 있습니다.

- 개인·기업 모두 무료로 사용·수정·재배포 가능. **글꼴 자체를 유료로 판매하는 것만 금지**된다
- 라이선스 전문을 포함하기 어려운 경우 출처 표기를 권장하므로 위 문구를 표기한다
- 폰트 파일을 저장소에 두지 않고 네이버 CDN(`hangeul.pstatic.net`)에서 직접 불러오므로, 폰트 파일 재배포에 해당하지 않는다

굵기 사용 규칙(500 없음 등)은 리소스 사용법이므로 [design.md](design.md)에 있다.

## 아이콘 — Lucide

`src/components/icons/`의 SVG는 [Lucide](https://lucide.dev)의 도형을 옮겨 쓴 것이다.
패키지를 설치하지 않고 필요한 아이콘만 컴포넌트로 직접 두는 방식이라, 고지 의무는 그대로 남는다.

```
Copyright (c) Lucide Contributors — ISC License
일부 아이콘은 Feather Icons에서 파생됨. Copyright (c) Cole Bemis — MIT License
```

- 현재 사용 중: `CoinIcon`(circle-dollar-sign), `TimerIcon`(timer)
- 아이콘이 늘어 패키지를 설치하게 되면 이 항목을 패키지 기준으로 고쳐 쓴다

## 이모지

밭·변이·요정 표시에 쓰는 이모지(🍅 🌱 ✨ 🍀)는 **사용자 기기의 시스템 폰트로 그려진다.** 배포물에 포함되지 않으므로 라이선스 문제가 없다.

주의: 애플·구글의 이모지 이미지를 캡처하거나 추출해 스프라이트로 만드는 것은 **허용되지 않는다.** 그래픽 작업 시 직접 그리거나 라이선스가 확인된 소스만 쓴다.

## 라이브러리

전부 MIT 계열이며 상업적 사용에 제약이 없다. 정확한 버전은 `package.json`을 기준으로 한다.

| 패키지 | 라이선스 |
| --- | --- |
| next | MIT |
| react / react-dom | MIT |
| tailwindcss | MIT |
| @supabase/supabase-js | MIT |
| typescript | Apache-2.0 |
| eslint / eslint-config-next | MIT |

## 게임 내 표기

크레딧 화면을 만들 때 최소한 다음 두 줄을 넣는다.

```
이 페이지에는 네이버에서 제공한 마루부리 글꼴이 적용되어 있습니다.
아이콘: Lucide (ISC License)
```
