interface IconProps {
  /** 아이콘 한 변의 px 크기. 옆 텍스트 크기에 맞춰 넘긴다 */
  size?: number;
  className?: string;
}

/**
 * 게임 내 틱(경과 시간) 표시용 타이머 아이콘.
 * 숫자만으로는 무슨 값인지 알 수 없어 aria-label로 의미를 준다.
 */
export function TimerIcon({ size = 16, className }: IconProps) {
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
      role="img"
      aria-label="경과 시간"
    >
      <path d="M10 2h4" />
      <path d="M12 14v-3l2-2" />
      <circle cx="12" cy="14" r="8" />
    </svg>
  );
}
