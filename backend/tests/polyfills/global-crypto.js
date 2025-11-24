import { randomFillSync, webcrypto } from 'node:crypto';

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto ? { ...webcrypto } : {};
}

if (webcrypto && typeof globalThis.crypto.subtle !== 'object') {
  globalThis.crypto.subtle = webcrypto.subtle;
}

if (typeof globalThis.crypto.getRandomValues !== 'function') {
  globalThis.crypto.getRandomValues = (typedArray) => {
    if (
      !typedArray ||
      typeof typedArray.length !== 'number' ||
      typeof typedArray.BYTES_PER_ELEMENT !== 'number'
    ) {
      throw new TypeError('Expected a typed array in crypto.getRandomValues polyfill.');
    }
    return randomFillSync(typedArray);
  };
}



