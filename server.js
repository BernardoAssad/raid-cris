const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let participants = [];
let waitingParticipants = [];
const maxParticipants = 10;
let clients = [];

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });  

app.get('/api/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    const clientId = Date.now();
    const newClient = {
        id: clientId,
        res
    };
    clients.push(newClient);

    req.on('close', () => {
        console.log(`${clientId} Connection closed`);
        clients = clients.filter(client => client.id !== clientId);
    });

    sendUpdate(res);
});

app.post('/api/action', (req, res) => {
    const { type, nick } = req.body;
    console.log('Ação recebida:', type, nick);

    switch(type) {
        case 'JOIN':
            if (participants.includes(nick) || waitingParticipants.includes(nick)) {
                res.json({ type: 'ERROR', message: 'Este nick já está na fila. Por favor, escolha outro.' });
            } else if (participants.length < maxParticipants) {
                participants.push(nick);
            } else {
                waitingParticipants.push(nick);
            }
            break;
        case 'LEAVE':
            participants = participants.filter(p => p !== nick);
            waitingParticipants = waitingParticipants.filter(p => p !== nick);
            moveFromWaitingToMain();
            break;
        case 'REMOVE':
            if (req.body.isMainQueue) {
                participants = participants.filter(p => p !== nick);
                moveFromWaitingToMain();
            } else {
                waitingParticipants = waitingParticipants.filter(p => p !== nick);
            }
            break;
        case 'CLEAR':
            participants = [];
            moveFromWaitingToMain();
            break;
    }

    broadcastUpdate();
    res.json({ success: true });
});

function moveFromWaitingToMain() {
    while (participants.length < maxParticipants && waitingParticipants.length > 0) {
        participants.push(waitingParticipants.shift());
    }
}

function sendUpdate(res) {
    res.write(`data: ${JSON.stringify({
        type: 'UPDATE',
        participants: participants,
        waitingParticipants: waitingParticipants
    })}\n\n`);
}

function broadcastUpdate() {
    console.log('Enviando atualização para todos os clientes');
    clients.forEach(client => sendUpdate(client.res));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});