const RepositoryContract = require('./repositoryContract');
const { pool } = require('./postgres');

/** PostgreSQL implementation of the Phase 4 repository contract. */
class PostgresRepository extends RepositoryContract {
  constructor(pgPool = pool) {
    super();
    if (!pgPool) throw new Error('PostgreSQL pool is not configured');
    this.pool = pgPool;
  }

  async query(sql, params = []) {
    return this.pool.query(sql, params);
  }

  async execute(sql, params = []) {
    const result = await this.pool.query(sql, params);
    return { rowCount: result.rowCount, rows: result.rows };
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
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = PostgresRepository;
