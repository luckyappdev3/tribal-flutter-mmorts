const { io } = require("socket.io-client");

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("✅ Connecté au serveur !");
  
  // On rejoint la room du village
  socket.emit("join-village", "18ad1049-b6c3-4680-8aae-03e4d885e932");
});

socket.on("build:finished", (data) => {
  console.log("🎉 NOTIFICATION REÇUE :", data);
  process.exit(0);
});

console.log("⏳ En attente de la fin de construction...");