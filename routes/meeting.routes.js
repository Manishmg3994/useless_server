const { Router } = require('express');
const { startMeeting, checkMeetingExists } = require('../lib/meeting-cache');
const router = Router();


router.post('/start', (req, res) => {
    const { name, userId, meetingId } = req.body;
    const meetId = startMeeting({ name, userId, meetingId });
    res.send({ meetId });
});
router.get('/join', (req, res) => {
    const { meetingId } = req.query;
    try {
        const meetId = checkMeetingExists(meetingId);
        res.status(200).send(meetId);
    } catch (error) {
        res.status(404).send({ message: 'Meeting not found' });
    }
});

module.exports = router;