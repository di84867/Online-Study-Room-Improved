const express = require("express");
const app = express();
const path = require("path");
const socketio = require("socket.io");
const http = require("http");
const moment = require("moment");
const cors = require("cors");
const PORT = process.env.PORT || 5050;
const { writeFile, mkdirSync, existsSync } = require("fs");

const UPLOADS_DIR = path.join(__dirname, "assets/uploads");
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Database Connection (Removed MongoDB, using LocalDB in controllers)
// const mongoose = require("mongoose");
// mongoose.connect('mongodb://localhost:27017/online-study-room', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// }).then(() => console.log('MongoDB Connected'))
//   .catch(err => console.log(err));
console.log('Using Local JSON Database');

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 1e7,
});

const initRoutes = require("./src/routes");

initRoutes(app);

// Serve uploaded files
app.use("/files", express.static(path.join(__dirname, "assets/uploads")));

// Serve frontend build (production)
const frontendDist = path.join(__dirname, "frontend/dist");
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  
  // SPA fallback - serve index.html for all non-API routes
  app.get("*", (req, res, next) => {
    // Skip API and socket routes
    if (req.path.startsWith("/api") || req.path.startsWith("/socket.io") || req.path.startsWith("/files")) {
      return next();
    }
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  // Fallback to legacy public folder for development
  app.use(express.static(path.join(__dirname, "public")));
}

let socketroom = {};
let socketname = {};
let socketPhoto = {}; // { socketId: photoURL }
let roomAdmins = {}; // { roomid: [socketIds] }
let activeRooms = new Set(); // Track successfully started rooms by admins
let roomCanvas = {}; // { roomid: dataURL }
let lobbyUsers = {}; // { roomid: [socketIds] }
let roomRestricted = {}; // { roomid: boolean }
let roomChatBlocked = {}; // { roomid: boolean }

io.on("connect", (socket) => {
  socket.on("upload", (file, fileName, callback) => {
    try {
      writeFile(path.join(UPLOADS_DIR, fileName), file, (err) => {
        if (err) console.error("Upload error:", err);
        callback({ message: err ? "failure" : "success" });
      });
    } catch (err) {
      console.log(err);
    }
  });

  socket.on("join room", (roomid, name, isAdmin, photoURL, isClosedMode) => {
    // Determine if this user should be a host. 
    // If the room is currently empty and it's NOT a restricted closed meeting, 
    // the first joiner becomes the host automatically.
    let amIAdmin = isAdmin;
    if (!roomAdmins[roomid] || roomAdmins[roomid].length === 0) {
        if (!isClosedMode) {
            amIAdmin = true;
            console.log(`Promoting first joiner ${name} to Host for room ${roomid}`);
        }
    }

    // If meeting is closed OR restricted mode is ON, and user is NOT admin and room is not yet started, put them in lobby
    const isRestricted = roomRestricted[roomid];
    if ((isClosedMode || isRestricted) && !amIAdmin) {
        if (!lobbyUsers[roomid]) lobbyUsers[roomid] = [];
        if (!lobbyUsers[roomid].includes(socket.id)) {
            lobbyUsers[roomid].push(socket.id);
            socketroom[socket.id] = roomid;
            socketname[socket.id] = name;
            socketPhoto[socket.id] = photoURL;
            
            socket.emit("waiting-lobby");
            
            // Notify admins about the new lobby request
            if (roomAdmins[roomid]) {
                roomAdmins[roomid].forEach(adminSid => {
                    io.to(adminSid).emit("lobby-request", { sid: socket.id, name, photoURL });
                });
            }
            return;
        }
    }

    socket.join(roomid);
    socketroom[socket.id] = roomid;
    socketname[socket.id] = name;
    socketPhoto[socket.id] = photoURL;

    if (amIAdmin) {
      if (!roomAdmins[roomid]) roomAdmins[roomid] = [];
      if (!roomAdmins[roomid].includes(socket.id)) {
        roomAdmins[roomid].push(socket.id);
      }
      activeRooms.add(roomid);
      io.to(roomid).emit("room-started"); // Notify anyone waiting
    }

    // Notify others
    socket.to(roomid).emit("join room", [socket.id], { [socket.id]: name }, {}, {}, isAdmin, undefined, { [socket.id]: photoURL });

    // Send users list to the new joiner.
    const clients = io.sockets.adapter.rooms.get(roomid);
    const usersInRoom = clients ? Array.from(clients).filter((id) => id !== socket.id) : [];
    const names = {};
    const photos = {};
    usersInRoom.forEach((id) => {
        names[id] = socketname[id];
        photos[id] = socketPhoto[id];
    });

    const isActive = activeRooms.has(roomid);
    socket.emit("join room", usersInRoom, names, {}, {}, amIAdmin, isActive, photos);
  });

  socket.on("approve-admission", (targetSid) => {
      const roomid = socketroom[socket.id];
      if (roomAdmins[roomid] && roomAdmins[roomid].includes(socket.id)) {
          // Remove from lobby
          if (lobbyUsers[roomid]) {
              lobbyUsers[roomid] = lobbyUsers[roomid].filter(sid => sid !== targetSid);
          }
          io.to(targetSid).emit("admitted");
      }
  });

  socket.on("reject-admission", (targetSid) => {
      const roomid = socketroom[socket.id];
      if (roomAdmins[roomid] && roomAdmins[roomid].includes(socket.id)) {
          if (lobbyUsers[roomid]) {
              lobbyUsers[roomid] = lobbyUsers[roomid].filter(sid => sid !== targetSid);
          }
          io.to(targetSid).emit("kicked");
      }
  });

  socket.on("message", (msg, roomid, href) => {
    if (roomChatBlocked[roomid] && !roomAdmins[roomid].includes(socket.id)) return;

    const senderName = socketname[socket.id] || "Guest";
    const isAdmin = roomAdmins[roomid] && roomAdmins[roomid].includes(socket.id);
    io.to(roomid).emit("message", msg, senderName, moment().format("h:mm a"), href, socket.id, isAdmin);
  });

  socket.on("toggle-chat", (isBlocked) => {
      const roomid = socketroom[socket.id];
      if (roomAdmins[roomid] && roomAdmins[roomid].includes(socket.id)) {
          roomChatBlocked[roomid] = isBlocked;
          io.to(roomid).emit("chat-status", isBlocked);
      }
  });

  socket.on("mute-all", () => {
      const roomid = socketroom[socket.id];
      if (roomAdmins[roomid] && roomAdmins[roomid].includes(socket.id)) {
          socket.to(roomid).emit("admin-action", "mute");
      }
  });

  socket.on("reaction", (emoji) => {
      const roomid = socketroom[socket.id];
      if (roomid) io.to(roomid).emit("reaction", { sid: socket.id, emoji });
  });

  socket.on("raise-hand", (isRaised) => {
      const roomid = socketroom[socket.id];
      if (roomid) io.to(roomid).emit("hand-status", { sid: socket.id, isRaised });
  });

  socket.on("file-request", (fileName, displayName, href) => {
    const roomid = socketroom[socket.id];
    if (roomAdmins[roomid]) {
      roomAdmins[roomid].forEach((adminSid) => {
        io.to(adminSid).emit("file-permission-request", {
          senderId: socket.id,
          senderName: socketname[socket.id],
          fileName,
          href,
        });
      });
    }
  });

  socket.on("approve-file", (requestId, fileName, href) => {
    const roomid = socketroom[socket.id];
    const senderName = socketname[requestId] || "Guest";
    io.to(roomid).emit("message", fileName, senderName, moment().format("h:mm a"), href, requestId);
  });

  // Admin Controls
  socket.on("delete-message", (msgIndex) => {
    const roomid = socketroom[socket.id];
    if (roomAdmins[roomid] && roomAdmins[roomid].includes(socket.id)) {
      io.to(roomid).emit("message-deleted", msgIndex);
    }
  });

  socket.on("ban-user", (targetSid) => {
    const roomid = socketroom[socket.id];
    if (roomAdmins[roomid] && roomAdmins[roomid].includes(socket.id)) {
      io.to(targetSid).emit("kicked");
      io.to(roomid).emit("remove peer", targetSid);
      const targetSocket = io.sockets.sockets.get(targetSid);
      if (targetSocket) targetSocket.leave(roomid);
    }
  });

  socket.on("restrict-user", (targetSid, action) => {
    const roomid = socketroom[socket.id];
    if (roomAdmins[roomid] && roomAdmins[roomid].includes(socket.id)) {
      io.to(targetSid).emit("admin-action", action);
    }
  });

  socket.on("promote-coadmin", (targetSid) => {
    const roomid = socketroom[socket.id];
    if (roomAdmins[roomid] && roomAdmins[roomid].includes(socket.id)) {
      io.to(roomid).emit("coadmin-promoted", targetSid);
    }
  });

  socket.on("private message", (msg, targetSid, href) => {
    const senderName = socketname[socket.id] || "Guest";
    const roomid = socketroom[socket.id];
    const time = moment().format("h:mm a");
    const senderId = socket.id;

    io.to(targetSid).emit("private message", msg, senderName, time, senderId, targetSid, false, href);

    if (roomAdmins[roomid]) {
      roomAdmins[roomid].forEach((adminSid) => {
        if (adminSid !== senderId && adminSid !== targetSid) {
          io.to(adminSid).emit("private message", `[Private ${senderName}->${socketname[targetSid]}]: ${msg}`, senderName, time, senderId, targetSid, true);
        }
      });
    }
  });

  socket.on("video-offer", (offer, sid, name) => {
    socket.to(sid).emit("video-offer", offer, socket.id, name);
  });

  socket.on("video-answer", (answer, sid) => {
    socket.to(sid).emit("video-answer", answer, socket.id);
  });

  socket.on("new icecandidate", (candidate, sid) => {
    socket.to(sid).emit("new icecandidate", candidate, socket.id);
  });

  socket.on("speaking", (speaking) => {
    const roomid = socketroom[socket.id];
    if (roomid) io.to(roomid).emit("speaking", socket.id, speaking);
  });

  socket.on("sharing", (isSharing) => {
    const roomid = socketroom[socket.id];
    if (roomid) io.to(roomid).emit("sharing", socket.id, isSharing);
  });

  socket.on("draw", (nx, ny, px, py, color, size) => {
    const roomid = socketroom[socket.id];
    if (roomid) socket.to(roomid).emit("draw", nx, ny, px, py, color, size);
  });

  socket.on("clearBoard", () => {
    const roomid = socketroom[socket.id];
    if (roomid) {
        delete roomCanvas[roomid];
        socket.to(roomid).emit("clearBoard");
    }
  });

  socket.on("store canvas", (url) => {
    const roomid = socketroom[socket.id];
    if (roomid) roomCanvas[roomid] = url;
  });

  socket.on("getCanvas", () => {
    const roomid = socketroom[socket.id];
    if (roomid && roomCanvas[roomid]) {
        socket.emit("getCanvas", roomCanvas[roomid]);
    }
  });

  socket.on("update-settings", (settings) => {
    const roomid = socketroom[socket.id];
    if (roomAdmins[roomid] && roomAdmins[roomid].includes(socket.id)) {
        if (settings.restricted !== undefined) roomRestricted[roomid] = settings.restricted;
        io.to(roomid).emit("admin-settings-update", settings);
    }
  });

  socket.on("action", (type, roomid, extra) => {
    socket.to(roomid).emit("action", type, socket.id, extra);
  });

  socket.on("disconnect", () => {
    const roomid = socketroom[socket.id];
    if (roomid && roomAdmins[roomid]) {
      roomAdmins[roomid] = roomAdmins[roomid].filter((id) => id !== socket.id);
    }
    socket.to(roomid).emit("remove peer", socket.id);
    delete socketroom[socket.id];
    delete socketname[socket.id];
    if (roomid && lobbyUsers[roomid]) {
        lobbyUsers[roomid] = lobbyUsers[roomid].filter(sid => sid !== socket.id);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
