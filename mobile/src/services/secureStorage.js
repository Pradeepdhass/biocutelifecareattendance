import * as SecureStore from 'expo-secure-store';

/**
 * Hardware-backed secure storage wrapper (iOS Keychain / Android Keystore)
 * with chunking for large payloads (>1800 bytes), key sanitization for Firebase keys,
 * and localStorage / memory fallback when SecureStore is unavailable (e.g., Expo web).
 */
const memoryFallback = new Map();
const CHUNK_SIZE = 1800;

function sanitizeKey(rawKey) {
  return String(rawKey).replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function isSecureStoreAvailable() {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

function getWebStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Ignore restricted storage
  }
  return null;
}

export async function setSecureItem(key, value) {
  const safeKey = sanitizeKey(key);
  const stringValue = String(value);

  if (await isSecureStoreAvailable()) {
    const options = {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    };

    // Clean up any prior chunk metadata first
    await deleteSecureItem(key);

    if (stringValue.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(safeKey, stringValue, options);
      return;
    }

    const totalChunks = Math.ceil(stringValue.length / CHUNK_SIZE);
    await SecureStore.setItemAsync(
      safeKey,
      `__BCLC_CHUNKED__:${totalChunks}`,
      options
    );
    for (let i = 0; i < totalChunks; i += 1) {
      const slice = stringValue.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await SecureStore.setItemAsync(`${safeKey}.c${i}`, slice, options);
    }
    return;
  }

  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem(safeKey, stringValue);
    return;
  }
  memoryFallback.set(safeKey, stringValue);
}

export async function getSecureItem(key) {
  const safeKey = sanitizeKey(key);

  if (await isSecureStoreAvailable()) {
    const raw = await SecureStore.getItemAsync(safeKey);
    if (raw == null) return null;

    if (raw.startsWith('__BCLC_CHUNKED__:')) {
      const totalChunks = Number(raw.split(':')[1] || 0);
      if (!Number.isFinite(totalChunks) || totalChunks <= 0) return null;
      const parts = [];
      for (let i = 0; i < totalChunks; i += 1) {
        const part = await SecureStore.getItemAsync(`${safeKey}.c${i}`);
        if (part == null) return null;
        parts.push(part);
      }
      return parts.join('');
    }
    return raw;
  }

  const webStorage = getWebStorage();
  if (webStorage) {
    return webStorage.getItem(safeKey);
  }
  return memoryFallback.get(safeKey) ?? null;
}

export async function deleteSecureItem(key) {
  const safeKey = sanitizeKey(key);

  if (await isSecureStoreAvailable()) {
    const existing = await SecureStore.getItemAsync(safeKey).catch(() => null);
    if (existing && existing.startsWith('__BCLC_CHUNKED__:')) {
      const totalChunks = Number(existing.split(':')[1] || 0);
      for (let i = 0; i < totalChunks; i += 1) {
        await SecureStore.deleteItemAsync(`${safeKey}.c${i}`).catch(() => {});
      }
    }
    await SecureStore.deleteItemAsync(safeKey).catch(() => {});
    return;
  }

  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.removeItem(safeKey);
    return;
  }
  memoryFallback.delete(safeKey);
}

/**
 * AsyncStorage-compatible adapter backed by iOS Keychain / Android Keystore
 * so Firebase Auth stays signed in permanently until manual logout.
 */
export const firebaseSecureStorageAdapter = {
  getItem: (key) => getSecureItem(key),
  setItem: (key, value) => setSecureItem(key, value),
  removeItem: (key) => deleteSecureItem(key),
};
