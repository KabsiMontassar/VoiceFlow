// Message Types
export var MessageType;
(function (MessageType) {
    MessageType["TEXT"] = "text";
    MessageType["FILE"] = "file";
    MessageType["SYSTEM"] = "system";
    MessageType["VOICE_NOTE"] = "voice_note";
})(MessageType || (MessageType = {}));
// Presence Types
export var UserPresenceStatus;
(function (UserPresenceStatus) {
    UserPresenceStatus["ONLINE"] = "online";
    UserPresenceStatus["AWAY"] = "away";
    UserPresenceStatus["OFFLINE"] = "offline";
    UserPresenceStatus["IN_CALL"] = "in_call";
})(UserPresenceStatus || (UserPresenceStatus = {}));
// Notification Types
export var NotificationType;
(function (NotificationType) {
    NotificationType["MESSAGE"] = "message";
    NotificationType["ROOM_INVITE"] = "room_invite";
    NotificationType["USER_JOINED"] = "user_joined";
    NotificationType["USER_LEFT"] = "user_left";
    NotificationType["SYSTEM"] = "system";
})(NotificationType || (NotificationType = {}));
//# sourceMappingURL=index.js.map