export const TYPE_COLORS: Record<string, string> = {
  Normal: '#9FA19F', Fire: '#E62829', Water: '#2980EF', Electric: '#FAC000',
  Grass: '#3FA129', Ice: '#3DCEF3', Fighting: '#FF8000', Poison: '#9141CB',
  Ground: '#915121', Flying: '#81B9EF', Psychic: '#EF4179', Bug: '#91A119',
  Rock: '#AFA981', Ghost: '#704170', Dragon: '#5060E1', Dark: '#624D4E',
  Steel: '#60A1B8', Fairy: '#EF70EF', Stellar: '#35B5A8', '???': '#44685E',
};

export function typeColor(type: string): string {
  return TYPE_COLORS[type] ?? '#6b7280';
}

/** Human-readable effectiveness multiplier, with tone for styling. */
export function effectivenessLabel(mult: number): { label: string; tone: 'good' | 'bad' | 'zero' | 'neutral' } {
  if (mult === 0) return { label: 'immune', tone: 'zero' };
  if (mult > 1) return { label: `×${mult}`, tone: 'good' };
  if (mult < 1) return { label: `×${mult}`, tone: 'bad' };
  return { label: '', tone: 'neutral' };
}
