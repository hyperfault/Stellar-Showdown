/**
 * Builders for `/choose` payloads, matching the official client's choice
 * grammar: `move 1 mega`, `move 2 terastallize`, `switch 3`, `team 1,2,3...`.
 */

export interface MoveChoiceOptions {
  /** 1-based target position for doubles; omit in singles. */
  target?: number;
  mega?: boolean;
  zmove?: boolean;
  ultra?: boolean;
  dynamax?: boolean;
  gigantamax?: boolean;
  terastallize?: boolean;
}

export function buildMoveChoice(moveIndex1Based: number, opts: MoveChoiceOptions = {}): string {
  let choice = `move ${moveIndex1Based}`;
  if (opts.mega) choice += ' mega';
  else if (opts.zmove) choice += ' zmove';
  else if (opts.ultra) choice += ' ultra';
  else if (opts.dynamax) choice += ' dynamax';
  if (opts.terastallize) choice += ' terastallize';
  if (opts.target !== undefined) choice += ` ${opts.target}`;
  return choice;
}

export function buildSwitchChoice(partyIndex1Based: number): string {
  return `switch ${partyIndex1Based}`;
}

/** Team preview order: 1-based party indices in lead-first order. */
export function buildTeamChoice(order: number[]): string {
  return `team ${order.join(',')}`;
}

export function buildPassChoice(): string {
  return 'pass';
}

export function buildShiftChoice(): string {
  return 'shift';
}
