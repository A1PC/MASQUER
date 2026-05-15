export const AVATAR_PALETTE = [
  '#a3122a',
  '#d4af37',
  '#3df0ff',
  '#ff5cf2',
  '#3dd17a',
  '#9c5cff',
  '#ff8c42',
  '#ffe066',
  '#27c4d6',
  '#e85d75',
] as const;

export type AvatarColor = (typeof AVATAR_PALETTE)[number];

export function pickRandomAvatarColor(): AvatarColor {
  const i = crypto.getRandomValues(new Uint32Array(1))[0]! % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[i]!;
}
