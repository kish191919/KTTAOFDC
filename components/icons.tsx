import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const MenuIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </Icon>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </Icon>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m15 18-6-6 6-6" />
  </Icon>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 18 6-6-6-6" />
  </Icon>
);

export const ChevronUpIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m18 15-6-6-6 6" />
  </Icon>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const CalendarIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </Icon>
);

export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </Icon>
);

export const MapPinIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Icon>
);

export const MailIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-10 6L2 7" />
  </Icon>
);

export const LockIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect width="18" height="11" x="3" y="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Icon>
);

export const ExternalLinkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </Icon>
);

export const CopyIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Icon>
);

export const DownloadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 10 5 5 5-5" />
    <path d="M12 15V3" />
  </Icon>
);

export const PlayIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 5v14l11-7z" fill="currentColor" />
  </Icon>
);

export const UploadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m17 8-5-5-5 5" />
    <path d="M12 3v12" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14M12 5v14" />
  </Icon>
);

export const PencilIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </Icon>
);

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </Icon>
);

export const ImageIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" />
  </Icon>
);

export const FilmIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M7 3v18M17 3v18M3 12h18M3 7.5h4M3 16.5h4M17 7.5h4M17 16.5h4" />
  </Icon>
);

export const EyeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

export const EyeOffIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10.73 5.08a10.74 10.74 0 0 1 11.21 6.57 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-1.45 2.49" />
    <path d="M14.08 14.16a3 3 0 0 1-4.24-4.24" />
    <path d="M17.48 17.5a10.75 10.75 0 0 1-15.42-5.15 1 1 0 0 1 0-.7 10.75 10.75 0 0 1 4.45-5.14" />
    <path d="m2 2 20 20" />
  </Icon>
);

export const VolumeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M11 5 6 9H2v6h4l5 4z" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </Icon>
);

export const VolumeOffIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M11 5 6 9H2v6h4l5 4z" />
    <path d="m22 9-6 6M16 9l6 6" />
  </Icon>
);

export const FileIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M10 9H8M16 13H8M16 17H8" />
  </Icon>
);

export const NewspaperIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2" />
    <rect x="10" y="6" width="8" height="4" rx="1" />
    <path d="M18 14h-8M15 18h-5" />
  </Icon>
);

export const GlobeIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </Icon>
);

export const UsersIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
);

export const DollarIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
    <path d="M12 18V6" />
  </Icon>
);

export const FlagIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <path d="M4 22v-7" />
  </Icon>
);

export const PhoneIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </Icon>
);

export const InfoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
);

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </Icon>
);

export const LogOutIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </Icon>
);

/** 배너 가운데의 '교차한 탁구 라켓' 장식을 본뜬 마크 */
export function PaddleMark({
  light = false,
  ...props
}: IconProps & { light?: boolean }) {
  const blue = light ? "#ffffff" : "var(--color-brand-700)";
  const handle = light ? "rgba(255,255,255,0.75)" : "var(--color-brand-900)";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width="1em"
      height="1em"
      aria-hidden="true"
      {...props}
    >
      <g transform="rotate(40 32 34)">
        <rect x="29" y="36" width="6" height="22" rx="3" fill={handle} />
        <circle cx="32" cy="24" r="15" fill={blue} />
      </g>
      <g transform="rotate(-40 32 34)">
        <rect x="29" y="36" width="6" height="22" rx="3" fill={handle} />
        <circle cx="32" cy="24" r="15" fill="var(--color-accent-500)" />
      </g>
      <circle
        cx="32"
        cy="52"
        r="4.5"
        fill="#ffffff"
        stroke={light ? "rgba(255,255,255,0.4)" : "var(--color-brand-200)"}
        strokeWidth="1.5"
      />
    </svg>
  );
}

// 언어 전환 버튼에 쓰는 국기 마크. 동그랗게 잘라 내는 것은 감싸는 쪽(overflow-hidden rounded-full)이 맡습니다.

/** 태극기의 괘 하나. pattern 은 바깥쪽 줄부터 "이어진 줄(1) / 끊어진 줄(0)" 입니다. */
function Trigram({
  x,
  y,
  rotate,
  pattern,
}: {
  x: number;
  y: number;
  rotate: number;
  pattern: readonly [number, number, number];
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`} fill="var(--color-navy-950)">
      {pattern.map((solid, index) => {
        const top = -3.55 + index * 2.8;
        return solid ? (
          <rect key={index} x="-4" y={top} width="8" height="1.5" />
        ) : (
          <g key={index}>
            <rect x="-4" y={top} width="3.4" height="1.5" />
            <rect x="0.6" y={top} width="3.4" height="1.5" />
          </g>
        );
      })}
    </g>
  );
}

/** 동그란 태극기 — 영어 화면에서 '한국어로 보기' 버튼에 씁니다. */
export function KoreaFlagMark(props: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width="1em"
      height="1em"
      aria-hidden="true"
      {...props}
    >
      <rect width="48" height="48" fill="#ffffff" />
      <g transform="rotate(33.69 24 24)">
        <circle cx="24" cy="24" r="9" fill="var(--color-brand-700)" />
        <path
          d="M15 24a9 9 0 0 1 18 0 4.5 4.5 0 0 0-9 0 4.5 4.5 0 0 1-9 0z"
          fill="var(--color-accent-500)"
        />
      </g>
      {/* 건(왼쪽 위) · 감(오른쪽 위) · 이(왼쪽 아래) · 곤(오른쪽 아래) */}
      <Trigram x={10.3} y={14.9} rotate={-56.31} pattern={[1, 1, 1]} />
      <Trigram x={37.7} y={14.9} rotate={56.31} pattern={[0, 1, 0]} />
      <Trigram x={10.3} y={33.1} rotate={56.31} pattern={[1, 0, 1]} />
      <Trigram x={37.7} y={33.1} rotate={-56.31} pattern={[0, 0, 0]} />
    </svg>
  );
}

/** 동그란 성조기 — 한국어 화면에서 '영어로 보기' 버튼에 씁니다. */
export function UsFlagMark(props: IconProps) {
  // 줄 13개 가운데 흰 줄 6개 (줄 하나의 높이 = 48 / 13)
  const stripe = 48 / 13;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width="1em"
      height="1em"
      aria-hidden="true"
      {...props}
    >
      <rect width="48" height="48" fill="var(--color-accent-600)" />
      {[1, 3, 5, 7, 9, 11].map((row) => (
        <rect key={row} y={row * stripe} width="48" height={stripe} fill="#ffffff" />
      ))}
      <rect width="25" height={stripe * 7} fill="var(--color-navy-800)" />
      {[
        [12.5, 5.5],
        [18.5, 5.5],
        [9.5, 10.5],
        [15.5, 10.5],
        [21.5, 10.5],
        [6.5, 15.5],
        [12.5, 15.5],
        [18.5, 15.5],
        [9.5, 20.5],
        [15.5, 20.5],
        [21.5, 20.5],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.2" fill="#ffffff" />
      ))}
    </svg>
  );
}
