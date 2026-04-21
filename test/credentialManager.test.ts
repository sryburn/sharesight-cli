import { describe, expect, it, vi } from "vitest";
import {
  CredentialManager,
  type CredentialStore,
} from "../src/auth/credentialStore.js";
import type { Credentials } from "../src/types.js";

function createStore(overrides?: Partial<CredentialStore>): CredentialStore {
  return {
    save: async () => {},
    load: async () => null,
    clear: async () => {},
    ...overrides,
  };
}

describe("CredentialManager", () => {
  it("falls back to local file store when secure store save fails", async () => {
    const credentials: Credentials = {
      clientId: "client-id",
      clientSecret: "client-secret",
    };

    const secureStore = createStore({
      save: vi.fn(async () => {
        throw new Error("secure backend unavailable");
      }),
      clear: vi.fn(async () => {}),
      load: vi.fn(async () => null),
    });

    const fallbackStore = createStore({
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
      load: vi.fn(async () => credentials),
    });

    const manager = new CredentialManager(secureStore, fallbackStore);
    const status = await manager.savePreferSecure(credentials);

    expect(status.backend).toBe("local-file");
    expect(status.detail).toContain("Secure storage unavailable");
    expect(secureStore.save).toHaveBeenCalledWith(credentials);
    expect(fallbackStore.save).toHaveBeenCalledWith(credentials);

    const loaded = await manager.load();
    expect(loaded.backend).toBe("local-file");
    expect(loaded.credentials).toEqual(credentials);
  });
});
