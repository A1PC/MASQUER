import { useId } from 'react';
import type { JSX } from 'react';

export type MaskVariant = 'full' | 'simple';

interface MaskMarkProps {
  size?: number;
  variant?: MaskVariant;
  className?: string;
  title?: string;
}

/** MASQUER Colombina half-mask — porcelain white + gold. `full` = all filigree;
 *  `simple` = silhouette + inner rule + eyes + crest only (favicon / tiny renders). */
export default function MaskMark({
  size = 64,
  variant = 'full',
  className,
  title = 'MASQUER mask',
}: MaskMarkProps): JSX.Element {
  const gid = useId();
  const grad = `porc-${gid}`;
  const width = size;
  const height = Math.round((size * 180) / 240); // viewBox 240 × 180

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 -34 240 180"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f6efde" />
          <stop offset="100%" stopColor="#e2d4b6" />
        </linearGradient>
      </defs>

      {/* top crest flourish — present in both variants */}
      <g stroke="#c79a4b" strokeWidth={2.4} fill="none" strokeLinecap="round">
        <path d="M120,30 C112,8 98,2 96,-14 C108,-6 116,-2 120,8 C124,-2 132,-6 144,-14 C142,2 128,8 120,30" />
      </g>

      {variant === 'full' && (
        <g data-detail="filigree">
          {/* temple flourishes */}
          <g stroke="#c79a4b" strokeWidth={2.2} fill="none" strokeLinecap="round">
            <path d="M30,66 C12,52 8,32 16,16 C18,34 30,46 44,54" />
            <path d="M210,66 C228,52 232,32 224,16 C222,34 210,46 196,54" />
          </g>
        </g>
      )}

      {/* half-mask silhouette */}
      <path
        d="M26,72 C34,42 70,30 104,34 C112,35 116,44 120,46
           C124,44 128,35 136,34 C170,30 206,42 214,72
           C210,84 196,96 176,98 C160,100 150,92 142,84
           C134,78 126,80 120,86 C114,80 106,78 98,84
           C90,92 80,100 64,98 C44,96 30,84 26,72 Z"
        fill={`url(#${grad})`}
        stroke="#c79a4b"
        strokeWidth={4}
      />
      {/* inner gold rule */}
      <path
        d="M36,72 C44,50 74,40 104,43 C112,44 116,51 120,53
           C124,51 128,44 136,43 C166,40 196,50 204,72
           C200,82 188,90 174,91 C160,93 151,86 144,79
           C135,73 127,75 120,80 C113,75 105,73 96,79
           C89,86 80,93 66,91 C50,89 40,82 36,72 Z"
        fill="none"
        stroke="#e6c068"
        strokeWidth={1.3}
        opacity={0.7}
      />

      {variant === 'full' && (
        <g data-detail="filigree" fill="#fff7df">
          <circle cx="78" cy="38" r="2" />
          <circle cx="162" cy="38" r="2" />
          <circle cx="48" cy="58" r="1.8" />
          <circle cx="192" cy="58" r="1.8" />
        </g>
      )}

      {/* eyes + rims — present in both variants */}
      <g>
        <ellipse
          cx="86"
          cy="64"
          rx="21"
          ry="11.5"
          transform="rotate(-8 86 64)"
          fill="#0c1711"
          stroke="#c79a4b"
          strokeWidth={2.8}
        />
        <ellipse
          cx="154"
          cy="64"
          rx="21"
          ry="11.5"
          transform="rotate(8 154 64)"
          fill="#0c1711"
          stroke="#c79a4b"
          strokeWidth={2.8}
        />
      </g>

      {variant === 'full' && (
        <g data-detail="filigree">
          {/* eye liner + lower lash */}
          <path d="M62,58 q22,-12 46,-3" stroke="#e6c068" strokeWidth={2.2} fill="none" />
          <path d="M178,58 q-22,-12 -46,-3" stroke="#e6c068" strokeWidth={2.2} fill="none" />
          <path
            d="M70,78 q16,9 32,2"
            stroke="#e6c068"
            strokeWidth={1.7}
            fill="none"
            opacity={0.8}
          />
          <path
            d="M170,78 q-16,9 -32,2"
            stroke="#e6c068"
            strokeWidth={1.7}
            fill="none"
            opacity={0.8}
          />
          {/* nose-bridge diamond */}
          <path d="M120,52 l5,6 l-5,6 l-5,-6 Z" fill="#e6c068" stroke="#a8791f" strokeWidth={1} />
          {/* cheek scrollwork */}
          <g stroke="#c79a4b" strokeWidth={2.1} fill="none" strokeLinecap="round" opacity={0.85}>
            <path d="M52,86 q8,12 2,22 q-9,-5 -8,-15" />
            <path d="M188,86 q-8,12 -2,22 q9,-5 8,-15" />
          </g>
        </g>
      )}
    </svg>
  );
}
