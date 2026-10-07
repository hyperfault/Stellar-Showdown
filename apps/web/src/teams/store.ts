import { create } from 'zustand';
import { formatGen, type PokemonSet } from '@stellar/core';
import { normalizeSet } from './sets';

export interface StoredTeam {
  id: string;
  name: string;
  /** Showdown format id the team is built for, e.g. "gen9ou". */
  format: string;
  sets: PokemonSet[];
  createdAt: number;
  updatedAt: number;
}

const KEY = 'stellar.teams.v1';
interface Persisted { teams: StoredTeam[]; selected: Record<string, string>; }

function load(): Persisted {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Persisted | null;
    if (raw && Array.isArray(raw.teams)) {
      const teams = raw.teams.map((t) => ({ ...t, sets: (t.sets ?? []).map((x) => normalizeSet(x, formatGen(t.format))) }));
      return { teams, selected: raw.selected ?? {} };
    }
  } catch { /* corrupt or unavailable storage: start empty */ }
  return { teams: [], selected: {} };
}

const uid = () => (globalThis.crypto?.randomUUID?.() ?? `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);

interface TeamState extends Persisted {
  create(init: { format: string; name?: string; sets?: PokemonSet[] }): string;
  update(id: string, patch: Partial<Pick<StoredTeam, 'name' | 'format' | 'sets'>>): void;
  remove(id: string): void;
  duplicate(id: string): string | undefined;
  /** Mark a team as the one used for a (team) format. */
  select(teamFormat: string, id: string): void;
  addMany(items: { format: string; name: string; sets: PokemonSet[] }[]): string[];
}

export const useTeamStore = create<TeamState>()((set, get) => ({
  ...load(),
  create({ format, name, sets }) {
    const id = uid();
    const now = Date.now();
    const n = get().teams.length + 1;
    set((s) => ({ teams: [{ id, name: name?.trim() || `Untitled ${n}`, format, sets: sets ?? [], createdAt: now, updatedAt: now }, ...s.teams] }));
    return id;
  },
  update(id, patch) {
    set((s) => ({ teams: s.teams.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t)) }));
  },
  remove(id) {
    set((s) => ({
      teams: s.teams.filter((t) => t.id !== id),
      selected: Object.fromEntries(Object.entries(s.selected).filter(([, v]) => v !== id)),
    }));
  },
  duplicate(id) {
    const src = get().teams.find((t) => t.id === id);
    if (!src) return undefined;
    return get().create({ format: src.format, name: `${src.name} (copy)`, sets: structuredClone(src.sets) });
  },
  select(teamFormat, id) {
    set((s) => ({ selected: { ...s.selected, [teamFormat]: id } }));
  },
  addMany(items) {
    return items.map((it) => get().create(it));
  },
}));

useTeamStore.subscribe((s) => {
  try { localStorage.setItem(KEY, JSON.stringify({ teams: s.teams, selected: s.selected } satisfies Persisted)); } catch { /* quota */ }
});

/** The team used for a team format: the explicit choice, else the most recently edited team of that format. */
export function pickTeam(state: Persisted, teamFormat: string): StoredTeam | undefined {
  const explicit = state.teams.find((t) => t.id === state.selected[teamFormat] && t.format === teamFormat);
  if (explicit) return explicit;
  return state.teams.filter((t) => t.format === teamFormat).sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

export const useSelectedTeam = (teamFormat: string) =>
  useTeamStore((s) => pickTeam(s, teamFormat));
