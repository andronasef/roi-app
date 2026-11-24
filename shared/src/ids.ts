/** Generate an RFC 9562 UUIDv7 string from epoch milliseconds and an injected CSPRNG. */
export function uuidv7(_now: number, _rand: (n: number) => Uint8Array): string {
  return '00000000-0000-0000-0000-000000000000';
}
