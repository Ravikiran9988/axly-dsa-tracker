const submissionService = require('../services/submissionService');

async function getSubmissions(req, res, next) { try { const { question_id,status,review_status,page,limit }=req.query; return res.status(200).json(submissionService.listSubmissions({user:req.user,question_id,status,review_status,page,limit})); } catch(err){ next(err); } }
async function submitViaGithub(req,res,next){ try { const {question_id,github_url,assignment_id}=req.body; return res.status(200).json({data:await submissionService.submitViaGithub({user_id:req.user.id,question_id,github_url,assignment_id})}); } catch(err){next(err);} }
async function reviewSubmission(req,res,next){ try { const {review_status,feedback,manual_score,manual_feedback}=req.body; return res.status(200).json({data:submissionService.reviewSubmission({submission_id:req.params.id,reviewer_id:req.user.id,review_status,feedback,manual_score,manual_feedback})}); } catch(err){next(err);} }
async function updateSubmission(req,res,next){ try { const {status}=req.body; return res.status(200).json({data:submissionService.updateSubmission({submission_id:req.params.id,user_id:req.user.id,status})}); } catch(err){next(err);} }
async function upsertQuestionSubmission(req,res,next){ try { const {question_id,status}=req.body; return res.status(200).json({data:submissionService.updateSubmission({question_id,user_id:req.user.id,status})}); } catch(err){next(err);} }
module.exports={getSubmissions,submitViaGithub,reviewSubmission,updateSubmission,upsertQuestionSubmission};
