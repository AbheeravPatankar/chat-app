const { io } = require("socket.io-client");
const readline = require("readline");

const socket = io("http://localhost:3000");
let availableClients = {};
let selectedClientId = null;

// Set up console interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Connection established
socket.on("connect", () => {
  console.log("Connected to server with ID:", socket.id);
  console.log("Type 'list' to see available clients");
  console.log("Type 'select [id]' to select a client to message");
  console.log("After selecting a client, just type your message to send");
});

// Receive list of connected clients
socket.on("client-list", (clients) => {
  availableClients = clients;
  console.log("\nAvailable clients:");
  listClients();
});

// Get updates when clients connect/disconnect
socket.on("client-list-update", (clients) => {
  availableClients = clients;
  console.log("\nClient list updated:");
  listClients();
});

// Receive private messages
socket.on("private-message", (data) => {
  console.log(
    `\n[${new Date(data.timestamp).toLocaleTimeString()}] Message from ${
      data.from_id
    }: ${data.message}`
  );
  rl.prompt();
});

// Receive broadcast messages
socket.on("broadcast", (data) => {
  console.log(`\n[BROADCAST] ${data.from_id}: ${data.message}`);
  rl.prompt();
});

// Message delivery confirmations
socket.on("message-delivered", (data) => {
  console.log(`Message delivered to ${data.to_id}`);
});

socket.on("delivery-failed", (data) => {
  console.log(`Failed to deliver message to ${data.to_id}: ${data.reason}`);
});

// Helper function to list available clients
function listClients() {
  for (const id in availableClients) {
    if (id !== socket.id) {
      console.log(`- ${id} (${availableClients[id].username})`);
    }
  }
  rl.prompt();
}

// Process user input
rl.setPrompt("> ");
rl.prompt();

rl.on("line", (input) => {
  // Command: List available clients
  if (input.trim() === "list") {
    console.log("Available clients:");
    listClients();
  }
  // Command: Select a client to message
  else if (input.startsWith("select ")) {
    const clientId = input.substring(7).trim();
    if (availableClients[clientId] && clientId !== socket.id) {
      selectedClientId = clientId;
      console.log(
        `Now messaging: ${clientId} (${availableClients[clientId].username})`
      );
    } else {
      console.log("Invalid client ID. Use 'list' to see available clients.");
    }
    rl.prompt();
  }
  // Send a message to the selected client
  else if (selectedClientId && input.trim() !== "") {
    const messageData = {
      to_id: selectedClientId,
      from_id: socket.id,
      message: input.trim(),
      timestamp: Date.now(),
    };

    socket.emit("private-message", messageData);
    console.log(`Message sent to ${selectedClientId}`);
    rl.prompt();
  }
  // No client selected
  else if (input.trim() !== "") {
    console.log("No client selected. Use 'select [id]' to choose a recipient.");
    rl.prompt();
  } else {
    rl.prompt();
  }
});

// Handle disconnection
socket.on("disconnect", () => {
  console.log("Disconnected from server");
});

// Keep the process running
process.on("SIGINT", () => {
  console.log("\nDisconnecting...");
  socket.disconnect();
  process.exit(0);
});
