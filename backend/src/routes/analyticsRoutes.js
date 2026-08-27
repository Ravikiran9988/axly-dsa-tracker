const express=require('express');
const router=express.Router();
const {authenticate}=require('../middleware/auth');
const {getMine}=require('../controllers/analyticsController');
router.use(authenticate);
router.get('/me',getMine);
module.exports=router;
