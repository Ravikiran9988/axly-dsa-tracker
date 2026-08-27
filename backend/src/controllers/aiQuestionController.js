const { generateQuestion } = require('../services/aiQuestionService');
async function generate(req,res,next){try{const {topic,difficulty,language,count}=req.body; const data=await generateQuestion({topic,difficulty,language,count}); return res.status(200).json({data});}catch(e){next(e);}}
module.exports={generate};
