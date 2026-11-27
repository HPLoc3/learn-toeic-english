// fake-chat-d1.mjs - D1 giả chạy trên SQLite có sẵn của Node (node:sqlite, Node 22.5+), chỉ dùng cho test và máy chủ thử của Chat Bot.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export function fakeChatD1() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "db", "chat-schema.sql"), "utf8"));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    async first() { return db.prepare(sql).get(...args) ?? null; },
    async run() { return { meta: { changes: Number(db.prepare(sql).run(...args).changes) } }; },
    runSync() { return db.prepare(sql).run(...args); },
  });
  return {
    raw: db,
    prepare: (sql) => stmt(sql),
    async batch(list) {
      db.exec("BEGIN");
      try { for (const s of list) s.runSync(); db.exec("COMMIT"); } catch (e) { db.exec("ROLLBACK"); throw e; }
      return [];
    },
  };
}
