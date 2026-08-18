import { SavedConnectionRawLocalStorage } from "@/app/(theme)/connect/saved-connection-storage";
import { DatabaseResultSet, QueryableBaseDriver } from "@/drivers/base-driver";

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

  async query(stmt: string): Promise<DatabaseResultSet> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connection: this.connectionConfig(), sql: stmt }),
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(json.error ?? `Query failed (${res.status})`);
    }
    return json.result as DatabaseResultSet;
  }

  async transaction(stmts: string[]): Promise<DatabaseResultSet[]> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        connection: this.connectionConfig(),
        statements: stmts,
      }),
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(json.error ?? `Transaction failed (${res.status})`);
    }
    return json.results as DatabaseResultSet[];
  }
}
