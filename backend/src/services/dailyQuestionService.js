const { getRepository } = require('../db/repositoryFactory');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../middleware/errorHandler');

const repo = getRepository();

function getTodayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

async function getAutoDailyQuestion() {
  const unused = await repo.many(`
    SELECT q.id,q.title,q.difficulty,q.topic_id,t.name AS topic_name,q.url,q.is_active,q.points
    FROM questions q
    LEFT JOIN topics t ON q.topic_id=t.id
    WHERE q.is_active=TRUE AND q.status='published'
      AND NOT EXISTS (SELECT 1 FROM daily_questions dq WHERE dq.question_id=q.id)
    ORDER BY q.created_at ASC,q.id ASC
  `);
  if (unused.length) return unused[0];

  const recycled = await repo.many(`
    SELECT q.id,q.title,q.difficulty,q.topic_id,t.name AS topic_name,q.url,q.is_active,q.points,
      (SELECT MAX(dq.date) FROM daily_questions dq WHERE dq.question_id=q.id) AS last_daily_date
    FROM questions q
    LEFT JOIN topics t ON q.topic_id=t.id
    WHERE q.is_active=TRUE AND q.status='published'
    ORDER BY last_daily_date ASC,q.created_at ASC,q.id ASC
  `);
  return recycled[0] || null;
}

async function getDailyQuestionForDate(date) {
  const scheduled = await repo.one(`
    SELECT dq.id AS daily_question_id,dq.date,dq.created_at AS scheduled_at,
      q.id,q.title,q.difficulty,q.topic_id,t.name AS topic_name,q.url,q.is_active,q.points
    FROM daily_questions dq
    JOIN questions q ON dq.question_id=q.id
    LEFT JOIN topics t ON q.topic_id=t.id
    WHERE dq.date=? AND q.is_active=TRUE AND q.status='published'
  `, [date]);
  return scheduled || getAutoDailyQuestion(date);
}

async function getDailyQuestion(user, targetDate=null) {
  const date = targetDate || getTodayUtcDate();
  const question = await getDailyQuestionForDate(date);
  if (!question) return { data:null, message:'No published questions available for today' };

  const submission = await repo.one(`
    SELECT id,status,attempted_at,started_at,solved_at,final_score
    FROM submissions WHERE user_id=? AND question_id=?
  `, [user.id, question.id]);

  return { data:{
    id:question.id,
    daily_question_id:question.daily_question_id || null,
    date,
    title:question.title,
    difficulty:question.difficulty,
    topic_id:question.topic_id,
    topic_name:question.topic_name,
    url:question.url,
    points:100,
    is_active:Boolean(question.is_active),
    is_assigned_to_me:true,
    is_auto_selected:!question.daily_question_id,
    submission_id:submission?.id || null,
    submission_status:submission?.status || 'not_started',
    attempted_at:submission?.attempted_at || null,
    started_at:submission?.started_at || null,
    solved_at:submission?.solved_at || null,
    final_score:submission?.final_score ?? null
  }};
}

async function setDailyQuestion({question_id,date,admin_id}) {
  const targetDate = date || getTodayUtcDate();
  const question = await repo.one(
    'SELECT id,title,difficulty,is_active,status FROM questions WHERE id=?',
    [question_id]
  );
  if (!question) throw new AppError('Question not found',404,'NOT_FOUND');
  if (!question.is_active || question.status !== 'published') {
    throw new AppError('Only published active questions can be daily challenges',400,'VALIDATION_ERROR','question_id');
  }

  await repo.transaction(async tx => {
    const existing = await tx.one('SELECT id FROM daily_questions WHERE date=?',[targetDate]);
    if (existing) {
      await tx.execute(
        'UPDATE daily_questions SET question_id=?,created_by=?,created_at=CURRENT_TIMESTAMP WHERE date=?',
        [question_id,admin_id,targetDate]
      );
    } else {
      await tx.execute(
        'INSERT INTO daily_questions (id,question_id,date,created_by) VALUES (?,?,?,?)',
        [uuidv4(),question_id,targetDate,admin_id]
      );
    }
  });

  return getDailyQuestion({id:admin_id},targetDate);
}

module.exports={getDailyQuestion,getDailyQuestionForDate,setDailyQuestion,getTodayUtcDate};
