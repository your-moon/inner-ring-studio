import { anyStatementWrites, statementIsWrite } from "./write-detect";

describe("statementIsWrite", () => {
  it.each([
    "SELECT * FROM users",
    "  select 1",
    "EXPLAIN SELECT * FROM t",
    "SHOW TABLES",
    "WITH t AS (SELECT 1) SELECT * FROM t",
    "-- comment\nSELECT 1",
    "/* block */ SELECT 1",
    "",
    "   ",
  ])("reads: %s", (sql) => {
    expect(statementIsWrite(sql)).toBe(false);
  });

  it.each([
    "INSERT INTO t VALUES (1)",
    "update t set a = 1",
    "DELETE FROM t WHERE id = 5",
    "DROP TABLE t",
    "ALTER TABLE t ADD COLUMN x int",
    "TRUNCATE t",
    "CREATE TABLE t (id int)",
    "GRANT ALL ON t TO u",
    "-- prod fix\nDELETE FROM t",
    "/* careful */ UPDATE t SET a = 1",
    "WITH gone AS (DELETE FROM t RETURNING *) SELECT count(*) FROM gone",
    "with x as (select 1) insert into t select * from x",
    "COPY t FROM '/tmp/data.csv'",
  ])("writes: %s", (sql) => {
    expect(statementIsWrite(sql)).toBe(true);
  });
});

describe("anyStatementWrites", () => {
  it("flags a batch containing one write", () => {
    expect(anyStatementWrites(["SELECT 1", "DELETE FROM t"])).toBe(true);
  });
  it("passes a read-only batch", () => {
    expect(anyStatementWrites(["SELECT 1", "SELECT 2"])).toBe(false);
  });
});
