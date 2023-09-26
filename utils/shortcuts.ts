let shortCuts = require("../shortcuts.json");

export function getShortcut(arg: string): string {
  if (shortCuts[arg]) return shortCuts[arg];
  return arg;
}
