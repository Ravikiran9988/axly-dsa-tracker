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

  _mapParams(params) {
    return params.map(p => {
      if (typeof p === 'boolean') return p ? 1 : 0;
      if (Array.isArray(p)) return JSON.stringify(p);
      if (p !== null && typeof p === 'object' && !(p instanceof Date)) return JSON.stringify(p);
      return p;
    });
  }

  async query(sql, params = []) {
    const statement = this.db.prepare(sql);
    const rows = statement.all(...this._mapParams(params));
    return { rows, rowCount: rows.length };
  }

  async one(sql, params = []) {
    const statement = this.db.prepare(sql);
    const row = statement.get(...this._mapParams(params));
    return row ?? null;
  }

  async many(sql, params = []) {
    const statement = this.db.prepare(sql);
    return statement.all(...this._mapParams(params)) ?? [];
  }

  async execute(sql, params = []) {
    const statement = this.db.prepare(sql);
    try {
      const result = statement.run(...this._mapParams(params));
      return {
        rowCount: result.changes,
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid
      };
    } catch (err) {
      require('fs').appendFileSync('sql_debug.log', `Error: ${err.message}\nSQL placeholders: ${(sql.match(/\\?/g) || []).length}\nParams length: ${params.length}\n`);
      throw err;
    }
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
