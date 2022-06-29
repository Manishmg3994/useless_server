const { Meeting, MeetingUser } = require('../types');
const { v4 } = require('uuid');
const meetingMap = new Map();

exports.getMeetingMap = () => meetingMap;
exports.getAllMeetingUsers = (meetingId) => {
    return meetingMap.get(meetingId).meetingUsers || [];
}
exports.getAllMeetingUsers = (meetingId) => {
    return meetingMap.get(meetingId).meetingUsers || [];
}
exports.getMeetingUser = (meetingId, userId) => {
    const meetingUsers = getAllMeetingUsers(meetingId);
    return meetingUsers.find((meetingUser) => meetingUser.userId === userId);
}
exports.isMeetingPresent = (meetingId) => {
    return meetingMap.has(meetingId);
}
exports.startMeeting = ({ name, userId, meetingId }) => {
    // if (meetingId !== undefined || meetingId !== null ) {
    //   const  meetId = meetingId

    // } else {
    //   const meetId = uuidV4();

    // }
    meetingId = meetingId || v4();
    const meeting = {
        id: meetingId, //meetId if you are get in after starting meeting you will get meetId in response
        hostId: userId,
        hostName: name,
        meetingUsers: [],
        startTime: Date.now(),
    };
    meetingMap.set(meetingId, meeting);
    console.log(meetingMap);
    return meetingId;
}


exports.checkMeetingExists = (meetingId) => {
    if (!meetingMap.has(meetingId)) {
        throw new Error('Meeting not found');
    }
    var meetingMaps = delete obj["a"];
    delete meetingMaps['meetingUsers'];
    return meetingMaps;
    //TODO omit meeting user array key
}

exports.deleteMeeting = (meetingId) => {
    meetingMap.delete(meetingId);
}