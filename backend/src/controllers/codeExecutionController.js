const { db } = require('../db/db');
const { v4: uuidv4 } = require('uuid');
const { executeCode } = require('../services/executionService');
const { updateSubmission } = require('../services/submissionService');
const { recordAttempt } = require('../services/scoringService');
const progressService = require('../services/progressService');
const practiceService = require('../services/practiceService');
const { AppError } = require('../middleware/errorHandler');

/** Run code against public/sample test cases or custom input without updating progress. */
async function runCode(req, res, next) {
  try {
    const { question_id, language, source_code, custom_input } = req.body;
    const question = db.prepare('SELECT * FROM questions WHERE id = ? AND is_active = 1').get(question_id);
    if (!question) throw new AppError('Question not found', 404, 'NOT_FOUND');
    let testCasesToRun = [];
    if (custom_input !== undefined && custom_input !== null && custom_input.trim() !== '') testCasesToRun = [{ id:'custom', input:custom_input, expected_output:'', is_hidden:0 }];
    else { testCasesToRun = db.prepare(`SELECT id,input,expected_output,is_hidden FROM test_cases WHERE question_id=? AND is_hidden=0 ORDER BY created_at ASC`).all(question_id); if (testCasesToRun.length===0&&question.example_input) testCasesToRun=[{id:'example-1',input:question.example_input,expected_output:question.example_output||'',is_hidden:0}]; }
    if(testCasesToRun.length===0)testCasesToRun=[{id:'sample',input:'',expected_output:'',is_hidden:0}];
    const execResult=await executeCode({language,sourceCode:source_code,testCases:testCasesToRun,isSubmit:false});
    return res.status(200).json({data:{question_id,language,status:execResult.status,passed_tests:execResult.passed_tests,total_tests:execResult.total_tests,execution_time_ms:execResult.execution_time_ms,results:execResult.results}});
  } catch(err){next(err);}
}

/** Submit against all tests. Practice submissions update practice progress but never competitive scoring. */
async function submitSolution(req,res,next){
  try{
    const {question_id,language,source_code}=req.body;const userId=req.user.id;
    const question=db.prepare('SELECT * FROM questions WHERE id=? AND is_active=1').get(question_id);if(!question)throw new AppError('Question not found',404,'NOT_FOUND');
    let allTestCases=db.prepare(`SELECT id,input,expected_output,is_hidden FROM test_cases WHERE question_id=? ORDER BY is_hidden ASC,created_at ASC`).all(question_id);
    if(allTestCases.length===0&&question.example_input)allTestCases=[{id:'example-1',input:question.example_input,expected_output:question.example_output||'',is_hidden:0}];
    if(allTestCases.length===0)allTestCases=[{id:'sample',input:'',expected_output:'',is_hidden:0}];
    const execResult=await executeCode({language,sourceCode:source_code,testCases:allTestCases,isSubmit:true});
    const isAllPassed=execResult.status==='Accepted'&&execResult.passed_tests===allTestCases.length;
    const newSubmissionStatus=isAllPassed?'solved':'attempted';
    let updatedSubmission=null;
    if(question.is_practice){
      // Practice has no competitive score, streak points, or leaderboard impact.
      const logId=uuidv4();
      db.prepare(`INSERT INTO code_submissions_log (id,user_id,question_id,language,source_code,status,passed_tests,total_tests,execution_time_ms) VALUES (?,?,?,?,?,?,?,?,?)`).run(logId,userId,question_id,language,source_code,execResult.status,execResult.passed_tests,allTestCases.length,execResult.execution_time_ms);
      practiceService.recordPracticeSubmission({user:req.user,questionId:question_id,submissionId:logId,passed:isAllPassed});
      const practice=practiceService.getPracticeProblem({user:req.user,questionId:question_id});
      return res.status(200).json({data:{submission_id:logId,question_id,language,status:execResult.status,passed_tests:execResult.passed_tests,total_tests:allTestCases.length,execution_time_ms:execResult.execution_time_ms,submission_status:practice.practice_status,results:execResult.results,scoring:null,practice_progress:practice}});
    }
    recordAttempt({userId,questionId:question_id,passedTests:execResult.passed_tests,totalTests:allTestCases.length,executionTimeMs:execResult.execution_time_ms,solved:isAllPassed});
    const currentSub=db.prepare('SELECT status FROM submissions WHERE user_id=? AND question_id=?').get(userId,question_id);
    const finalStatus=(['solved','approved','completed'].includes(currentSub?.status)&&!isAllPassed)?currentSub.status:newSubmissionStatus;
    updatedSubmission=updateSubmission({question_id,user_id:userId,status:finalStatus});
    db.prepare(`UPDATE submissions SET language=?,source_code=?,passed_tests=?,total_tests=?,execution_time_ms=? WHERE user_id=? AND question_id=?`).run(language,source_code,execResult.passed_tests,allTestCases.length,execResult.execution_time_ms,userId,question_id);
    const logId=uuidv4();db.prepare(`INSERT INTO code_submissions_log (id,user_id,question_id,language,source_code,status,passed_tests,total_tests,execution_time_ms) VALUES (?,?,?,?,?,?,?,?,?)`).run(logId,userId,question_id,language,source_code,execResult.status,execResult.passed_tests,allTestCases.length,execResult.execution_time_ms);
    const progress=progressService.getUserProgress(userId);const refreshed=db.prepare('SELECT * FROM submissions WHERE user_id=? AND question_id=?').get(userId,question_id);
    return res.status(200).json({data:{submission_id:logId,question_id,language,status:execResult.status,passed_tests:execResult.passed_tests,total_tests:allTestCases.length,execution_time_ms:execResult.execution_time_ms,submission_status:finalStatus,results:execResult.results,scoring:{test_score:refreshed.test_score,time_score:refreshed.time_score,attempt_score:refreshed.attempt_score,final_score:refreshed.final_score,attempt_count:refreshed.attempt_count,solve_duration_seconds:refreshed.solve_duration_seconds,score_max:100},progress}});
  }catch(err){next(err);}
}
async function getSubmissionsHistory(req,res,next){try{const{question_id}=req.params;const userId=req.user.id;const history=db.prepare(`SELECT id,question_id,language,source_code,status,passed_tests,total_tests,execution_time_ms,created_at FROM code_submissions_log WHERE user_id=? AND question_id=? ORDER BY created_at DESC LIMIT 50`).all(userId,question_id);return res.status(200).json({data:history});}catch(err){next(err);}}
module.exports={runCode,submitSolution,getSubmissionsHistory};
