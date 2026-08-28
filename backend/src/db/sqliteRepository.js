const RepositoryContract = require('./repositoryContract');
const { db } = require('./db');

/**
 * Compatibility adapter used while Phase 4 migrates services incrementally.
 * It exposes Promise-based methods while retaining SQLite's current runtime.
 */
class SqliteRepository extends RepositoryContract {
  async query(sql, params = []) {
    const statement = db.prepare(sql);
    const rows = statement.all(...params);
    return { rows, rowCount: rows.length };
  }

  async one(sql, params = []) {
    return db.prepare(sql).get(...params) ?? null;
  }

  async execute(sql, params = []) {
    const result = db.prepare(sql).run(...params);
    return { rowCount: result.changes, changes: result.changes, lastInsertRowid: result.lastInsertRowid };
  }

  async transaction(callback) {
    const transaction = db.transaction(() => callback(this));
    return transaction();
  }
}

module.exports = SqliteRepository;
