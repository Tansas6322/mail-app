import type { Castle, CastleRepo } from "./types";
import castles from "@/data/castles.json";

export const jsonRepo: CastleRepo = {
  async listBySeason(season: string) {
    return (castles as Castle[]).filter((c) => c.season === season);
  },
};
