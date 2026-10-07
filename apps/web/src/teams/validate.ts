import { useEffect, useState } from 'react';
import type { PokemonSet } from '@stellar/core';
import type { TeamValidation } from '@stellar/core/validation';
import { client } from '../client';
import { packTeam } from '@stellar/core';

/** Lazy: @pkmn/sim is large, so it only loads when something needs validation or rules. */
let mod: Promise<typeof import('@stellar/core/validation')> | undefined;
export const loadValidation = () => (mod ??= import('@stellar/core/validation'));

export type TeamCheck =
  | { state: 'checking' }
  | ({ state: 'done' } & TeamValidation);

/** Validate with the Showdown validator (debounced). Re-runs when the format or sets change. */
export function useTeamValidation(format: string, sets: PokemonSet[]): TeamCheck {
  const [result, setResult] = useState<TeamCheck>({ state: 'checking' });
  useEffect(() => {
    let live = true;
    setResult((r) => (r.state === 'done' ? r : { state: 'checking' }));
    const t = setTimeout(() => {
      loadValidation().then((m) => {
        if (!live) return;
        const filled = sets.filter((s) => s.species);
        setResult({ state: 'done', ...m.validateTeam(format, filled) });
      }).catch(() => {
        if (live) setResult({ state: 'done', status: 'unavailable', problems: [], slotProblems: sets.map(() => []), teamProblems: [] });
      });
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [format, sets]);
  return result;
}

/** Ask the connected server to validate (for formats newer than the bundled sim data). Uses the existing client. */
export function validateOnServer(format: string, sets: PokemonSet[]): Promise<string> {
  return new Promise((resolve) => {
    const off = client.events.once('popup', (text) => { clearTimeout(timer); resolve(text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()); });
    const timer = setTimeout(() => { off(); resolve('The server did not answer in time.'); }, 8000);
    client.send(`/utm ${packTeam(sets)}`);
    client.send(`/vtm ${format}`);
  });
}
