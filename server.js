const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(path.join(__dirname, 'public')));

let connections = {};

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('register', (role) => {
    if (role === 'receiver') {
      connections[socket.id] = { socket, peers: [] };
    } else if (role === 'sender') {
      for (let id in connections) {
        connections[id].peers.push(socket.id);
      }
    }
  });

  socket.on('offer', (data) => {
    const { offer, receiverId } = data;
    io.to(receiverId).emit('offer', { offer, senderId: socket.id });
  });

  socket.on('answer', (data) => {
    const { answer, senderId } = data;
    io.to(senderId).emit('answer', { answer, receiverId: socket.id });
  });

  socket.on('candidate', (data) => {
    const { candidate, targetId } = data;
    io.to(targetId).emit('candidate', { candidate, senderId: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
    delete connections[socket.id];
    for (let id in connections) {
      connections[id].peers = connections[id].peers.filter(peerId => peerId !== socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
