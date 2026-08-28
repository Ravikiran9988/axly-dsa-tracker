const { db } = require('../db/db');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../middleware/errorHandler');

function getTodayUtcDate() { return new Date().toISOString().slice(0,10); }

function getAutoDailyQuestion(date) {
  const questions = db.prepare(`SELECT q.id,q.title,q.difficulty,q.topic_id,t.name AS topic_name,q.url,q.is_active,q.points
    FROM questions q LEFT JOIN topics t ON q.topic_id=t.id
    WHERE q.is_active=1 AND q.status='published'
      AND NOT EXISTS (SELECT 1 FROM daily_questions used WHERE used.question_id=q.id)
    ORDER BY q.created_at ASC,q.id ASC`).all();
  // If every published question has already been used, start a new rotation.
  const pool = questions.length ? questions : db.prepare(`SELECT q.id,q.title,q.difficulty,q.topic_id,t.name AS topic_name,q.url,q.is_active,q.points
    FROM questions q LEFT JOIN topics t ON q.topic_id=t.id
    WHERE q.is_active=1 AND q.status='published' ORDER BY q.created_at ASC,q.id ASC`).all();
  if(!pool.length) return null;
  const epochDays=Math.floor(Date.parse(`${date}T00:00:00Z`)/86400000);
  return pool[((epochDays%pool.length)+pool.length)%pool.length];
}

function getDailyQuestion(user,targetDate=null) {
  const date=targetDate||getTodayUtcDate();
  const scheduled=db.prepare(`SELECT dq.id AS daily_question_id,dq.date,dq.created_at AS scheduled_at,q.id,q.title,q.difficulty,q.topic_id,t.name AS topic_name,q.url,q.is_active,q.points
    FROM daily_questions dq JOIN questions q ON dq.question_id=q.id LEFT JOIN topics t ON q.topic_id=t.id
    WHERE dq.date=? AND q.is_active=1 AND q.status='published'`).get(date);
  const question=scheduled||getAutoDailyQuestion(date);
  if(!question) return {data:null,message:'No published questions available for today'};
  const submission=db.prepare(`SELECT id,status,attempted_at,solved_at,final_score FROM submissions WHERE user_id=? AND question_id=?`).get(user.id,question.id);
  return {data:{id:question.id,daily_question_id:question.daily_question_id||null,date,title:question.title,difficulty:question.difficulty,topic_id:question.topic_id,topic_name:question.topic_name,url:question.url,points:100,is_active:Boolean(question.is_active),is_assigned_to_me:true,is_auto_selected:!scheduled,submission_id:submission?.id||null,submission_status:submission?.status||'not_started',attempted_at:submission?.attempted_at||null,solved_at:submission?.solved_at||null,final_score:submission?.final_score??null}};
}

function setDailyQuestion({question_id,date,admin_id}) {
  const targetDate=date||getTodayUtcDate();
  const question=db.prepare('SELECT id,title,difficulty,is_active,status FROM questions WHERE id=?').get(question_id);
  if(!question) throw new AppError('Question not found',404,'NOT_FOUND');
  if(!question.is_active||question.status!=='published') throw new AppError('Only published active questions can be daily challenges',400,'VALIDATION_ERROR','question_id');
  const existing=db.prepare('SELECT id FROM daily_questions WHERE date=?').get(targetDate);
  if(existing) db.prepare("UPDATE daily_questions SET question_id=?,created_by=?,created_at=datetime('now') WHERE date=?").run(question_id,admin_id,targetDate);
  else db.prepare('INSERT INTO daily_questions (id,question_id,date,created_by) VALUES (?,?,?,?)').run(uuidv4(),question_id,targetDate,admin_id);
  return getDailyQuestion({id:admin_id},targetDate);
}

module.exports={getDailyQuestion,setDailyQuestion,getTodayUtcDate};
