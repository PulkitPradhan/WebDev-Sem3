const EventEmitter = require("events");

class AppEventEmitter extends EventEmitter {}

const appEvents = new AppEventEmitter();

appEvents.on("user:registered", (user) => {
  console.log(`[event] User registered: ${user.username} (${user.email})`);
});

appEvents.on("user:login", (user) => {
  console.log(`[event] User login: ${user.username} (${user.email})`);
});

appEvents.on("note:created", (note) => {
  console.log(`[event] Note created: "${note.title}" (ID: ${note._id})`);
});

appEvents.on("note:updated", (note) => {
  console.log(`[event] Note updated: "${note.title}" (ID: ${note._id})`);
});

appEvents.on("note:deleted", (noteId) => {
  console.log(`[event] Note deleted: (ID: ${noteId})`);
});

appEvents.on("chat:message", (data) => {
  console.log(`[event] Chat broadcast in ${data.room} by ${data.username}`);
});

module.exports = appEvents;
