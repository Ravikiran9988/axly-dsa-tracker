const express=require('express');
const router=express.Router();
const {authenticate}=require('../middleware/auth');
const {requireRole}=require('../middleware/rbac');
const {generate}=require('../controllers/aiQuestionController');
router.use(authenticate,requireRole('admin'));
router.post('/generate',generate);
module.exports=router;
