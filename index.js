const express = require("express");
const { createServer } = require("node:http");
const { join } = require("node:path");
const { Server } = require("socket.io");
const cors = require("cors");
const app = express();
app.use(cors());
const server = createServer(app);
const io = new Server(server);

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

// online users
let users = [];

const addUser = (userId, socketId) => {
  !users.some((user) => user.userId === userId) &&
    users.push({ userId, socketId });
};

const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};

const getUser = (userId) => {
  return users.find((user) => user.userId === userId);
};

io.on("connection", (socket) => {
  console.log("a user connected", socket.id);

  socket.on("addUser", (userId) => {
    console.log(userId, "uid");
    addUser(userId, socket.id);
    io.emit("getUsers", users);
    console.log(users, "usrs");
  });

  // get message from user, send it to destination
  socket.on("sendMessage", (messageDetails) => {
    const sender = getUser(messageDetails?.senderId);
    const receiver = getUser(messageDetails?.receiverId);
    io.to(sender?.socketId).emit("getMessage", messageDetails);
    io.to(receiver?.socketId).emit("getMessage", messageDetails);
  });

  // REALTIME AUDIO AND VIDEO CALL *************************************
  // Receive a call from caller and send it to calee
  socket.on("call", (data) => {
    // send call to receiver(by using callerId/receiverId) to find his socketId first
    const calleeSocketId = getUser(data.calleeId)?.socketId;
    io.to(calleeSocketId).emit("newCall", data);
  });

  // Receiver/calee picks the call
  // Connection is established
  socket.on("answerCall", (data) => {
    const callerSocketId = getUser(data.callerId).socketId;

    // Send callAnswered event down here
    console.log(data, "data after answering call");
    io.to(callerSocketId).emit("callAnswered", data);
  });

  // Handle onICECandidate event down here ----
  socket.on("iceCandidate", (data) => {
    console.log(data, "ice candidate data");
    const receiverSocketId = getUser(data.calleeId)?.socketId;
    console.log(data.callerId, receiverSocketId);
    io.to(receiverSocketId).emit("ICEcandidate", data);
  });

  // on disconnect event
  socket.on("disconnect", () => {
    removeUser(socket.id);
    io.emit("getUsers", users);
    console.log(socket.id, "disconnected");
    console.log(users);
  });
});

server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});
