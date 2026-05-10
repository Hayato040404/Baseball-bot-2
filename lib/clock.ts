export function nowJst() {
  const utc = new Date().getTime() + new Date().getTimezoneOffset() * 60_000;
  return new Date(utc + 9 * 60 * 60_000);
}

export function inScrapeWindowJst() {
  const d = nowJst();
  const h = d.getHours();
  return h >= 14 && h < 22;
}
