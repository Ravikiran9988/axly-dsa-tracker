/**
 * Phase 4A: database repository contract.
 *
 * All new service database access should depend on these operations rather
 * than on better-sqlite3 or pg directly. Implementations intentionally expose
 * Promise-based APIs so the PostgreSQL adapter can become the production
 * implementation without changing service contracts again.
 */

class RepositoryContract {
  async query(_sql, _params = []) {
    throw new Error('RepositoryContract.query() is not implemented');
  }

  async one(sql, params = []) {
    const result = await this.query(sql, params);
    return result.rows?.[0] ?? null;
  }

  async many(sql, params = []) {
    const result = await this.query(sql, params);
    return result.rows ?? [];
  }

  async execute(_sql, _params = []) {
    throw new Error('RepositoryContract.execute() is not implemented');
  }

  async transaction(_callback) {
    throw new Error('RepositoryContract.transaction() is not implemented');
  }
}

module.exports = RepositoryContract;
