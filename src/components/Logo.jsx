// رمز «وِرْد»: مصحف مفتوح يعلوه نور.
export function WirdMark({ size = 28, color = "currentColor", light = "#e3b341", strokeWidth = 4.5, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="32" cy="9" r="5" fill={light} />
      <path
        d="M8 22 C 19 16, 27 17, 32 23 C 37 17, 45 16, 56 22 L 56 47 C 45 41, 37 42, 32 48 C 27 42, 19 41, 8 47 Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path d="M32 23 L32 48" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export const APP_NAME = "وِرْد";
export const APP_TAGLINE = "وِردك اليومي مع القرآن";
