const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

let db;

async function connectToDatabase() {
  try {
    await client.connect();
    db = client.db('raidmanager');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
  }
}

connectToDatabase();

const maxParticipants = 10;

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  ws.on('message', async (message) => {
    const data = JSON.parse(message);
    console.log('Received:', data);

    switch (data.type) {
      case 'JOIN':
        await handleJoin(data.nick);
        break;
      case 'LEAVE':
        await handleLeave(data.nick);
        break;
      case 'REMOVE':
        await handleRemove(data.nick, data.isMainQueue);
        break;
      case 'CLEAR':
        await handleClear();
        break;
    }

    broadcastUpdate();
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });

  sendUpdate(ws);
});

async function handleJoin(nick) {
  const participants = await db.collection('participants').find().toArray();
  const waitingParticipants = await db.collection('waitingParticipants').find().toArray();

  if (participants.some(p => p.nick === nick) || waitingParticipants.some(p => p.nick === nick)) {
    return { type: 'ERROR', message: 'Este nick já está na fila. Por favor, escolha outro.' };
  }

  if (participants.length < maxParticipants) {
    await db.collection('participants').insertOne({ nick });
  } else {
    await db.collection('waitingParticipants').insertOne({ nick });
  }
}

async function handleLeave(nick) {
  await db.collection('participants').deleteOne({ nick });
  await db.collection('waitingParticipants').deleteOne({ nick });
  await moveFromWaitingToMain();
}

async function handleRemove(nick, isMainQueue) {
  if (isMainQueue) {
    await db.collection('participants').deleteOne({ nick });
    await moveFromWaitingToMain();
  } else {
    await db.collection('waitingParticipants').deleteOne({ nick });
  }
}

async function handleClear() {
  await db.collection('participants').deleteMany({});
  await moveFromWaitingToMain();
}

async function moveFromWaitingToMain() {
  const participants = await db.collection('participants').find().toArray();
  const waitingParticipants = await db.collection('waitingParticipants').find().toArray();

  while (participants.length < maxParticipants && waitingParticipants.length > 0) {
    const participant = waitingParticipants.shift();
    await db.collection('participants').insertOne(participant);
    await db.collection('waitingParticipants').deleteOne({ _id: participant._id });
  }
}

async function sendUpdate(ws) {
  const participants = await db.collection('participants').find().toArray();
  const waitingParticipants = await db.collection('waitingParticipants').find().toArray();

  const data = JSON.stringify({
    type: 'UPDATE',
    participants: participants.map(p => p.nick),
    waitingParticipants: waitingParticipants.map(p => p.nick)
  });

  ws.send(data);
}

async function broadcastUpdate() {
  const participants = await db.collection('participants').find().toArray();
  const waitingParticipants = await db.collection('waitingParticipants').find().toArray();

  const data = JSON.stringify({
    type: 'UPDATE',
    participants: participants.map(p => p.nick),
    waitingParticipants: waitingParticipants.map(p => p.nick)
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;