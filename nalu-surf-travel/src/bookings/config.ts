import wixConfig from '../../wix.config.json';

/**
 * OAuth client id for the visitor SDK client. Sourced from the committed
 * `wix.config.json#appId` (not `.env.local`'s `WIX_CLIENT_ID`): the app runs as a
 * `client:only` React island, so a gitignored/server-only env var never reaches the
 * browser bundle. `wix.config.json#appId` is the same value (confirmed in
 * docs/scaffold-notes.md) and is already committed — it is the public OAuth client
 * id, never the secret.
 */
export const CLIENT_ID: string = wixConfig.appId;
