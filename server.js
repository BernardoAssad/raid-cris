const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

let participants = [];
let waitingParticipants = [];
const maxParticipants = 10;

wss.on('connection', (ws) => {
    console.log('Novo cliente conectado');

    // Envia o estado atual para o novo cliente
    sendUpdate(ws);

    ws.on('message', (message) => {
        console.log('Mensagem recebida:', message);
        const data = JSON.parse(message);

        switch(data.type) {
            case 'JOIN':
                console.log('Solicitação de entrada:', data.nick);
                if (participants.includes(data.nick) || waitingParticipants.includes(data.nick)) {
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        message: 'Este nick já está na fila. Por favor, escolha outro.'
                    }));
                } else if (participants.length < maxParticipants) {
                    participants.push(data.nick);
                } else {
                    waitingParticipants.push(data.nick);
                }
                break;
            case 'LEAVE':
                participants = participants.filter(p => p !== data.nick);
                waitingParticipants = waitingParticipants.filter(p => p !== data.nick);
                moveFromWaitingToMain();
                break;
            case 'REMOVE':
                if (data.isMainQueue) {
                    participants = participants.filter(p => p !== data.nick);
                    moveFromWaitingToMain();
                } else {
                    waitingParticipants = waitingParticipants.filter(p => p !== data.nick);
                }
                break;
            case 'CLEAR':
                participants = [];
                moveFromWaitingToMain();
                break;
        }

        // Envia atualização para todos os clientes
        broadcastUpdate();
    });
});

function moveFromWaitingToMain() {
    while (participants.length < maxParticipants && waitingParticipants.length > 0) {
        participants.push(waitingParticipants.shift());
    }
}

function sendUpdate(ws) {
    ws.send(JSON.stringify({
        type: 'UPDATE',
        participants: participants,
        waitingParticipants: waitingParticipants
    }));
}

function broadcastUpdate() {
    console.log('Enviando atualização para todos os clientes');
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            sendUpdate(client);
        }
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});