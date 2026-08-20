/**
 * The wallet's icon set — clean 24×24 line icons drawn with `react-native-svg`,
 * lifted directly from the redesign artboards. One source of truth so every
 * screen shares the same stroke weight and geometry, and so the app never falls
 * back to emoji glyphs (which don't respect the theme or the brand).
 *
 * Every icon takes `{ size, color }` and defaults to `currentColor`-style usage:
 * pass the theme colour the surrounding text/tile uses.
 */

import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

export type IconProps = {
  /** Square edge length in px. */
  size?: number;
  /** Stroke colour. */
  color?: string;
  /** Stroke width in the 24×24 viewBox. */
  strokeWidth?: number;
};

const DEFAULT_SIZE = 22;
const DEFAULT_STROKE = 1.75;

function Base({
  size = DEFAULT_SIZE,
  children,
}: {
  size?: number;
  children: React.ReactNode;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );
}

// ── Primary actions ──────────────────────────────────────────────────────────

export function SendIcon({ size, color = 'currentColor', strokeWidth = 1.9 }: IconProps) {
  return (
    <Base size={size}>
      <Path d="M5 12h14M12 5l7 7-7 7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Base>
  );
}

export function ReceiveIcon({ size, color = 'currentColor', strokeWidth = 1.9 }: IconProps) {
  return (
    <Base size={size}>
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Base>
  );
}

export function SwapIcon({ size, color = 'currentColor', strokeWidth = 1.9 }: IconProps) {
  return (
    <Base size={size}>
      <Path d="M7 10l5-5 5 5M17 14l-5 5-5-5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Base>
  );
}

export function BuyIcon({ size, color = 'currentColor', strokeWidth = DEFAULT_STROKE }: IconProps) {
  return (
    <Base size={size}>
      <Rect x="2" y="5" width="20" height="14" rx="2.5" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M2 10h20" stroke={color} strokeWidth={strokeWidth} />
    </Base>
  );
}

// ── Secondary features ───────────────────────────────────────────────────────

export function AgentIcon({ size, color = 'currentColor', strokeWidth = DEFAULT_STROKE }: IconProps) {
  return (
    <Base size={size}>
      <Path d="M12 2a4 4 0 014 4v1a4 4 0 01-8 0V6a4 4 0 014-4zm0 10c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </Base>
  );
}

export function VaultIcon({ size, color = 'currentColor', strokeWidth = DEFAULT_STROKE }: IconProps) {
  return (
    <Base size={size}>
      <Path d="M7 10V7a5 5 0 0110 0v3M5 10h14v10H5V10z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </Base>
  );
}

export function WithdrawIcon({ size, color = 'currentColor', strokeWidth = DEFAULT_STROKE }: IconProps) {
  return (
    <Base size={size}>
      <Path d="M12 21V9m0 12l-4-4m4 4l4-4M3 7V5a2 2 0 012-2h14a2 2 0 012 2v2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Base>
  );
}

export function ConnectIcon({ size, color = 'currentColor', strokeWidth = DEFAULT_STROKE }: IconProps) {
  return (
    <Base size={size}>
      <Path d="M8.5 8.5l7 7M13 5l6 6-4 4-6-6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Base>
  );
}

export function PoolsIcon({ size, color = 'currentColor', strokeWidth = DEFAULT_STROKE }: IconProps) {
  return (
    <Base size={size}>
      <Path d="M4 7h16M4 12h16M4 17h16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Base>
  );
}

// ── Tab bar ──────────────────────────────────────────────────────────────────

export function HomeIcon({ size, color = 'currentColor', strokeWidth = DEFAULT_STROKE }: IconProps) {
  return (
    <Base size={size}>
      <Path d="M3 10l9-7 9 7v9a2 2 0 01-2 2h-5v-6H10v6H5a2 2 0 01-2-2z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </Base>
  );
}

export function AssetsIcon({ size, color = 'currentColor', strokeWidth = DEFAULT_STROKE }: IconProps) {
  return (
    <Base size={size}>
      <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M12 8v8M8 12h8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Base>
  );
}

export function SettingsIcon({ size, color = 'currentColor', strokeWidth = 1.4 }: IconProps) {
  return (
    <Base size={size}>
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth + 0.35} />
      <Path
        d="M19 12a7 7 0 00-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 00-1.7-1l-.3-2.5H10l-.3 2.5a7 7 0 00-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 000 2l-2 1.5 2 3.4 2.3-1a7 7 0 001.7 1l.3 2.5h4l.3-2.5a7 7 0 001.7-1l2.3 1 2-3.4-2-1.5a7 7 0 00.1-1z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Base>
  );
}

// ── Utility ──────────────────────────────────────────────────────────────────

export function CopyIcon({ size = 14, color = 'currentColor', strokeWidth = DEFAULT_STROKE }: IconProps) {
  return (
    <Base size={size}>
      <Rect x="9" y="9" width="12" height="12" rx="2" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke={color} strokeWidth={strokeWidth} />
    </Base>
  );
}

export function GearIcon({ size = 18, color = 'currentColor', strokeWidth = 1.5 }: IconProps) {
  return (
    <Base size={size}>
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth + 0.25} />
      <Path
        d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.8 1.1V21a2 2 0 11-4 0v-.1A1.6 1.6 0 009 19.4a1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00-1.1-2.8H3a2 2 0 110-4h.1A1.6 1.6 0 004.6 9a1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Base>
  );
}

export function EyeIcon({ size = 18, color = 'currentColor', strokeWidth = 1.5 }: IconProps) {
  return (
    <Base size={size}>
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
    </Base>
  );
}

export function EyeOffIcon({ size = 18, color = 'currentColor', strokeWidth = 1.5 }: IconProps) {
  return (
    <Base size={size}>
      <Path d="M9.6 4.5A9.9 9.9 0 0112 4.3c6.5 0 10 7 10 7a18 18 0 01-2.4 3.3M5.2 5.8A17.8 17.8 0 002 11.3s3.5 7 10 7a9.9 9.9 0 004-.8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9.9 9.9a3 3 0 004.2 4.2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="3" y1="3" x2="21" y2="21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Base>
  );
}

export function ChevronDownIcon({ size = 12, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <Base size={size}>
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Base>
  );
}

/** Up-trend / received. */
export function ArrowUpIcon({ size = 12, color = 'currentColor', strokeWidth = 2.2 }: IconProps) {
  return (
    <Base size={size}>
      <Path d="M12 19V5M5 12l7-7 7 7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Base>
  );
}

/** Down-trend / sent. */
export function ArrowDownIcon({ size = 12, color = 'currentColor', strokeWidth = 2 }: IconProps) {
  return (
    <Base size={size}>
      <Path d="M12 5v14M19 12l-7 7-7-7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Base>
  );
}
