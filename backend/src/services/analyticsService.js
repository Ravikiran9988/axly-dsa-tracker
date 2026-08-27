const { db } = require('../db/db');

function getUserAnalytics(userId) {
  const summary = db.prepare(`SELECT COUNT(*) total_submissions, SUM(CASE WHEN status='solved' THEN 1 ELSE 0 END) solved_submissions, ROUND(AVG(score),2) average_score, ROUND(AVG(time_taken_seconds),2) average_time_seconds FROM submissions WHERE user_id=?`).get(userId) || {};
  const difficulty = db.prepare(`SELECT q.difficulty, COUNT(s.id) attempts, SUM(CASE WHEN s.status='solved' THEN 1 ELSE 0 END) solved, ROUND(AVG(s.score),2) average_score FROM submissions s JOIN questions q ON q.id=s.question_id WHERE s.user_id=? GROUP BY q.difficulty`).all(userId);
  const topics = db.prepare(`SELECT COALESCE(NULLIF(q.topic_id,''),'Uncategorized') topic, COUNT(s.id) attempts, SUM(CASE WHEN s.status='solved' THEN 1 ELSE 0 END) solved, ROUND(AVG(s.score),2) average_score FROM submissions s JOIN questions q ON q.id=s.question_id WHERE s.user_id=? GROUP BY COALESCE(NULLIF(q.topic_id,''),'Uncategorized') ORDER BY average_score ASC`).all(userId).map(r=>({...r,success_percentage:r.attempts?Math.round(r.solved/r.attempts*100):0}));
  const activity = db.prepare(`SELECT DATE(COALESCE(s.solved_at,s.attempted_at)) date, COUNT(*) submissions, SUM(CASE WHEN s.status='solved' THEN 1 ELSE 0 END) solved FROM submissions s WHERE s.user_id=? GROUP BY DATE(COALESCE(s.solved_at,s.attempted_at)) ORDER BY date DESC LIMIT 30`).all(userId);
  return {summary:{total_submissions:Number(summary.total_submissions||0),solved_submissions:Number(summary.solved_submissions||0),average_score:Number(summary.average_score||0),average_time_seconds:Number(summary.average_time_seconds||0),success_percentage:summary.total_submissions?Math.round(summary.solved_submissions/summary.total_submissions*100):0},difficulty_breakdown:difficulty,topic_breakdown:topics,weak_topics:topics.filter(t=>Number(t.attempts)>=2&&Number(t.success_percentage)<60).slice(0,5),activity};
}
module.exports={getUserAnalytics};
