export type Castle = {
  season: string;
  region: string;
  province: string;
  name: string;
  x: number;
  y: number;
  type?: string;
  lv?: number;
};

export interface CastleRepo {
  listBySeason(season: string): Promise<Castle[]>;
}
