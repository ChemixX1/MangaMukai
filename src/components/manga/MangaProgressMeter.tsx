import { useId } from 'react';

type MangaProgressMeterProps = {
  percent: number;
  className?: string;
  label?: string;
  loading?: boolean;
};

export const MangaProgressMeter = ({ percent, className, label, loading = false }: MangaProgressMeterProps) => {
  const svgId = useId();
  const shadowId = `${svgId}-meter-shadow`;
  const outlineId = `${svgId}-meter-outline`;
  const fillId = `${svgId}-meter-fill`;
  const progress = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
  const fillWidth = 252 * progress / 100;
  const tipWidth = Math.min(9, fillWidth / 2);
  const fillEnd = 10 + fillWidth;

  return (
    <svg
      className={className}
      width="272"
      height="36"
      viewBox="0 0 272 36"
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={label ? 'progressbar' : undefined}
      aria-label={label}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-valuenow={label && !loading ? progress : undefined}
      aria-busy={label && loading ? true : undefined}
      aria-hidden={label ? undefined : true}
      data-loading={loading || undefined}
    >
      <g filter={`url(#${shadowId})`}>
        <path d="M268 16L253.556 30H18.4438L4 16L18.4438 2H253.556L268 16Z" fill="#F4F4F4" />
        <path d="M253.151 3L266.562 16L253.151 29H18.8486L5.43652 16L18.8486 3H253.151Z" stroke={`url(#${outlineId})`} strokeWidth="2" />
      </g>
      {progress > 0 && (
        <path
          d={`M${10 + tipWidth} 7H${fillEnd - tipWidth}L${fillEnd} 16L${fillEnd - tipWidth} 25H${10 + tipWidth}L10 16Z`}
          fill={`url(#${fillId})`}
          opacity={loading ? 0.45 : 1}
        />
      )}
      <defs>
        <filter id={shadowId} x="0" y="0" width="272" height="36" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="2" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_0_1" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_0_1" result="shape" />
        </filter>
        <linearGradient id={outlineId} x1="95.8784" y1="19.5" x2="163.284" y2="19.224" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF008C" />
          <stop offset="1" stopColor="#A806D9" />
        </linearGradient>
        <linearGradient id={fillId} x1="86" y1="7" x2="86" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF008C" />
          <stop offset="1" stopColor="#B000AD" stopOpacity="0.81" />
        </linearGradient>
      </defs>
    </svg>
  );
};
