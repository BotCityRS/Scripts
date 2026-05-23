import type { Path, PathNode, WalkNodeId } from './types';

export function reversePath(path: Path): Path {
  return path.map(n => [n[0], n[1]] as PathNode).reverse();
}

export const HUB_ROUTE_OPTIONS: { label: string; from: WalkNodeId; to: WalkNodeId }[] = [
  { label: 'Draynor <-> Lumbridge', from: 'hub_draynor', to: 'hub_lumbridge' },
  { label: 'Draynor <-> Falador', from: 'hub_draynor', to: 'hub_falador' },
  { label: 'Draynor <-> Barb Village', from: 'hub_draynor', to: 'hub_barbarian_village' },
  { label: 'Barb Village <-> Varrock', from: 'hub_barbarian_village', to: 'hub_varrock' },
  { label: 'Barb Village <-> Edgeville bank', from: 'hub_barbarian_village', to: 'bank_edgeville' },
  { label: 'Falador <-> Varrock', from: 'hub_falador', to: 'hub_varrock' },
  { label: 'Falador <-> Catherby bank', from: 'hub_falador', to: 'bank_catherby' },
  { label: 'Varrock <-> Lumbridge', from: 'hub_varrock', to: 'hub_lumbridge' },
  { label: 'Lumbridge <-> Al Kharid bank', from: 'hub_lumbridge', to: 'bank_al_kharid' },
  { label: 'Lumbridge <-> Port Sarim', from: 'hub_lumbridge', to: 'hub_port_sarim' },
  { label: 'Port Sarim <-> Rimmington', from: 'hub_port_sarim', to: 'hub_rimmington' },
  { label: 'Rimmington <-> Falador', from: 'hub_rimmington', to: 'hub_falador' }
];
