const RepositoryContract = require('./repositoryContract');
const { db } = require('./db');

/**
 * SQLite implementation of RepositoryContract for local/test environments.
 * It provides full Promise-based parity with the PostgreSQL adapter.
 */
class SqliteRepository extends RepositoryContract {
  constructor(sqliteDb = db) {
    super();
    this.db = sqliteDb;
  }

  async query(sql, params = []) {
    const statement = this.db.prepare(sql);
    const rows = statement.all(...params);
    return { rows, rowCount: rows.length };
  }

  async one(sql, params = []) {
    const statement = this.db.prepare(sql);
    const row = statement.get(...params);
    return row ?? null;
  }

  async many(sql, params = []) {
    const statement = this.db.prepare(sql);
    return statement.all(...params) ?? [];
  }

  async execute(sql, params = []) {
    const statement = this.db.prepare(sql);
    const result = statement.run(...params);
    return {
      rowCount: result.changes,
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid
    };
  }

  async transaction(callback) {
    this.db.exec('BEGIN');
    try {
      const result = await callback(this);
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      try {
        this.db.exec('ROLLBACK');
      } catch (_) {}
      throw error;
    }
  }
}

module.exports = SqliteRepository;
