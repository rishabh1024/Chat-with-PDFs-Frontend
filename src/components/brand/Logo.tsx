import React from 'react';

const BRAND_RED = '#E55545';

interface LogoProps {
  /** Icon height in pixels. Default 40. */
  size?: number;
  className?: string;
}

const LogoIcon: React.FC<{ size: number; className?: string }> = ({ size, className = '' }) => (
  <svg
    width={size}
    height={Math.round(size * (56 / 48))}
    viewBox="0 0 48 56"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={className}
  >
    <path
      d="M6 6C6 3.79086 7.79086 2 10 2H30L42 14V42C42 44.2091 40.2091 46 38 46H16L6 54V6Z"
      fill={BRAND_RED}
    />
    <path d="M30 2L42 14H34C31.7909 14 30 12.2091 30 10V2Z" fill="#C94436" />
    <path
      d="M17 11L18.6 16.4L24 18L18.6 19.6L17 25L15.4 19.6L10 18L15.4 16.4L17 11Z"
      fill="white"
    />
    <text
      x="24"
      y="38"
      textAnchor="middle"
      fill="white"
      fontSize="12"
      fontWeight="700"
      fontFamily="Geist, ui-sans-serif, system-ui, sans-serif"
      letterSpacing="0.6"
    >
      PDF
    </text>
  </svg>
);

/** Brand logo — transparent SVG icon + Geist wordmark. */
const Logo: React.FC<LogoProps> = ({ size = 40, className = '' }) => {
  return (
    <div
      className={`inline-flex items-center gap-2.5 ${className}`}
      role="img"
      aria-label="Chat with PDFs"
    >
      <LogoIcon size={size} />
      <span className="flex flex-col leading-[1.05] select-none">
        <span className="text-[0.95em] font-semibold text-gray-900 tracking-tight">
          Chat with
        </span>
        <span
          className="text-[1.25em] font-bold tracking-tight"
          style={{ color: BRAND_RED }}
        >
          PDFs
        </span>
      </span>
    </div>
  );
};

export { LogoIcon };
export default Logo;
