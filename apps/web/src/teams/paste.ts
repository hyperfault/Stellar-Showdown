import { exportTeamPaste, formatGen, generationFor, importTeamPaste, toID, type PokemonSet } from '@stellar/core';
import { normalizeSet } from './sets';
import type { StoredTeam } from './store';

export interface ParsedTeam { format: string; name: string; sets: PokemonSet[]; }

const HEADER = /^===\s*(?:\[([^\]]*)\]\s*)?(.*?)\s*===\s*$/;

/**
 * Parse Showdown team text. Accepts a single plain paste, or several teams in the
 * official "backup" layout (`=== [gen9ou] Folder/Name ===` headers).
 * Returns [] when nothing in the text is a recognizable team.
 */
export function parseTeamsPaste(text: string, defaultFormat: string): ParsedTeam[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: { format: string; name: string; body: string[] }[] = [];
  let cur: { format: string; name: string; body: string[] } | null = null;

  for (const line of lines) {
    const m = HEADER.exec(line.trim());
    if (m) {
      cur = { format: m[1] ? toID(m[1]) : defaultFormat, name: (m[2] ?? '').split('/').pop()?.trim() ?? '', body: [] };
      blocks.push(cur);
    } else {
      if (!cur) { cur = { format: defaultFormat, name: '', body: [] }; blocks.push(cur); }
      cur.body.push(line);
    }
  }

  const out: ParsedTeam[] = [];
  for (const b of blocks) {
    const body = b.body.join('\n').trim();
    if (!body) continue;
    const g = formatGen(b.format);
    const team = importTeamPaste(body, generationFor(g));
    const sets = ((team?.team ?? []) as PokemonSet[]).filter((s) => s.species).map((s) => normalizeSet(s, g));
    if (sets.length) out.push({ format: b.format, name: b.name, sets: sets.slice(0, 6) });
  }
  return out;
}

/** One team as Showdown paste text. */
export function teamToPaste(team: Pick<StoredTeam, 'format' | 'sets'>): string {
  return exportTeamPaste(team.sets, generationFor(formatGen(team.format)));
}

/** Several teams in the official backup layout, importable by Showdown and by parseTeamsPaste. */
export function teamsToBackup(teams: Pick<StoredTeam, 'format' | 'name' | 'sets'>[]): string {
  return teams.map((t) => `=== [${t.format}] ${t.name} ===\n\n${teamToPaste(t).trim()}\n`).join('\n');
}

/** Copy to the clipboard; falls back to a hidden textarea where the async API is unavailable. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
