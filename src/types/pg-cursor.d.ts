/**
 * `pg-cursor` ships no type declarations and `@types/pg-cursor` models an older
 * callback-only API. Call sites cast the instance to the promise-style shape
 * they actually use (see src/lib/query-cursor.ts), so only the constructor and
 * the `Submittable` contract need declaring here.
 *
 * `submit` is what makes `client.query(new Cursor(...))` typecheck: pg's
 * `query()` accepts a `Submittable` and hands the cursor the live connection.
 * It is never called by us directly.
 */
declare module "pg-cursor" {
  import type { Connection, Submittable } from "pg";

  export default class Cursor implements Submittable {
    constructor(
      text: string,
      values?: unknown[],
      config?: { rowMode?: "array" | "object" }
    );
    submit(connection: Connection): void;
  }
}
