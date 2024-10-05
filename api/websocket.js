// api/websocket.js
const WebSocket = require('ws');

let participants = [];
let waitingParticipants = [];

module.exports = (req, res) => {
    if (req.method === 'GET') {
        const wss = new WebSocket.Server({ noServer: true });

        res.socket.server.on('upgrade', (request, socket, head) => {
            wss.handleUpgrade(request, socket, head, (ws) => {
                console.log('Novo cliente conectado');

                // Enviar a lista de participantes para o novo cliente
                ws.send(JSON.stringify({ participants, waitingParticipants }));

                ws.on('message', (message) => {
                    const data = JSON.parse(message);

                    if (data.type === 'ADD_PARTICIPANT') {
                        if (participants.length < 10) {
                            participants.push(data.name);
                        } else {
                            waitingParticipants.push(data.name);
                        }
                        broadcast();
                    } else if (data.type === 'REMOVE_PARTICIPANT') {
                        participants = participants.filter(p => p !== data.name);
                        waitingParticipants = waitingParticipants.filter(p => p !== data.name);
                        broadcast();
                    }
                });

                ws.on('close', () => {
                    console.log('Cliente desconectado');
                });
            });
        });
    }
};

function broadcast() {
    const message = JSON.stringify({ participants, waitingParticipants });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}
