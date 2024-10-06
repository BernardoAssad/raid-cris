const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const uri = 'mongodb+srv://raidcrisao:123@raidcris.yomp8.mongodb.net/?retryWrites=true&w=majority&appName=RaidCris';
const client = new MongoClient(uri);

async function getDb() {
    if (!db) {
      try {
        await client.connect();
        db = client.db('raidmanager');
        console.log('Connected to MongoDB');
      } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
      }
    }
    return db;
  }
  
  app.get('/api/poll', async (req, res) => {
    try {
      const db = await getDb();
      const participants = await db.collection('participants').find().toArray();
      const waitingParticipants = await db.collection('waitingParticipants').find().toArray();
  
      res.json({
        participants: participants.map(p => p.nick),
        waitingParticipants: waitingParticipants.map(p => p.nick)
      });
    } catch (error) {
      console.error('Error in poll endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

connectToDatabase();

const maxParticipants = 10;

app.get('/api/poll', async (req, res) => {
    console.log('API /api/poll chamada');
    try {
      console.log('Tentando acessar as coleções...');
      const participants = await db.collection('participants').find().toArray();
      const waitingParticipants = await db.collection('waitingParticipants').find().toArray();
  
      console.log('Coleções acessadas com sucesso!');
      console.log('Participants:', participants);
      console.log('Waiting participants:', waitingParticipants);
  
      res.json({
        participants: participants.map(p => p.nick),
        waitingParticipants: waitingParticipants.map(p => p.nick)
      });
    } catch (error) {
      console.error('Error in poll endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

app.post('/api/action', async (req, res) => {
  const { type, nick, isMainQueue } = req.body;
  console.log('Action received:', type, nick);

  try {
    switch(type) {
      case 'JOIN':
        await handleJoin(nick);
        break;
      case 'LEAVE':
        await handleLeave(nick);
        break;
      case 'REMOVE':
        await handleRemove(nick, isMainQueue);
        break;
      case 'CLEAR':
        await handleClear();
        break;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in action endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function handleJoin(nick) {
  const participants = await db.collection('participants').find().toArray();
  const waitingParticipants = await db.collection('waitingParticipants').find().toArray();

  if (participants.some(p => p.nick === nick) || waitingParticipants.some(p => p.nick === nick)) {
    throw new Error('Este nick já está na fila. Por favor, escolha outro.');
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;