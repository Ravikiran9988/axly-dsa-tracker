const submissionService = require('../services/submissionService');
const aiReviewService = require('../services/aiReviewService');
async function getSubmissions(req,res,next){try{const {question_id,status,review_status,page,limit}=req.query;return res.status(200).json(submissionService.listSubmissions({user:req.user,question_id,status,review_status,page,limit}));}catch(e){next(e);}}
async function submitViaGithub(req,res,next){try{const {question_id,github_url,assignment_id}=req.body;return res.status(200).json({data:await submissionService.submitViaGithub({user_id:req.user.id,question_id,github_url,assignment_id})});}catch(e){next(e);}}
async function reviewSubmission(req,res,next){try{const {review_status,feedback,manual_score,manual_feedback}=req.body;return res.status(200).json({data:submissionService.reviewSubmission({submission_id:req.params.id,reviewer_id:req.user.id,review_status,feedback,manual_score,manual_feedback})});}catch(e){next(e);}}
async function aiReviewSubmission(req,res,next){try{return res.status(200).json({data:await aiReviewService.reviewCode({submission_id:req.params.id})});}catch(e){next(e);}}
async function updateSubmission(req,res,next){try{return res.status(200).json({data:submissionService.updateSubmission({submission_id:req.params.id,user_id:req.user.id,status:req.body.status})});}catch(e){next(e);}}
async function upsertQuestionSubmission(req,res,next){try{return res.status(200).json({data:submissionService.updateSubmission({question_id:req.body.question_id,user_id:req.user.id,status:req.body.status})});}catch(e){next(e);}}
module.exports={getSubmissions,submitViaGithub,reviewSubmission,aiReviewSubmission,updateSubmission,upsertQuestionSubmission};
