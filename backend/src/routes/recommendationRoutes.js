const express=require('express');
const router=express.Router();
const {authenticate}=require('../middleware/auth');
const {recommendations,achievements}=require('../controllers/recommendationController');
router.use(authenticate);
router.get('/recommendations',recommendations);
router.get('/achievements',achievements);
module.exports=router;
