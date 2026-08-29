const RepositoryContract = require('./repositoryContract');
const { pool } = require('./postgres');

/**
 * PostgreSQL implementation of the Phase 4 repository contract.
 * Used in production and production-like environments.
 */
class PostgresRepository extends RepositoryContract {
  constructor(pgPool = pool) {
    super();
    if (!pgPool) throw new Error('PostgreSQL pool is not configured');
    this.pool = pgPool;
  }

  formatSql(sql) {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
  }

  async query(sql, params = []) {
    const postgresSql = this.formatSql(sql);
    return this.pool.query(postgresSql, params);
  }

  async one(sql, params = []) {
    const result = await this.query(sql, params);
    return result.rows?.[0] ?? null;
  }

  async many(sql, params = []) {
    const result = await this.query(sql, params);
    return result.rows ?? [];
  }

  async execute(sql, params = []) {
    const result = await this.query(sql, params);
    return { rowCount: result.rowCount, changes: result.rowCount, rows: result.rows };
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const tx = new PostgresRepository(client);
      const value = await callback(tx);
      await client.query('COMMIT');
      return value;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = PostgresRepository;
