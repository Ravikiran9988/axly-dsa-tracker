const service=require('../services/recommendationService');
async function recommendations(req,res,next){try{return res.json({data:service.getRecommendations(req.user.id,req.query.limit)});}catch(e){next(e);}}
async function achievements(req,res,next){try{return res.json({data:service.getAchievements(req.user.id)});}catch(e){next(e);}}
module.exports={recommendations,achievements};
