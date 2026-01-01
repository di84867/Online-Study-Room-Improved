const express = require("express");
const app = express();
const path = require("path");
const socketio = require("socket.io");
const http = require("http");
const moment = require("moment");
const mongoose = require("mongoose");
const cors = require("cors");
const PORT = process.env.PORT || 5050;
const { writeFile, mkdirSync, existsSync } = require('fs')

// Ensure uploads directory exists
if (!existsSync('./assets/uploads')) {
  mkdirSync('./assets/uploads', { recursive: true });
}

// Database Connection
mongoose.connect('mongodb://localhost:27017/online-study-room', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e7
});

const initRoutes = require("./src/routes");

initRoutes(app);

app.use(express.static(path.join(__dirname, "public")));
app.use('/files', express.static(path.join(__dirname, "assets/uploads")));

let socketroom = {};
let socketname = {};
let roomAdmins = {}; // { roomid: [socketIds] }

io.on("connect", (socket) => {
  socket.on("upload", (file, fileName, callback) => {
    try {
      writeFile(`./assets/uploads/${fileName}`, file, (err) => {
        callback({ message: err ? "failure" : "success" });
      });
    } catch (err) {
      console.log(err)
    }
  });

  socket.on('join room', (roomid, name, isAdmin) => {
    socket.join(roomid);
    socketroom[socket.id] = roomid;
    socketname[socket.id] = name;
    console.log(`User ${name} (${socket.id}) joined room ${roomid}`);

    if (isAdmin) {
      if (!roomAdmins[roomid]) roomAdmins[roomid] = [];
      if (!roomAdmins[roomid].includes(socket.id)) {
        roomAdmins[roomid].push(socket.id);
      }
    }

    // Notify others
    socket.to(roomid).emit('join room', [socket.id], { [socket.id]: name }, {}, {}, isAdmin);

    // Send list of users already in room back to joiner
    const clients = io.sockets.adapter.rooms.get(roomid);
    const usersInRoom = clients ? Array.from(clients).filter(id => id !== socket.id) : [];
    const names = {};
    usersInRoom.forEach(id => names[id] = socketname[id]);

    socket.emit('join room', usersInRoom, names, {}, {}, isAdmin);
  });

  socket.on("message", (msg, roomid, href) => {
    const senderName = socketname[socket.id] || "Guest";
    // If it's a file from a non-admin, it shouldn't be here directly (handled by file-request)
    io.to(roomid).emit("message", msg, senderName, moment().format("h:mm a"), href, socket.id);
  });

  // Admin File Permission Logic
  socket.on("file-request", (fileName, displayName, href) => {
    const roomid = socketroom[socket.id];
    // Send request to room admins
    if (roomAdmins[roomid]) {
      roomAdmins[roomid].forEach(adminSid => {
        io.to(adminSid).emit("file-permission-request", {
          senderId: socket.id,
          senderName: socketname[socket.id],
          fileName,
          href
        });
      });
    }
  });

  socket.on("approve-file", (requestId, fileName, href) => {
    const roomid = socketroom[socket.id];
    const senderName = socketname[requestId] || "Guest";
    // Broadcast to everyone now that admin approved
    io.to(roomid).emit("message", fileName, senderName, moment().format("h:mm a"), href, requestId);
  });

  // Admin Controls
  socket.on("delete-message", (msgIndex) => {
    const roomid = socketroom[socket.id];
    io.to(roomid).emit("message-deleted", msgIndex);
  });

  socket.on("kick-user", (targetSid) => {
    const roomid = socketroom[socket.id];
    // Verify kicker is admin
    if (roomAdmins[roomid] && roomAdmins[roomid].includes(socket.id)) {
      io.to(targetSid).emit("kicked");
    }
  });

  socket.on("private message", (msg, targetSid) => {
    const senderName = socketname[socket.id] || "Guest";
    const roomid = socketroom[socket.id];
    const time = moment().format("h:mm a");
    const senderId = socket.id;

    io.to(targetSid).emit("private message", msg, senderName, time, senderId, targetSid);

    if (roomAdmins[roomid]) {
      roomAdmins[roomid].forEach(adminSid => {
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
    if (roomid) socket.to(roomid).emit("speaking", socket.id, speaking);
  });

  socket.on("action", (type, roomid, extra) => {
    socket.to(roomid).emit("action", type, socket.id, extra);
  });

  socket.on("disconnect", () => {
    const roomid = socketroom[socket.id];
    if (roomid && roomAdmins[roomid]) {
      roomAdmins[roomid] = roomAdmins[roomid].filter(id => id !== socket.id);
    }
    socket.to(roomid).emit("remove peer", socket.id);
    delete socketroom[socket.id];
    delete socketname[socket.id];
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
