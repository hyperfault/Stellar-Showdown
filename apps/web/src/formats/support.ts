import type { FormatEntry } from '@stellar/core';
import type { FormatRules } from '@stellar/core/validation';

export type SupportLevel = 'full' | 'limited' | 'unsupported';
export interface FormatSupport { level: SupportLevel; reason: string; }

/** Used only when the bundled sim data doesn't know the format. */
const MULTI_ID = /doubles|vgc|multi|freeforall|triples|2v2|bss|battlestadium|battlespot|battlefestival/;
const PICKED_ID = /bss|battlestadium|battlespot|vgc|battlefestival/;

/**
 * What Stellar's battle screen can actually play today. This describes the CLIENT's
 * capability (singles only, no team-preview picking, no Mega/Z trigger buttons) —
 * not the server's rules, which come from the format list itself.
 */
export function formatSupport(f: FormatEntry, rules?: FormatRules): FormatSupport {
  const known = !!rules?.known;
  const multi = known ? rules!.gameType !== 'singles' : MULTI_ID.test(f.id);
  if (multi) return { level: 'unsupported', reason: "Doubles and other multi-Pokémon battles can't be played in Stellar's battle screen yet." };
  const picked = known ? rules!.pickedTeamSize !== null : PICKED_ID.test(f.id);
  if (picked) return { level: 'unsupported', reason: "This format asks you to pick a smaller team at preview, which Stellar can't do yet." };
  if (f.gen === 6 || f.gen === 7) return { level: 'limited', reason: "Mega Evolution and Z-Moves can't be triggered from the battle screen yet." };
  return { level: 'full', reason: 'Fully playable in Stellar.' };
}

export type Purpose = 'play' | 'team';

/** Whether a format can be picked for a purpose, and why not. */
export function availability(f: FormatEntry, support: FormatSupport, purpose: Purpose): { enabled: boolean; reason?: string } {
  if (purpose === 'team') return f.needsTeam ? { enabled: true } : { enabled: false, reason: 'The server provides the team for this format.' };
  if (!f.searchShow) {
    return { enabled: false, reason: f.challengeShow ? 'Challenge-only format — it has no ladder to search.' : 'Not available for matchmaking.' };
  }
  if (support.level === 'unsupported') return { enabled: false, reason: support.reason };
  return { enabled: true };
}
