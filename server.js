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

  socket.on("join room", (roomid, name, isAdmin, photoURL) => {
    socket.join(roomid);
    socketroom[socket.id] = roomid;
    socketname[socket.id] = name;
    socketPhoto[socket.id] = photoURL;

    console.log(`User ${name} (${socket.id}) joined room ${roomid}`);

    if (isAdmin) {
      if (!roomAdmins[roomid]) roomAdmins[roomid] = [];
      if (!roomAdmins[roomid].includes(socket.id)) {
        roomAdmins[roomid].push(socket.id);
      }
      activeRooms.add(roomid);
      io.to(roomid).emit("room-started"); // Notify waiters
    }

    // Notify others
    // new args: photos is 7th argument
    socket
      .to(roomid)
      .emit("join room", [socket.id], { [socket.id]: name }, {}, {}, isAdmin, undefined, { [socket.id]: photoURL });

    // Send users list to the new joiner.
    const clients = io.sockets.adapter.rooms.get(roomid);
    const usersInRoom = clients
      ? Array.from(clients).filter((id) => id !== socket.id)
      : [];
    const names = {};
    const photos = {};
    usersInRoom.forEach((id) => {
        names[id] = socketname[id];
        photos[id] = socketPhoto[id];
    });

    const isActive = activeRooms.has(roomid);
    const amIAdmin = roomAdmins[roomid] && roomAdmins[roomid].includes(socket.id);
    // Signature: (users, names, mics, videos, isAdmin, isActive, photos)
    socket.emit("join room", usersInRoom, names, {}, {}, amIAdmin, isActive, photos);
  });

  socket.on("message", (msg, roomid, href) => {
    const senderName = socketname[socket.id] || "Guest";
    const isAdmin =
      roomAdmins[roomid] && roomAdmins[roomid].includes(socket.id);
    io.to(roomid).emit(
      "message",
      msg,
      senderName,
      moment().format("h:mm a"),
      href,
      socket.id,
      isAdmin,
    );
  });

  // Admin File Permission Logic
  socket.on("file-request", (fileName, displayName, href) => {
    const roomid = socketroom[socket.id];
    // Send request to room admins
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
    // Broadcast to everyone now that admin approved
    io.to(roomid).emit(
      "message",
      fileName,
      senderName,
      moment().format("h:mm a"),
      href,
      requestId,
    );
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
    // Verify kicker is admin
    if (roomAdmins[roomid] && roomAdmins[roomid].includes(socket.id)) {
      io.to(targetSid).emit("kicked");
      // Also tell others to remove this peer
      io.to(roomid).emit("remove peer", targetSid);

      // Force disconnect socket
      const targetSocket = io.sockets.sockets.get(targetSid);
      if (targetSocket) {
        targetSocket.leave(roomid);
      }
    }
  });

  socket.on("restrict-user", (targetSid, action) => {
    // action can be 'mute' or 'remove-video'
    const roomid = socketroom[socket.id];
    if (roomAdmins[roomid] && roomAdmins[roomid].includes(socket.id)) {
      io.to(targetSid).emit("admin-action", action);
    }
  });

  socket.on("private message", (msg, targetSid, href) => {
    const senderName = socketname[socket.id] || "Guest";
    const roomid = socketroom[socket.id];
    const time = moment().format("h:mm a");
    const senderId = socket.id;

    io.to(targetSid).emit(
      "private message",
      msg,
      senderName,
      time,
      senderId,
      targetSid,
      false,
      href
    );

    if (roomAdmins[roomid]) {
      roomAdmins[roomid].forEach((adminSid) => {
        if (adminSid !== senderId && adminSid !== targetSid) {
          io.to(adminSid).emit(
            "private message",
            `[Private ${senderName}->${socketname[targetSid]}]: ${msg}`,
            senderName,
            time,
            senderId,
            targetSid,
            true,
          );
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
    if (roomid) socket.to(roomid).emit("speaking", socket.id, speaking);
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

  socket.on("action", (type, roomid, extra) => {
    socket.to(roomid).emit("action", type, socket.id, extra);
  });

  socket.on("disconnect", () => {
    const roomid = socketroom[socket.id];
    if (roomid && roomAdmins[roomid]) {
      // If an admin disconnects, we might want to assign a new admin or just leave it.
      // For now, allow multiple admins or just remove the disconnected one.
      roomAdmins[roomid] = roomAdmins[roomid].filter((id) => id !== socket.id);
    }
    socket.to(roomid).emit("remove peer", socket.id);
    delete socketroom[socket.id];
    delete socketname[socket.id];
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
