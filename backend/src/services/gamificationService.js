const { db } = require('../db/db');
const { refreshCompetitiveRanks } = require('./leaderboardService');

function todayUtc() { return new Date().toISOString().slice(0,10); }
function dailyQuestionForDate(date) {
  const explicit=db.prepare('SELECT question_id FROM daily_questions WHERE date=?').get(date);
  if(explicit) return explicit.question_id;
  const questions=db.prepare(`SELECT id FROM questions WHERE is_active=1 AND status='published' ORDER BY created_at ASC,id ASC`).all();
  if(!questions.length) return null;
  const day=Math.floor(Date.parse(`${date}T00:00:00Z`)/86400000);
  return questions[((day%questions.length)+questions.length)%questions.length].id;
}
function awardSolve(userId,questionId,startedAt=null) {
  const user=db.prepare('SELECT id,points,streak,longest_streak,last_active_at FROM users WHERE id=?').get(userId);
  if(!user) return null;
  const startDate=startedAt?String(startedAt).slice(0,10):todayUtc();
  if(dailyQuestionForDate(startDate)!==questionId) return null;
  const already=db.prepare(`SELECT id FROM code_submissions_log WHERE user_id=? AND question_id=? AND status IN ('Accepted','approved','Approved') LIMIT 1`).get(userId,questionId);
  const today=todayUtc(); const last=user.last_active_at?String(user.last_active_at).slice(0,10):null;
  let streak=Number(user.streak||0);
  if(last===today){} else if(last){const days=Math.round((Date.parse(`${today}T00:00:00Z`)-Date.parse(`${last}T00:00:00Z`))/86400000);streak=days===1?streak+1:1;} else streak=1;
  const longest=Math.max(Number(user.longest_streak||0),streak);
  const nextPoints=already?Number(user.points||0):Number(user.points||0)+100;
  db.prepare('UPDATE users SET points=?,streak=?,longest_streak=?,last_active_at=? WHERE id=?').run(nextPoints,streak,longest,new Date().toISOString(),userId);
  refreshCompetitiveRanks();
  return {points:nextPoints,streak,longest_streak:longest};
}
module.exports={awardSolve,refreshCompetitiveRanks};
