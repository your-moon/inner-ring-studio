/**
 * `pg-cursor` ships no type declarations and `@types/pg-cursor` models an older
 * callback-only API. Call sites cast the instance to the promise-style shape
 * they use (see src/lib/query-cursor.ts), so this only needs the constructor.
 */
declare module "pg-cursor" {
  export default class Cursor {
    constructor(
      text: string,
      values?: unknown[],
      config?: { rowMode?: "array" | "object" }
    );
  }
}
