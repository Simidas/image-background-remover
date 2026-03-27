/** Edge-compatible UUID v4 generation — works in Edge, Node.js, and all browsers */
export function generateId(): string {
  let arr: Uint8Array;
  try {
    if (typeof globalThis !== "undefined" && globalThis.crypto) {
      if (typeof globalThis.crypto.getRandomValues === "function") {
        arr = new Uint8Array(16);
        globalThis.crypto.getRandomValues(arr);
      } else if (typeof globalThis.crypto.randomUUID === "function") {
        return globalThis.crypto.randomUUID();
      } else {
        arr = new Uint8Array(16);
        for (let i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
      }
    } else {
      arr = new Uint8Array(16);
      for (let i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
    }
  } catch {
    arr = new Uint8Array(16);
    for (let i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
