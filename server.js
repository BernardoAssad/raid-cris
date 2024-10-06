const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });

let participants = [];
let waitingParticipants = [];
const maxParticipants = 10;

server.on('connection', (socket) => {
    console.log('New client connected');

    // Send current state to the new client
    socket.send(JSON.stringify({
        type: 'UPDATE',
        participants: participants,
        waitingParticipants: waitingParticipants
    }));

    socket.on('message', (message) => {
        const data = JSON.parse(message);

        switch(data.type) {
            case 'JOIN':
                if (participants.includes(data.nick) || waitingParticipants.includes(data.nick)) {
                    socket.send(JSON.stringify({
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

        // Broadcast updated state to all clients
        broadcast({
            type: 'UPDATE',
            participants: participants,
            waitingParticipants: waitingParticipants
        });
    });
});

function moveFromWaitingToMain() {
    while (participants.length < maxParticipants && waitingParticipants.length > 0) {
        participants.push(waitingParticipants.shift());
    }
}

function broadcast(message) {
    server.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

console.log('WebSocket server is running on port 8080');