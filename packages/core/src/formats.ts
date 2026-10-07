import { toID, type ID } from '@pkmn/data';

/**
 * One entry of the server's `|formats|` list, parsed exactly like the official
 * client (play.pokemonshowdown.com panel-mainmenu `parseFormats`).
 *
 * Wire shape: `|formats|,LL|,1|Section name|[Gen 9] OU,e|[Gen 9] Random Battle,f|...`
 *  - entries are `|`-separated
 *  - `,LL` marks a local ladder; `,<n>` (or an empty entry) starts a section whose
 *    name is the NEXT entry, with `<n>` the display column
 *  - a format entry is `Name,<hex flags>`:
 *      1 preset (random) team · 2 ladder search · 4 challenge · 8 tournament
 *      16 level 50 · 32 partner · 64 best-of default · 128 tera preview · 256 item clause
 */
export interface FormatEntry {
  id: ID;
  name: string;
  /** Section header as sent by the server ("S/V Singles", "OM of the Month", ...). */
  section: string;
  column: number;
  searchShow: boolean;
  challengeShow: boolean;
  tournamentShow: boolean;
  /** 'preset' = the server supplies the team (random formats, Battle Factory, ...). */
  team: 'preset' | null;
  /** Server-supplied teams: no `/utm` needed. */
  isRandomFormat: boolean;
  /** The player must bring a team. */
  needsTeam: boolean;
  /** Teams saved under this format id are compatible (variants map to their base tier). */
  teamFormat: ID;
  gen: number;
  rated: boolean;
  teambuilderLevel: number | null;
  partner: boolean;
  bestOfDefault: boolean;
  teraPreviewDefault: boolean;
  itemClauseDefault: boolean;
}

export const formatGen = (id: string): number => {
  const m = /^gen(\d)/.exec(id);
  return m ? Number(m[1]) : 6;
};

/** Parse the entries that follow `|formats|` (already split on `|`). */
export function parseFormatsList(entries: string[]): FormatEntry[] {
  const out: FormatEntry[] = [];
  let isSection = false;
  let section = '';
  let column = 0;

  for (const entry of entries) {
    if (isSection) {
      section = entry;
      isSection = false;
      continue;
    }
    if (entry === ',LL') continue; // local ladder marker
    if (entry === '' || (entry.startsWith(',') && !Number.isNaN(Number(entry.slice(1))))) {
      isSection = true;
      if (entry) column = parseInt(entry.slice(1), 10) || 0;
      continue;
    }

    let name = entry;
    let searchShow = true, challengeShow = true, tournamentShow = true;
    let partner = false, bestOfDefault = false, teraPreviewDefault = false, itemClauseDefault = false;
    let team: 'preset' | null = null;
    let teambuilderLevel: number | null = null;

    const lastComma = name.lastIndexOf(',');
    const code = lastComma >= 0 ? parseInt(name.slice(lastComma + 1), 16) : NaN;
    if (!Number.isNaN(code)) {
      name = name.slice(0, lastComma);
      if (code & 1) team = 'preset';
      if (!(code & 2)) searchShow = false;
      if (!(code & 4)) challengeShow = false;
      if (!(code & 8)) tournamentShow = false;
      if (code & 16) teambuilderLevel = 50;
      if (code & 32) partner = true;
      if (code & 64) bestOfDefault = true;
      if (code & 128) teraPreviewDefault = true;
      if (code & 256) itemClauseDefault = true;
    } else {
      // Backwards compatibility with old servers, as in the official client.
      if (name.endsWith(',#')) { team = 'preset'; name = name.slice(0, -2); }
      if (name.endsWith(',,')) { challengeShow = false; name = name.slice(0, -2); }
      else if (name.endsWith(',')) { searchShow = false; name = name.slice(0, -1); }
    }

    const id = toID(name);
    const needsTeam = team === null;
    let teamFormat = id;
    if (needsTeam && !name.endsWith('Custom Game')) {
      let base = id.startsWith('gen') ? name : `[Gen 6] ${name}`;
      const paren = base.indexOf('(');
      if (paren > 0 && name.endsWith(')')) base = base.slice(0, paren).trim(); // "(Blitz)" etc. are variants
      teamFormat = toID(base);
    }

    out.push({
      id, name, section, column, searchShow, challengeShow, tournamentShow,
      team, isRandomFormat: team === 'preset', needsTeam, teamFormat,
      gen: formatGen(id), rated: searchShow && id.slice(4, 11) !== 'unrated',
      teambuilderLevel, partner, bestOfDefault, teraPreviewDefault, itemClauseDefault,
    });
  }
  return out;
}
