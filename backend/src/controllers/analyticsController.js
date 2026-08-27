const analyticsService=require('../services/analyticsService');
async function getMine(req,res,next){try{return res.json({data:analyticsService.getUserAnalytics(req.user.id)});}catch(e){next(e);}}
module.exports={getMine};
