// api/websocket.js
const WebSocket = require('ws');
const cors = require('cors');

let participants = [];
let waitingParticipants = [];

const cors = require('cors');
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
}));

module.exports = (req, res) => {
    // Adicionar cabeçalhos CORS
    res.setHeader('Access-Control-Allow-Origin', '*'); // ou defina o domínio específico
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

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
                        if (!participants.includes(data.name) && !waitingParticipants.includes(data.name)) {
                            if (participants.length < 10) {
                                participants.push(data.name);
                            } else {
                                waitingParticipants.push(data.name);
                            }
                            broadcast();
                        } else {
                            // Enviar mensagem de erro se o participante já existir
                            ws.send(JSON.stringify({ error: 'Participante já existe na sala ou na fila de espera.' }));
                        }
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
    } else {
        // Se não for um método GET, envie um erro
        res.status(405).end(); // Método não permitido
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
