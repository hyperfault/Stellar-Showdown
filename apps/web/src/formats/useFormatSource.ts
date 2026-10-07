import { useEffect, useState } from 'react';
import { toID, type FormatEntry } from '@stellar/core';
import { useAppStore } from '../store';
import { loadValidation } from '../teams/validate';

/**
 * The format list the UI should show: the server's live list when we have it,
 * otherwise the formats bundled with the sim data (so teams can be built offline).
 */
export function useFormatSource(enabled = true): { formats: FormatEntry[]; offline: boolean } {
  const live = useAppStore((s) => s.formats);
  const [bundled, setBundled] = useState<FormatEntry[]>([]);

  useEffect(() => {
    if (!enabled || live.length) return;
    let alive = true;
    loadValidation().then((m) => {
      if (!alive) return;
      setBundled(m.listBundledFormats().map((f): FormatEntry => ({
        id: toID(f.id), name: f.name, section: f.section, column: 0,
        searchShow: false, challengeShow: true, tournamentShow: false,
        team: f.randomTeam ? 'preset' : null, isRandomFormat: f.randomTeam, needsTeam: !f.randomTeam,
        teamFormat: toID(f.id), gen: f.gen, rated: false, teambuilderLevel: null,
        partner: false, bestOfDefault: false, teraPreviewDefault: false, itemClauseDefault: false,
      })));
    }).catch(() => {});
    return () => { alive = false; };
  }, [enabled, live.length]);

  return live.length ? { formats: live, offline: false } : { formats: bundled, offline: true };
}
