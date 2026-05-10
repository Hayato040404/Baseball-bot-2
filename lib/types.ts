export type GameSnapshot = {
  scheduleUrl: string;
  gameUrl: string;
  textUrl: string;
  title: string;
  status: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  fetchedAt: string;
};

export type PlayEvent = {
  key: string;
  inning: string;
  inningId: string;
  team: string;
  text: string;
  number: number | null;
};

export type BotState = {
  snapshot: GameSnapshot | null;
  latestEventKey: string | null;
  lastUpdateAt: string | null;
  events: PlayEvent[];
  notificationsEnabled: boolean;
};
