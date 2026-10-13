/** Club-wide banned tokens. Longer phrases first so we log the full match. */
const BANNED = [
  "đụ má",
  "đụ mẹ",
  "địt mẹ",
  "địt cha",
  "đụ cha",
  "đụ con",
  "đkmm",
  "dcmm",
  "đmm",
  "đkm",
  "dcm",
  "dmm",
  "đm",
  "đụ",
  "địt",
  "đéo",
  "lồn",
  "cặc",
];

export function findBannedWord(raw: string): string | null {
  const n = raw
    .toLowerCase()
    .normalize("NFC")
    .replace(/[._*\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!n) return null;
  const padded = ` ${n} `;
  for (const word of BANNED) {
    const pat = word.replace(/\s+/g, "\\s*");
    const re = new RegExp(`([^\\p{L}\\p{N}]|^)${pat}([^\\p{L}\\p{N}]|$)`, "iu");
    if (re.test(padded)) return word;
  }
  return null;
}
