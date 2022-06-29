const { Router } = require('express');
const meetingRouter = require('./meeting.routes');
const router = Router();
router.use('/meeting', meetingRouter);
module.exports = router