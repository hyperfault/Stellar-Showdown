import { useEffect, useState } from 'react';
import type { FormatRules } from '@stellar/core/validation';
import { loadValidation } from '../teams/validate';

/** Lazily loads Showdown's own rule data for a format (undefined while loading). */
export function useFormatRules(formatId: string | undefined): FormatRules | undefined {
  const [rules, setRules] = useState<{ id: string; rules: FormatRules }>();
  useEffect(() => {
    if (!formatId) return;
    let live = true;
    loadValidation().then((m) => { if (live) setRules({ id: formatId, rules: m.getFormatRules(formatId) }); }).catch(() => {});
    return () => { live = false; };
  }, [formatId]);
  return rules && rules.id === formatId ? rules.rules : undefined;
}

/** Rules for many formats at once (used to grade support across the list). */
export function useAllFormatRules(ids: string[]): Record<string, FormatRules> {
  const [map, setMap] = useState<Record<string, FormatRules>>({});
  const key = ids.join(',');
  useEffect(() => {
    let live = true;
    loadValidation().then((m) => {
      if (!live) return;
      const next: Record<string, FormatRules> = {};
      for (const id of ids) next[id] = m.getFormatRules(id);
      setMap(next);
    }).catch(() => {});
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return map;
}
