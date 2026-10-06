/**
 * Helpers for choice-request payloads. The live Showdown server sends move
 * entries with a `move` display-name key (legacy format), while some typings
 * model it as `name`. Read both defensively.
 */

export interface RequestMoveLike {
  id: string;
  name?: string;
  move?: string;
  pp?: number;
  maxpp?: number;
  disabled?: boolean;
}

/** Display name of a move entry in a |request| payload. */
export function requestMoveName(m: RequestMoveLike): string {
  return m.name ?? m.move ?? m.id;
}
