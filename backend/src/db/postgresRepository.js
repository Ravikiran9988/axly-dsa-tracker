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
    let formatted = sql
      .replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP')
      .replace(/\(q\.is_active\s*=\s*1\s*OR\s*q\.is_active\s*=\s*TRUE\)/gi, 'q.is_active = TRUE')
      .replace(/\(q\.is_practice\s*=\s*1\s*OR\s*q\.is_practice\s*=\s*TRUE\)/gi, 'q.is_practice = TRUE')
      .replace(/\(is_active\s*=\s*1\s*OR\s*is_active\s*=\s*TRUE\)/gi, 'is_active = TRUE')
      .replace(/\(is_practice\s*=\s*1\s*OR\s*is_practice\s*=\s*TRUE\)/gi, 'is_practice = TRUE')
      .replace(/\(dc\.is_active\s*=\s*1\s*OR\s*dc\.is_active\s*=\s*TRUE\)/gi, 'dc.is_active = TRUE')
      .replace(/\b(is_active|is_practice|email_verified|is_read|is_hidden)\s*=\s*1\b/gi, '$1 = TRUE')
      .replace(/\b(is_active|is_practice|email_verified|is_read|is_hidden)\s*=\s*0\b/gi, '$1 = FALSE')
      .replace(/\b(dc|q|u|s)\.(is_active|is_practice|email_verified|is_read|is_hidden)\s*=\s*1\b/gi, '$1.$2 = TRUE')
      .replace(/\b(dc|q|u|s)\.(is_active|is_practice|email_verified|is_read|is_hidden)\s*=\s*0\b/gi, '$1.$2 = FALSE')
      .replace(/EXCLUDED\.email_verified\s*=\s*1/gi, 'EXCLUDED.email_verified = TRUE');

    return formatted.replace(/\?/g, () => `$${++index}`);
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
