// api/websocket.js
const WebSocket = require('ws');

let participants = [];
let waitingParticipants = [];

const cors = require('cors');

// Configurações de CORS
app.use(cors({
    origin: '*', // Ou defina seu domínio específico
    methods: ['GET', 'POST'],
}));

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

let reconnectInterval;

socket.onclose = () => {
    console.log('Conexão WebSocket encerrada');
    // Tente reconectar a cada 5 segundos
    reconnectInterval = setInterval(() => {
        console.log('Tentando reconectar...');
        connectWebSocket();
    }, 5000);
};

function connectWebSocket() {
    const socket = new WebSocket(`wss://${window.location.host}/api/websocket`);
    // Repetir a configuração de eventos
    socket.onopen = () => {
        console.log('Conectado ao servidor WebSocket');
        socket.send(JSON.stringify({ type: 'ADD_PARTICIPANT', name: currentNick }));
        clearInterval(reconnectInterval); // Limpar o intervalo de reconexão
    };
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Participantes:', data.participants);
        console.log('Aguardando Participantes:', data.waitingParticipants);
        participants = data.participants;
        waitingParticipants = data.waitingParticipants;
        updateRoom();
    };
    socket.onerror = (error) => {
        console.error('Erro na conexão WebSocket:', error);
    };
    socket.onclose = () => {
        console.log('Conexão WebSocket encerrada');
        reconnectInterval = setInterval(connectWebSocket, 5000); // Reconectar após 5 segundos
    };
}

// Inicie a conexão WebSocket
connectWebSocket();

