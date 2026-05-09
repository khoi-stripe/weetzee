const SUPPORTER_KEY = "weetzee-supporter";
const GAMES_KEY = "weetzee-games-completed";

export function getIsSupporter(): boolean {
  try {
    return localStorage.getItem(SUPPORTER_KEY) === "true";
  } catch {
    return false;
  }
}

export function setIsSupporter(value: boolean) {
  try {
    localStorage.setItem(SUPPORTER_KEY, value ? "true" : "false");
  } catch {}
}

export function getGamesCompleted(): number {
  try {
    return parseInt(localStorage.getItem(GAMES_KEY) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

export function incrementGamesCompleted(): number {
  const count = getGamesCompleted() + 1;
  try {
    localStorage.setItem(GAMES_KEY, count.toString());
  } catch {}
  return count;
}
