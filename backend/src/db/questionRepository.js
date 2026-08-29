const { getDatabaseDriver, getSqlite, getPostgres } = require('./repository');

function normalize(row) {
  if (!row) return row;
  const copy = { ...row };
  for (const key of ['starter_code', 'supported_languages', 'tags']) {
    if (copy[key] && typeof copy[key] === 'string') {
      try { copy[key] = JSON.parse(copy[key]); } catch (_) {}
    }
  }
  if (copy.is_active !== undefined) copy.is_active = Boolean(copy.is_active);
  if (copy.is_hidden !== undefined) copy.is_hidden = Boolean(copy.is_hidden);
  return copy;
}

function questionRepository() {
  const driver = getDatabaseDriver();
  if (driver === 'sqlite') {
    const db = getSqlite();
    return {
      async findById(id) { return normalize(db.prepare('SELECT q.*, t.name AS topic_name FROM questions q LEFT JOIN topics t ON q.topic_id=t.id WHERE q.id=?').get(id)); },
      async findTopic(id) { return db.prepare('SELECT id FROM topics WHERE id=?').get(id); },
      async findDuplicateTitle(title, excludeId = null) {
        return excludeId
          ? db.prepare('SELECT id FROM questions WHERE LOWER(title)=LOWER(?) AND id!=? AND is_active=1').get(title, excludeId)
          : db.prepare('SELECT id FROM questions WHERE LOWER(title)=LOWER(?) AND is_active=1').get(title);
      },
      async listTestCases(questionId, includeHidden) {
        const sql = includeHidden ? 'SELECT id,input,expected_output,is_hidden FROM test_cases WHERE question_id=? ORDER BY is_hidden ASC,created_at ASC' : 'SELECT id,input,expected_output,is_hidden FROM test_cases WHERE question_id=? AND is_hidden=0 ORDER BY created_at ASC';
        return db.prepare(sql).all(questionId).map(normalize);
      },
      async findSubmission(questionId, userId) { return db.prepare('SELECT * FROM submissions WHERE question_id=? AND user_id=?').get(questionId, userId); },
      async insertTestCases(questionId, cases) { const insert=db.prepare('INSERT INTO test_cases (id,question_id,input,expected_output,is_hidden) VALUES (?,?,?,?,?)'); for(const tc of cases||[]) if(tc) insert.run(tc.id||require('uuid').v4(),questionId,String(tc.input||''),String(tc.expected_output||''),tc.is_hidden?1:0); },
      async execute(sql, params=[]) { return db.prepare(sql).run(...params); },
      async all(sql, params=[]) { return db.prepare(sql).all(...params); },
      async get(sql, params=[]) { return db.prepare(sql).get(...params); },
      async transaction(fn) { return db.transaction(fn)(); }
    };
  }

  const pool = getPostgres();
  const q = async (text, params=[]) => (await pool.query(text, params)).rows;
  return {
    async findById(id) { return normalize((await q('SELECT q.*, t.name AS topic_name FROM questions q LEFT JOIN topics t ON q.topic_id=t.id WHERE q.id=$1',[id]))[0]); },
    async findTopic(id) { return (await q('SELECT id FROM topics WHERE id=$1',[id]))[0]; },
    async findDuplicateTitle(title, excludeId=null) { const rows=await q(excludeId?'SELECT id FROM questions WHERE LOWER(title)=LOWER($1) AND id<>$2 AND is_active=true':'SELECT id FROM questions WHERE LOWER(title)=LOWER($1) AND is_active=true',excludeId?[title,excludeId]:[title]); return rows[0]; },
    async listTestCases(questionId, includeHidden) { return (await q(includeHidden?'SELECT id,input,expected_output,is_hidden FROM test_cases WHERE question_id=$1 ORDER BY is_hidden ASC,created_at ASC':'SELECT id,input,expected_output,is_hidden FROM test_cases WHERE question_id=$1 AND is_hidden=false ORDER BY created_at ASC',[questionId])).map(normalize); },
    async findSubmission(questionId,userId) { return (await q('SELECT * FROM submissions WHERE question_id=$1 AND user_id=$2',[questionId,userId]))[0]; },
    async insertTestCases(questionId,cases) { for(const tc of cases||[]) if(tc) await q('INSERT INTO test_cases (id,question_id,input,expected_output,is_hidden) VALUES ($1,$2,$3,$4,$5)',[tc.id||require('uuid').v4(),questionId,String(tc.input||''),String(tc.expected_output||''),!!tc.is_hidden]); },
    async execute(sql,params=[]) { return pool.query(sql.replace(/\?/g,()=>`$${params.indexOf(arguments[0])+1}`),params); },
    async all(sql,params=[]) { return q(sql,params); },
    async get(sql,params=[]) { return (await q(sql,params))[0]; },
    async transaction(fn) { const client=await pool.connect(); try { await client.query('BEGIN'); const result=await fn(client); await client.query('COMMIT'); return result; } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); } }
  };
}

module.exports = { questionRepository };
