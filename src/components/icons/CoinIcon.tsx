interface IconProps {
  /** 아이콘 한 변의 px 크기. 옆 텍스트 크기에 맞춰 넘긴다 */
  size?: number;
  className?: string;
}

/**
 * 골드 표시용 동전 아이콘.
 * 색은 currentColor를 따르므로 부모의 text-* 클래스로 바꾼다.
 * 옆에 항상 "n골드" 텍스트가 붙으므로 스크린리더에서는 숨긴다.
 */
export function CoinIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 18V6" />
    </svg>
  );
}
