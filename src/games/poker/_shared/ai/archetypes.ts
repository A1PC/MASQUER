export type Archetype = 'rock' | 'station' | 'maniac' | 'shark';

export interface ArchetypeProfile {
  vpipThreshold: number;
  aggression: number;
  bluffFactor: number;
  cautiousness: number;
}

export const ARCHETYPES: Record<Archetype, ArchetypeProfile> = {
  rock: { vpipThreshold: 0.72, aggression: 0.45, bluffFactor: 0.04, cautiousness: 0.85 },
  station: { vpipThreshold: 0.4, aggression: 0.15, bluffFactor: 0.02, cautiousness: 0.05 },
  maniac: { vpipThreshold: 0.3, aggression: 0.85, bluffFactor: 0.35, cautiousness: 0.15 },
  shark: { vpipThreshold: 0.55, aggression: 0.6, bluffFactor: 0.18, cautiousness: 0.55 },
};

export const ARCHETYPE_NAMES: Record<Archetype, string> = {
  rock: 'Rock',
  station: 'Station',
  maniac: 'Maniac',
  shark: 'Shark',
};
