const maxParticipants = 10;
const adminPassword = 'pokeraidcrisao'; 
const exitButton = document.getElementById('exit-btn');
const enterButton = document.getElementById('enter-btn');
const nickInput = document.getElementById('nick-input');
const roomList = document.getElementById('room-list');
const waitingList = document.getElementById('waiting-list');
const statusDiv = document.getElementById('status');
const fullRoomNames = document.getElementById('full-room-names');
const clearButton = document.getElementById('clear-btn');
const showNamesButton = document.getElementById('show-names-btn');

let participants = [];
let waitingParticipants = [];
let currentNick = localStorage.getItem('userNick') || ''; 

// Conectando ao servidor WebSocket
const socket = new WebSocket('wss://your-websocket-server-url');

socket.onopen = () => {
    console.log('Conectado ao servidor WebSocket');
    if (currentNick) {
        socket.send(JSON.stringify({ type: 'JOIN', nick: currentNick }));
    }
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch(data.type) {
        case 'UPDATE':
            participants = data.participants;
            waitingParticipants = data.waitingParticipants;
            updateRoom();
            break;
        case 'ERROR':
            alert(data.message);
            break;
    }
};

socket.onerror = (error) => {
    console.error('Erro na conexão WebSocket:', error);
};

socket.onclose = () => {
    console.log('Conexão WebSocket encerrada');
};

function updateRoom() {
    roomList.innerHTML = '';
    waitingList.innerHTML = '';

    if (participants.length === 0) {
        roomList.innerHTML = '<li>Nenhum participante na sala.</li>';
    }

    participants.forEach((participant, index) => {
        const listItem = createParticipantListItem(participant, index, true);
        roomList.appendChild(listItem);
    });

    waitingParticipants.forEach((participant, index) => {
        const listItem = createParticipantListItem(participant, index + maxParticipants, false);
        waitingList.appendChild(listItem);
    });

    checkRoomStatus();
}

function createParticipantListItem(participant, index, isMainQueue) {
    const listItem = document.createElement('li');
    listItem.innerText = `${index + 1}. ${participant}`;
    
    const deleteIcon = document.createElement('span');
    deleteIcon.innerHTML = '🗑️';
    deleteIcon.style.cursor = 'pointer';
    deleteIcon.addEventListener('click', () => {
        const password = prompt('Por favor, insira a senha de administrador para remover este participante:');
        if (password === adminPassword) {
            socket.send(JSON.stringify({ 
                type: 'REMOVE', 
                nick: participant, 
                isMainQueue: isMainQueue 
            }));
        } else {
            alert('Senha incorreta! O participante não será removido.');
        }
    });

    listItem.appendChild(deleteIcon);
    return listItem;
}

function checkRoomStatus() {
    if (participants.length === maxParticipants) {
        statusDiv.innerText = 'Sala principal cheia. Novos participantes entrarão na fila de espera.';
    } else {
        statusDiv.innerText = 'Sala aberta. Aguarde mais treinadores.';
    }

    clearButton.classList.toggle('hidden', participants.length === 0);
    showNamesButton.classList.toggle('hidden', participants.length === 0);
}

clearButton.addEventListener('click', () => {
    const password = prompt('Por favor, insira a senha de administrador para limpar a fila principal:');
    
    if (password === adminPassword) {
        socket.send(JSON.stringify({ type: 'CLEAR' }));
    } else {
        alert('Senha incorreta! A fila não será limpa.');
    }
});

showNamesButton.addEventListener('click', () => {
    const password = prompt('Por favor, insira a senha de administrador para mostrar os nomes:');
    
    if (password === adminPassword) {
        displayFullRoomNames();
    } else {
        alert('Senha incorreta! Os nomes não serão exibidos.');
    }
});

enterButton.addEventListener('click', () => {
    const nick = nickInput.value.trim();
    if (nick === "") {
        alert('Por favor, insira um nick.');
        return;
    }

    socket.send(JSON.stringify({ type: 'JOIN', nick: nick }));
    currentNick = nick;
    localStorage.setItem('userNick', currentNick);
    nickInput.value = '';
    exitButton.classList.remove('hidden');
    enterButton.classList.add('hidden');
});

exitButton.addEventListener('click', () => {
    if (currentNick !== '') {
        const confirmation = confirm('Você tem certeza de que deseja sair?');
        if (!confirmation) return;
        
        socket.send(JSON.stringify({ type: 'LEAVE', nick: currentNick }));
        localStorage.removeItem('userNick');
        currentNick = '';

        exitButton.classList.add('hidden');
        enterButton.classList.remove('hidden');
        nickInput.disabled = false;
    }
});

function displayFullRoomNames() {
    fullRoomNames.classList.remove('hidden');
    fullRoomNames.innerText = 'Participantes: ' + participants.join(', ');
}

// Inicializa a sala
updateRoom();

// Verifica se o usuário já está na sala ao carregar a página
if (currentNick !== '') {
    nickInput.value = currentNick;
    nickInput.disabled = true;
    exitButton.classList.remove('hidden');
    enterButton.classList.add('hidden');
}