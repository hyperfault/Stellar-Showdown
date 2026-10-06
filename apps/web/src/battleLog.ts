/**
 * Turns raw battle-protocol lines into human-readable log entries.
 * Returns null for lines the log should hide.
 */

export interface LogEntry {
  text: string;
  cls: 'major' | 'minor' | 'turn' | 'effective' | 'resisted';
}

/** `p1a: Cinderace` → `Cinderace`; keeps foe/side prefixes readable. */
export function shortIdent(ident: string): string {
  const idx = ident.indexOf(': ');
  return idx === -1 ? ident : ident.slice(idx + 2);
}

export function formatLogLine(line: string): LogEntry | null {
  const parts = line.split('|');
  const type = parts[1] ?? '';
  const arg = (i: number) => parts[i] ?? '';

  switch (type) {
    case 'turn':
      return { text: `— Turn ${arg(2)} —`, cls: 'turn' };
    case 'move': {
      const user = shortIdent(arg(2));
      const move = arg(3);
      if (move === 'recharge') return { text: `${user} must recharge!`, cls: 'minor' };
      return { text: `${user} used ${move}!`, cls: 'major' };
    }
    case 'switch':
    case 'drag': {
      const name = shortIdent(arg(2));
      return { text: type === 'switch' ? `${name} switched in.` : `${name} was dragged out!`, cls: 'major' };
    }
    case 'faint':
      return { text: `${shortIdent(arg(2))} fainted!`, cls: 'major' };
    case '-damage':
      return null; // HP bars already show this
    case '-heal':
      return { text: `${shortIdent(arg(2))} restored HP.`, cls: 'minor' };
    case '-status':
      return { text: `${shortIdent(arg(2))} was inflicted with ${arg(3)}!`, cls: 'major' };
    case '-curestatus':
      return { text: `${shortIdent(arg(2))} was cured of ${arg(3)}.`, cls: 'minor' };
    case '-boost':
      return { text: `${shortIdent(arg(2))}'s ${arg(3)} rose${arg(4) && arg(4) !== '1' ? ` by ${arg(4)}` : ''}!`, cls: 'minor' };
    case '-unboost':
      return { text: `${shortIdent(arg(2))}'s ${arg(3)} fell${arg(4) && arg(4) !== '1' ? ` by ${arg(4)}` : ''}!`, cls: 'minor' };
    case '-supereffective':
      return { text: `It's super effective!`, cls: 'effective' };
    case '-resisted':
      return { text: `It's not very effective…`, cls: 'resisted' };
    case '-immune':
      return { text: `It had no effect on ${shortIdent(arg(2))}!`, cls: 'resisted' };
    case '-crit':
      return { text: `A critical hit!`, cls: 'effective' };
    case '-miss':
      return { text: `The attack missed!`, cls: 'minor' };
    case '-fail':
      return { text: `But it failed!`, cls: 'minor' };
    case '-weather':
      return arg(2) === 'none'
        ? { text: 'The weather cleared.', cls: 'minor' }
        : null; // weather chip shows ongoing state; log only when it ends
    case '-terastallize':
      return { text: `${shortIdent(arg(2))} terastallized into ${arg(3)} type!`, cls: 'major' };
    case '-start': {
      const effect = arg(3);
      if (effect === 'Dynamax') return { text: `${shortIdent(arg(2))} dynamaxed!`, cls: 'major' };
      if (effect.startsWith('typechange')) return { text: `${shortIdent(arg(2))}'s type changed!`, cls: 'minor' };
      return null;
    }
    case '-sidestart':
    case '-sideend':
      return { text: `${arg(3)} ${type === '-sidestart' ? 'went up' : 'wore off'} on ${arg(2)}'s side.`, cls: 'minor' };
    case '-fieldstart':
      return { text: `${arg(2)} is in effect.`, cls: 'minor' };
    case '-fieldend':
      return { text: `${arg(2)} ended.`, cls: 'minor' };
    case '-item':
      return { text: `${shortIdent(arg(2))}'s ${arg(3)} was revealed.`, cls: 'minor' };
    case '-enditem':
      return { text: `${shortIdent(arg(2))} lost its ${arg(3)}!`, cls: 'minor' };
    case '-ability':
      return { text: `${shortIdent(arg(2))}'s ability: ${arg(3)}.`, cls: 'minor' };
    case 'cant':
      return { text: `${shortIdent(arg(2))} can't move (${arg(3)})!`, cls: 'minor' };
    case '-mustrecharge':
      return { text: `${shortIdent(arg(2))} must recharge!`, cls: 'minor' };
    case '-activate':
      return arg(3) ? { text: `${shortIdent(arg(2))} activated ${arg(3)}!`, cls: 'minor' } : null;
    case 'win':
      return { text: `${arg(2)} won the battle!`, cls: 'turn' };
    case 'tie':
      return { text: `The battle ended in a tie.`, cls: 'turn' };
    case '-mega':
      return { text: `${shortIdent(arg(2))} mega evolved!`, cls: 'major' };
    case '-ohko':
      return { text: `It's a one-hit KO!`, cls: 'effective' };
    case '-zpower':
      return { text: `${shortIdent(arg(2))} unleashed its Z-Power!`, cls: 'major' };
    default:
      return null;
  }
}
