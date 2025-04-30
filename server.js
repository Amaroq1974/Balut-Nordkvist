
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {};

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ roomId, playerName }) => {
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = { players: [], currentTurnIndex: 0 };

    if (rooms[roomId].players.length >= 2) {
      socket.emit("roomFull");
      return;
    }

    rooms[roomId].players.push({ id: socket.id, name: playerName });
    io.to(roomId).emit("playerList", rooms[roomId].players);

    if (rooms[roomId].players.length === 2) {
      io.to(roomId).emit("startGame", { players: rooms[roomId].players });
      io.to(rooms[roomId].players[0].id).emit("yourTurn");
    }
  });

  socket.on("rollDice", ({ roomId, values }) => {
    socket.to(roomId).emit("diceRolled", values);
  });

  socket.on("chooseCategory", ({ roomId, category, playerId }) => {
    socket.to(roomId).emit("categoryChosen", { category, playerId });
  });

  socket.on("endTurn", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;
    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
    const nextPlayer = room.players[room.currentTurnIndex];
    io.to(nextPlayer.id).emit("yourTurn");
  });

  socket.on("sendMessage", ({ roomId, sender, message }) => {
    io.to(roomId).emit("receiveMessage", { sender, message });
  });

  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      if (rooms[roomId]) {
        rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
        io.to(roomId).emit("playerList", rooms[roomId].players);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server kører på port " + PORT);
});
