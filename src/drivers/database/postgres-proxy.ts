import { SavedConnectionRawLocalStorage } from "@/app/(theme)/connect/saved-connection-storage";
import {
  DatabasePage,
  DatabaseResultSet,
  QueryableBaseDriver,
} from "@/drivers/base-driver";

/**
 * QueryableBaseDriver transport for a self-hosted Postgres, reached through our
 * own backend proxy route (`/api/query`). The browser cannot open a TCP socket
 * to Postgres directly, so every statement is POSTed to the Next.js API route,
 * which runs it via node-postgres and returns a DatabaseResultSet.
 *
 * NOTE (milestone 2): the connection config (incl. password) is sent with each
 * request. This is replaced by a server-side encrypted vault + connection id in
 * a later milestone; the browser will then send only a connection id.
 */
export class PostgresProxyQueryable implements QueryableBaseDriver {
  constructor(
    protected endpoint: string,
    protected conn: SavedConnectionRawLocalStorage
  ) {}

  protected connectionConfig() {
    return {
      host: this.conn.host,
      port: this.conn.port ? Number(this.conn.port) : 5432,
      database: this.conn.database,
      user: this.conn.username,
      password: this.conn.password,
      ssl: this.conn.ssl ?? false,
    };
  }

  /**
   * Vault-backed connections send only their vault id; the server resolves the
   * password. Manual (form) connections send the inline config as a fallback.
   */
  protected requestBody(payload: Record<string, unknown>) {
    return this.conn.vault_id
      ? { connectionId: this.conn.vault_id, ...payload }
      : { connection: this.connectionConfig(), ...payload };
  }

  async query(stmt: string): Promise<DatabaseResultSet> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.requestBody({ sql: stmt })),
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(json.error ?? `Query failed (${res.status})`);
    }
    return json.result as DatabaseResultSet;
  }

  /** First page of a read query, holding a server cursor for `fetchMorePage`. */
  async queryPaginated(
    stmt: string,
    pageSize: number
  ): Promise<DatabaseResultSet> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.requestBody({ sql: stmt, paginate: pageSize })),
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(json.error ?? `Query failed (${res.status})`);
    }
    const result = json.result as DatabaseResultSet;
    result.cursorId = json.cursorId ?? null;
    result.hasMore = Boolean(json.hasMore);
    return result;
  }

  /** Next page of rows from a held cursor opened by `queryPaginated`. */
  async fetchMorePage(cursorId: string, pageSize: number): Promise<DatabasePage> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.requestBody({ cursorId, fetchMore: pageSize })),
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(json.error ?? `Fetch failed (${res.status})`);
    }
    return {
      rows: (json.rows ?? []) as DatabasePage["rows"],
      hasMore: Boolean(json.hasMore),
      expired: Boolean(json.expired),
    };
  }

  /** Release a held cursor (best-effort; ignored if already gone). */
  async closePage(cursorId: string): Promise<void> {
    await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.requestBody({ closeCursorId: cursorId })),
    }).catch(() => {});
  }

  async transaction(stmts: string[]): Promise<DatabaseResultSet[]> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.requestBody({ statements: stmts })),
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(json.error ?? `Transaction failed (${res.status})`);
    }
    return json.results as DatabaseResultSet[];
  }
}
