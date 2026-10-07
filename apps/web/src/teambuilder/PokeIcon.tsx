import { useState } from 'react';
import { Icons, Sprites } from '@pkmn/img';

/** Pokémon box icon from Showdown's icon sheet (same assets the official client uses). `scale` multiplies the 40×30 base. */
export function PokeIcon({ species, scale = 1, className = '' }: { species?: string; scale?: number; className?: string }) {
  const w = 40 * scale, h = 30 * scale;
  if (!species) return <span className={`pk-icon pk-icon--empty ${className}`} style={{ width: w, height: h }} aria-hidden="true" />;
  const i = Icons.getPokemon(species);
  return (
    <span className={`pk-icon ${className}`} style={{ width: w, height: h }} role="img" aria-label={species}>
      <span style={{ display: 'block', width: 40, height: 30, transform: `scale(${scale})`, transformOrigin: '0 0', imageRendering: 'pixelated',
        background: `url(${i.url}) no-repeat ${i.left}px ${i.top}px` }} />
    </span>
  );
}

export function ItemIcon({ item }: { item: string }) {
  if (!item) return <span className="item-icon" aria-hidden="true" />;
  const i = Icons.getItem(item);
  return <span className="item-icon" aria-hidden="true" style={{ background: `url(${i.url}) no-repeat ${i.left}px ${i.top}px`, imageRendering: 'pixelated' }} />;
}

/** Larger animated sprite for the set editor, with a still-image fallback. */
export function PokemonArt({ species, shiny }: { species: string; shiny?: boolean }) {
  const [failed, setFailed] = useState(false);
  const s = Sprites.getPokemon(species, { gen: failed ? 'gen5' : 'ani', shiny });
  return <img className="pk-art" src={s.url} alt={species} width={s.w} height={s.h} style={{ imageRendering: s.pixelated ? 'pixelated' : 'auto' }}
    onError={() => setFailed(true)} key={`${species}${shiny}${failed}`} />;
}
