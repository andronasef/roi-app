/** Generate an RFC 9562 UUIDv7 string from epoch milliseconds and an injected CSPRNG. */
export function uuidv7(now: number, rand: (n: number) => Uint8Array): string {
  if (!Number.isFinite(now) || now < 0) {
    throw new RangeError('uuidv7: now must be a non-negative finite number');
  }
  const bytes = Uint8Array.from(rand(16));
  if (bytes.length < 16) {
    throw new RangeError('uuidv7: rand(16) must return at least 16 bytes');
  }

  let ts = Math.floor(now);
  for (let i = 5; i >= 0; i--) {
    bytes[i] = ts % 256;
    ts = Math.floor(ts / 256);
  }

  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = Array.from(bytes.subarray(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
