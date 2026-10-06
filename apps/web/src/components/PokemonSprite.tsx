import { useState } from 'react';
import type { PokemonRef } from '../services/types';

/**
 * Sprite sources: the ONLY place that knows where assets live.
 * `id` is the Showdown sprite filename: lowercase, forms hyphenated
 * ("zoroark-hisui", "landorus-therian"), no hyphen for plain names ("fluttermane").
 * To use local files later, change these two functions.
 */
const ARTWORK_DEX: Record<string, number> = { 'zoroark-hisui': 10239, lucario: 448 };

export const spriteSources = {
  icon: (id: string) => `https://play.pokemonshowdown.com/sprites/gen5/${id}.png`,
  artwork: (id: string) => {
    const dex = ARTWORK_DEX[id];
    return dex
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dex}.png`
      : `https://play.pokemonshowdown.com/sprites/gen5/${id}.png`; // small fallback for ids without a mapping
  },
};

export function PokemonSprite({ mon }: { mon: PokemonRef }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="sprite" role="img" aria-label={mon.species} />;
  return <img className="sprite" src={spriteSources.icon(mon.spriteId)} alt={mon.species} loading="lazy" onError={() => setFailed(true)} />;
}

export const SpriteRow = ({ members }: { members: PokemonRef[] }) =>
  <span className="sprites">{members.map((m, i) => <PokemonSprite key={i} mon={m} />)}</span>;

export const PokemonArtwork = ({ id }: { id: string }) =>
  <img src={spriteSources.artwork(id)} alt="" />;
