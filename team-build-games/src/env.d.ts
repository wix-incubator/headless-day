/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly ARENA_SKIN_NEON_RONIN_PRODUCT_ID?: string;
  readonly ARENA_SKIN_SOLAR_WARDEN_PRODUCT_ID?: string;
  readonly PUBLIC_ARENA_LOBBY_MUSIC_URL?: string;
  readonly PUBLIC_ARENA_BATTLE_MUSIC_URL?: string;
  readonly PUBLIC_ARENA_BLOCK_SOUND_URL?: string;
  readonly PUBLIC_OVERRUN_ASSET_MANIFEST_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
