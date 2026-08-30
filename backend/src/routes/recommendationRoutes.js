const express=require('express');
const router=express.Router();
const {authenticate}=require('../middleware/auth');
const {recommendations,achievements}=require('../controllers/recommendationController');
router.get('/', authenticate, recommendations);
router.get('/recommendations', authenticate, recommendations);
router.get('/achievements', authenticate, achievements);
module.exports=router;
