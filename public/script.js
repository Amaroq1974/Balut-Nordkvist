
const socket = io();
const diceEls = ["d1", "d2", "d3", "d4", "d5"].map(id => document.getElementById(id));
const rollBtn = document.getElementById("rollBtn");
const scoreBody = document.getElementById("scoreBody");
const roundCounter = document.getElementById("roundCounter");
const rollCounter = document.getElementById("rollCounter");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const lobby = document.getElementById("lobby");
const gameArea = document.getElementById("game");
const lobbyStatus = document.getElementById("lobbyStatus");
const rollSound = new Audio("/sounds/roll.mp3");
const categories12 = ["Ones", "Twos", "Threes", "Fours", "Fives", "Sixes", "Three of a Kind", "Four of a Kind", "Full House", "Small Straight", "Large Straight", "Balut"];
const categories16 = [...categories12, "Chance", "Even", "Odd", "Choice"];
let currentMode = 12;
let currentRound = 1;
let currentRoll = 0;
let playerName = "";
let roomCode = "";
let isMyTurn = false;
const maxRounds = () => (currentMode === 12 ? 12 : 16);

function renderScoreTable(mode) {
  scoreBody.innerHTML = "";
  const cats = mode === 12 ? categories12 : categories16;
  cats.forEach(cat => {
    const row = document.createElement("tr");
    const td1 = document.createElement("td");
    td1.textContent = cat;
    const td2 = document.createElement("td");
    td2.textContent = "";
    td2.onclick = () => {
      if (!isMyTurn || td2.textContent !== "") return;
      td2.style.backgroundColor = "#DCEEFB";
      td2.textContent = "(valgt)";
      socket.emit("chooseCategory", { roomId: roomCode, category: cat, playerId: socket.id });
      isMyTurn = false;
      rollBtn.disabled = true;
      nextRound();
      socket.emit("endTurn", { roomId: roomCode });
    };
    row.appendChild(td1);
    row.appendChild(td2);
    scoreBody.appendChild(row);
  });
}

function switchMode(mode) {
  currentMode = mode;
  currentRound = 1;
  currentRoll = 0;
  updateStatus();
  renderScoreTable(mode);
}

function updateStatus() {
  roundCounter.textContent = currentRound;
  rollCounter.textContent = currentRoll;
}

function rollDice() {
  if (!isMyTurn || currentRoll >= 3) return;
  const values = [];
  rollSound.play();
  diceEls.forEach((die, i) => {
    const roll = Math.floor(Math.random() * 6) + 1;
    values.push(roll);
    die.innerHTML = `<div class="cube cube-${roll}"></div>`;
  });
  currentRoll++;
  updateStatus();
  socket.emit("rollDice", { roomId: roomCode, values });
}

function nextRound() {
  currentRound++;
  currentRoll = 0;
  updateStatus();
  if (currentRound > maxRounds()) {
    alert("Spillet er slut! Tak for spillet.");
    rollBtn.disabled = true;
  }
}

function joinRoom() {
  playerName = document.getElementById("playerName").value.trim();
  roomCode = document.getElementById("roomCode").value.trim();
  if (!playerName || !roomCode) return;
  socket.emit("joinRoom", { roomId: roomCode, playerName });
  lobbyStatus.textContent = "Venter på spiller 2...";
}

function sendChat() {
  const message = chatInput.value.trim();
  if (message === "") return;
  socket.emit("sendMessage", { roomId: roomCode, sender: playerName, message });
  chatInput.value = "";
}

socket.on("playerList", (players) => {
  if (players.length < 2) {
    lobbyStatus.textContent = `Forbundet som ${playerName}. Venter på modspiller...`;
  }
});

socket.on("roomFull", () => {
  alert("Rummet er allerede fuldt. Prøv et andet navn.");
});

socket.on("startGame", (data) => {
  lobby.style.display = "none";
  gameArea.style.display = "block";
  isMyTurn = data.players[0].id === socket.id;
  rollBtn.disabled = !isMyTurn;
  updateStatus();
  renderScoreTable(currentMode);
});

socket.on("diceRolled", (values) => {
  values.forEach((val, i) => {
    diceEls[i].innerHTML = `<div class="cube cube-${val}"></div>`;
  });
});

socket.on("categoryChosen", ({ category, playerId }) => {
  const rows = scoreBody.querySelectorAll("tr");
  rows.forEach(row => {
    if (row.children[0].textContent === category && row.children[1].textContent === "") {
      row.children[1].textContent = playerId === socket.id ? "(valgt af dig)" : "(modspiller)";
      row.children[1].style.backgroundColor = "#DCEEFB";
    }
  });
});

socket.on("yourTurn", () => {
  isMyTurn = true;
  rollBtn.disabled = false;
});

socket.on("receiveMessage", ({ sender, message }) => {
  const entry = document.createElement("div");
  entry.innerHTML = `<strong>${sender}:</strong> ${message}`;
  chatMessages.appendChild(entry);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

rollBtn.addEventListener("click", rollDice);
window.onload = () => {
  updateStatus();
  renderScoreTable(currentMode);
};
