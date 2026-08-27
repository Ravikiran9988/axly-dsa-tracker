const { db } = require('../db/db');

function getRecommendations(userId, limit = 8) {
  const safeLimit = Math.min(Math.max(Number(limit) || 8, 1), 20);
  const rows = db.prepare(`
    SELECT q.id, q.title, q.difficulty, q.topic_id
    FROM questions q
    WHERE q.is_active = 1
      AND NOT EXISTS (SELECT 1 FROM submissions s WHERE s.question_id=q.id AND s.user_id=? AND s.status='solved')
    ORDER BY CASE q.difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 WHEN 'hard' THEN 3 ELSE 4 END, q.created_at DESC
    LIMIT ?
  `).all(userId, safeLimit);
  return rows.map((q, i) => ({ ...q, reason: i < 3 ? 'Good next practice based on your current activity' : 'Continue building problem-solving consistency' }));
}

function getAchievements(userId) {
  const solved = db.prepare("SELECT COUNT(*) AS n FROM submissions WHERE user_id=? AND status='solved'").get(userId).n;
  const perfect = db.prepare("SELECT COUNT(*) AS n FROM submissions WHERE user_id=? AND status='solved' AND score>=100").get(userId).n;
  const achievements=[];
  const add=(id,title,description,unlocked,progress,target)=>achievements.push({id,title,description,unlocked,progress,target});
  add('first-solve','First Solve','Solve your first problem',solved>=1,Math.min(solved,1),1);
  add('ten-solves','10 Problems','Solve 10 problems',solved>=10,Math.min(solved,10),10);
  add('fifty-solves','50 Problems','Solve 50 problems',solved>=50,Math.min(solved,50),50);
  add('perfect-score','Perfect Score','Earn a 100 score',perfect>=1,Math.min(perfect,1),1);
  return { achievements, solved_count:Number(solved), perfect_score_count:Number(perfect) };
}
module.exports={getRecommendations,getAchievements};
