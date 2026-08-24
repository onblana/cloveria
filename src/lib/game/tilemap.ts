export const TILE_TYPE = {
  GRASS: 0,
  DIRT: 1,
  FENCE: 2,
} as const;

export type TileType = (typeof TILE_TYPE)[keyof typeof TILE_TYPE];

export const TILE_COLORS: Record<TileType, string> = {
  [TILE_TYPE.GRASS]: '#8fc75f',
  [TILE_TYPE.DIRT]: '#c9a26a',
  [TILE_TYPE.FENCE]: '#8a6d4b',
};

const WALKABLE_TILES = new Set<TileType>([TILE_TYPE.GRASS, TILE_TYPE.DIRT]);

export function isWalkableTile(tile: TileType) {
  return WALKABLE_TILES.has(tile);
}

const G = TILE_TYPE.GRASS;
const D = TILE_TYPE.DIRT;
const F = TILE_TYPE.FENCE;

// 10x10 샘플 맵: 가운데 밭, 테두리는 울타리
// prettier-ignore
export const SAMPLE_MAP: TileType[][] = [
  [F, F, F, F, F, F, F, F, F, F],
  [F, G, G, G, G, G, G, G, G, F],
  [F, G, D, D, D, D, D, D, G, F],
  [F, G, D, D, D, D, D, D, G, F],
  [F, G, D, D, D, D, D, D, G, F],
  [F, G, D, D, D, D, D, D, G, F],
  [F, G, D, D, D, D, D, D, G, F],
  [F, G, D, D, D, D, D, D, G, F],
  [F, G, G, G, G, G, G, G, G, F],
  [F, F, F, F, F, F, F, F, F, F],
];
