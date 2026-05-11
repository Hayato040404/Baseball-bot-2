import * as cheerio from 'cheerio';
import { absolutize, safeInt, textify } from './utils';
import type { GameSnapshot, PlayEvent } from './types';

const SCHEDULE_URL = 'https://baseball.yahoo.co.jp/npb/schedule/';

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'accept-language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", ";Not A Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      referer: 'https://baseball.yahoo.co.jp/',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

export async function findDeNAGameFromSchedule(): Promise<{
  scheduleUrl: string;
  gameUrl: string;
  title: string;
}> {
  const html = await fetchHtml(SCHEDULE_URL);
  const $ = cheerio.load(html);

  const items = $('.bb-score__item').toArray();
  for (const item of items) {
    const link = $(item).find('a.bb-score__content[href*="/npb/game/"]').first();
    if (!link.length) continue;

    const rawText = textify($(item).text());
    if (!/(DeNA|横浜DeNAベイスターズ)/.test(rawText)) continue;

    const href = link.attr('href');
    if (!href) continue;

    return {
      scheduleUrl: SCHEDULE_URL,
      gameUrl: absolutize(href),
      title: rawText,
    };
  }

  const fallback = $('a.bb-score__content[href*="/npb/game/"]').first();
  if (!fallback.length) throw new Error('No game link found on schedule page');
  const href = fallback.attr('href');
  if (!href) throw new Error('Game link missing href');

  return {
    scheduleUrl: SCHEDULE_URL,
    gameUrl: absolutize(href),
    title: textify(fallback.text()) || '試合',
  };
}

export async function getGameSnapshot(gameUrl: string): Promise<GameSnapshot> {
  const topUrl = gameUrl.endsWith('/top')
    ? gameUrl
    : gameUrl.replace(/\/(?:index|score|text|stats|video|cheer)$/, '/top');

  const html = await fetchHtml(topUrl);
  const $ = cheerio.load(html);

  const title =
    textify($('title').text()) || textify($('meta[property="og:title"]').attr('content') || '');

  const textHref =
    $('a.bb-menuWhite__text[href$="/text"]').attr('href') ||
    $('a[href*="/text"]').first().attr('href') ||
    gameUrl.replace(/\/top$/, '/text');

  const homeScore =
    safeInt($('.bb-gameTeam__homeScore').first().text()) ??
    safeInt($('.bb-score__score--left').first().text());
  const awayScore =
    safeInt($('.bb-gameTeam__awayScore').first().text()) ??
    safeInt($('.bb-score__score--right').first().text());

  const status =
    textify($('.bb-gameCard__state span').first().text()) ||
    textify($('.bb-gameCard__state').first().text()) ||
    textify($('.bb-score__status').first().text()) ||
    '取得中';

  const teamNames = $('.bb-gameTeam__name')
    .toArray()
    .map((el) => textify($(el).text()))
    .filter(Boolean);

  const homeTeam =
    teamNames[0] ||
    textify($('.bb-score__homeLogo').first().text()) ||
    'ホーム';
  const awayTeam =
    teamNames[1] ||
    textify($('.bb-score__awayLogo').first().text()) ||
    'アウェイ';

  return {
    scheduleUrl: SCHEDULE_URL,
    gameUrl: topUrl,
    textUrl: absolutize(textHref || gameUrl.replace(/\/top$/, '/text')),
    title,
    status,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getTextPlays(textUrl: string): Promise<PlayEvent[]> {
  const html = await fetchHtml(textUrl);
  const $ = cheerio.load(html);
  const plays: PlayEvent[] = [];

  const sections = $('section.bb-liveText').toArray();
  for (const section of sections) {
    const header = $(section).find('header.bb-liveText__head').first();
    const inningId = header.attr('id') || '';
    const inning = textify(header.find('.bb-liveText__inning').text()) || '試合情報';
    const team = textify(header.find('.bb-liveText__detail').text());

    $(section)
      .find('ol.bb-liveText__orderedList > li.bb-liveText__item')
      .each((index, item) => {
        const rawText = textify($(item).text());
        if (!rawText) return;

        const numberText = textify($(item).find('.bb-liveText__number').first().text());
        const number = safeInt(numberText.replace(/：$/, '').replace(/:$/, ''));

        plays.push({
          key: `${inningId || 'section'}:${index + 1}:${rawText}`,
          inning,
          inningId,
          team,
          text: rawText,
          number,
        });
      });
  }

  return plays;
}

export async function loadBotFeed() {
  const { gameUrl, scheduleUrl, title } = await findDeNAGameFromSchedule();
  const snapshot = await getGameSnapshot(gameUrl);
  const plays = await getTextPlays(snapshot.textUrl);
  return { scheduleUrl, gameUrl, title, snapshot, plays };
}
