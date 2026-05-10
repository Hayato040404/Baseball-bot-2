export function absolutize(url: string, base = 'https://baseball.yahoo.co.jp') {
  return new URL(url, base).toString();
}

export function textify(input: string) {
  return input
    .replace(/\s+/g, ' ')
    .replace(/\u3000+/g, ' ')
    .trim();
}

export function safeInt(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}
