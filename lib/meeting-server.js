const socketio = require('socket.io');
const { MeetingPayloadEnum } = require('../types');
const {
    isMeetingPresent,
    deleteMeeting,
    getAllMeetingUsers,
    getMeetingUser,
    getMeetingMap,
} = require('./meeting-cache');

function parseMessage(message) {
    try {
        const payload = JSON.parse(message);
        return payload;
    } catch (error) {
        return {
            type: MeetingPayloadEnum.UNKNOWN,
        };

    }
}



function handleMessage(meetingId, socket, message) {
    if (typeof message === 'string') {
        const payload = parseMessage(message);
        switch (payload.type) {
            case MessagePayloadEnum.JOIN_MEETING:
                joinMeeting(meetingId, socket, payload);
                break;
            case MessagePayloadEnum.CONNECTION_REQUEST:
                forwardConnectionRequest(meetingId, payload);
                break;
            case MessagePayloadEnum.OFFER_SDP:
                forwardOfferSdp(meetingId, payload);
                break;
            case MessagePayloadEnum.ANSWER_SDP:
                forwardAnswerSdp(meetingId, payload);
                break;
            case MessagePayloadEnum.ICECANDIDATE:
                forwardIceCandidate(meetingId, payload);
                break;
            case MessagePayloadEnum.LEAVE_MEETING:
                userLeft(meetingId, socket, payload);
                break;
            case MessagePayloadEnum.END_MEETING:
                endMeeting(meetingId, socket, payload);
                break;
            case MessagePayloadEnum.VIDEO_TOGGLE:
            case MessagePayloadEnum.AUDIO_TOGGLE:
            case MessagePayloadEnum.MESSAGE:
                forwardEvent(meetingId, socket, payload);
                break;
            case MessagePayloadEnum.HEART_BEAT:
                handleHeartbeat(meetingId, socket);
                break;
            case MessagePayloadEnum.UNKNOWN:
                break;
            default:
                break;
        }
    }
}

function listenMessage(meetingId, socket) {
    socket.on('message', (message) => handleMessage(meetingId, socket, message));

    // if (socket.readyState === Websocket.OPEN) {}
}

function watchConnections() { //TODO ringing mannner for users
    const meetingMap = getMeetingMap();
    meetingMap.forEach((meeting) => {
        if (meeting.startTime + 30 * 60 * 1000 <= Date.now()) {
            endMeetingBySystem(meeting);
        } else {
            checkConnectionIsValid(meeting);
        }
    });
}


function endMeetingBySystem(meeting) {
    const meetingUsers = meeting.meetingUsers;
    meetingUsers.forEach((meetingUser) => {
        sendMessage(meetingUser.socket, {
            type: MessagePayloadEnum.END_MEETING,
        });
        // meetingServer.sockets.connected[meetingUser.socketId].disconnect();
        // meetingUser.socket ? .terminate(); //TODO imp uncomment
    });
    meeting.meetingUsers = [];
    deleteMeeting(meeting.id);
}

function checkConnectionIsValid(meeting) {
    const meetingUsers = meeting.meetingUsers;
    meetingUsers.forEach((meetingUser, index) => {
        if (!meetingUser.isAlive) { //meetingUser.socket.readyState === Websocket.CLOSED ||
            userLeft(meeting.id, meetingUser.socket, {
                type: MessagePayloadEnum.USER_LEFT,
                data: {
                    userId: meetingUser.userId,
                },
            });
            meetingUsers.splice(index, 1);
            // meetingUser.socket ? .terminate(); //TODO imp uncomment
        } else {
            meetingUser.isAlive = false;
        }
    });
}


exports.initMeetingServer = (server) => {
        const meetingServer = new socketio.Server(server).path("/websocket/meeting");
        // new Websocket.Server({
        //     server,
        //     path: '/websocket/meeting',
        // });

        meetingServer.on('connection', (socket, request) => {
            const meetingId = getMeetingId(request);
            listenMessage(meetingId, socket);
        });
        setInterval(() => {
            watchConnections();
        }, 20 * 1000);
    }
    ///////////////////////////////////////////////////////////////
function sendMessage(socket, payload) {
    if (socket.readyState === Websocket.OPEN) {
        socket.send(JSON.stringify(payload));
    }
}

// interface AddUserOptions {
//     meetingId: string;
//     userId: string;
//     name: string;
// }

function addUser(socket, { meetingId, userId, name }) {
    const meetingUsers = getAllMeetingUsers(meetingId);
    const meetingUser = getMeetingUser(meetingId, userId);
    if (meetingUser) {
        meetingUser.socket = socket;
    } else {
        meetingUsers.push({ socket, userId, joined: true, name, isAlive: true });
    }
}

function broadcastUsers(meetingId, socket, payload) {
    const meetingUsers = getAllMeetingUsers(meetingId);
    for (let i = 0; i < meetingUsers.length; i++) {
        const meetingUser = meetingUsers[i];
        if (meetingUser.socket !== socket) {
            sendMessage(meetingUser.socket, payload);
        }
    }
}

function terminateMeeting(meetingId) {
    const meetingUsers = getAllMeetingUsers(meetingId);
    for (let i = 0; i < meetingUsers.length; i++) {
        const meetingUser = meetingUsers[i];
        meetingUser.socket.terminate();
    }
    deleteMeeting(meetingId);
}

function joinMeeting(meetingId, socket, payload) {
    const { userId, name } = payload.data;
    console.log('User joined meeting', userId);
    if (isMeetingPresent(meetingId)) {
        addUser(socket, { meetingId, userId, name });

        sendMessage(socket, {
            type: MessagePayloadEnum.JOINED_MEETING,
            data: {
                userId,
            },
        });

        // notifiy other users
        broadcastUsers(meetingId, socket, {
            type: MessagePayloadEnum.USER_JOINED,
            data: {
                userId,
                name,
                ...payload.data,
            },
        });
    } else {
        sendMessage(socket, {
            type: MessagePayloadEnum.NOT_FOUND,
        });
    }
}
// interface ConnectWithOtherUserPayloadData {
//     userId: string;
//     otherUserId: string;
//     name: string;
//     config: {
//         videoEnabled: boolean;
//         audioEnabled: boolean;
//     };
// }

function forwardConnectionRequest(meetingId, payload) {
    const { userId, otherUserId, name } = payload.data;
    const otherUser = getMeetingUser(meetingId, otherUserId);
    if (otherUser.socket) {
        sendMessage(otherUser.socket, {
            type: MessagePayloadEnum.CONNECTION_REQUEST,
            data: {
                userId,
                name,
                ...payload.data,
            },
        });
    }
}

// interface OfferSdpPayload {
//     userId: string;
//     otherUserId: string;
//     sdp: string;
// }

function forwardOfferSdp(meetingId, payload) {
    const { userId, otherUserId, sdp } = payload.data;
    const otherUser = getMeetingUser(meetingId, otherUserId);
    if (otherUser.socket) {
        sendMessage(otherUser.socket, {
            type: MessagePayloadEnum.OFFER_SDP,
            data: {
                userId,
                sdp,
            },
        });
    }
}

// interface AnswerSdpPayload {
//     userId: string;
//     otherUserId: string;
//     sdp: string;
// }

function forwardAnswerSdp(meetingId, payload) {
    const { userId, otherUserId, sdp } = payload.data;
    const otherUser = getMeetingUser(meetingId, otherUserId);
    if (otherUser.socket) {
        sendMessage(otherUser.socket, {
            type: MessagePayloadEnum.ANSWER_SDP,
            data: {
                userId,
                sdp,
            },
        });
        // meetingServer.to(results.socketId).emit("message", sendPayload);
    }
}
// interface IceCandidatePayload {
//     userId: string;
//     otherUserId: string;
//     candidate: any;
// }

function forwardIceCandidate(meetingId, payload) {
    const { userId, otherUserId, candidate } = payload.data;
    const otherUser = getMeetingUser(meetingId, otherUserId);
    if (otherUser.socket) {
        sendMessage(otherUser.socket, {
            type: MessagePayloadEnum.ICECANDIDATE,
            data: {
                userId,
                candidate,
            },
        });
    }
}
// interface UserLeftPayload {
//     userId: string;
// }

function userLeft(meetingId, socket, payload) {
    const { userId } = payload.data;
    // notifiy other users
    broadcastUsers(meetingId, socket, {
        type: MessagePayloadEnum.USER_LEFT,
        data: {
            userId: userId,
        },
    });
}

// interface MeetingEndedPayload {
//     userId: string;
// }

function endMeeting(meetingId, socket, payload) {
    const { userId } = payload.data;
    // notifiy other users
    broadcastUsers(meetingId, socket, {
        type: MessagePayloadEnum.MEETING_ENDED,
        data: {
            userId,
        },
    });
    terminateMeeting(meetingId);
}

function forwardEvent(meetingId, socket, payload) {
    const { userId } = payload.data;
    broadcastUsers(meetingId, socket, {
        type: payload.type,
        data: {
            userId,
            ...payload.data,
        },
    });
}

function handleHeartbeat(meetingId, socket) {
    const meetingUsers = getAllMeetingUsers(meetingId);
    const meetingUser = meetingUsers.find((meetingUser) => meetingUser.socket === socket);
    if (meetingUser) {
        meetingUser.isAlive = true;
    }
}