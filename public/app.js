let participants = [];
let waitingParticipants = [];
let currentNick = localStorage.getItem('userNick') || '';

const maxParticipants = 10;
const adminPassword = 'pokeraidcrisao';

const enterButton = document.getElementById('enter-btn');
const exitButton = document.getElementById('exit-btn');
const nickInput = document.getElementById('nick-input');
const roomList = document.getElementById('room-list');
const waitingList = document.getElementById('waiting-list');
const statusDiv = document.getElementById('status');
const fullRoomNames = document.getElementById('full-room-names');
const clearButton = document.getElementById('clear-btn');
const showNamesButton = document.getElementById('show-names-btn');

function startPolling() {
    pollServer();
    setInterval(pollServer, 5000); // Poll every 5 seconds
}

async function pollServer() {
    try {
        const response = await fetch('/api/poll');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        participants = data.participants;
        waitingParticipants = data.waitingParticipants;
        updateRoom();
    } catch (error) {
        console.error('Polling error:', error);
    }
}

function updateRoom() {
    console.log('Updating room. Participants:', participants, 'Waiting:', waitingParticipants);
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
            sendAction('REMOVE', participant, isMainQueue);
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
        sendAction('CLEAR');
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

async function sendAction(type, nick, isMainQueue) {
    try {
        const response = await fetch('/api/action', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ type, nick, isMainQueue }),
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        if (data.error) {
            alert(data.error);
        } else {
            pollServer(); // Immediately poll for updates after an action
        }
    } catch (error) {
        console.error('Error sending action:', error);
        alert('Não foi possível enviar a ação. Por favor, tente novamente em alguns instantes.');
    }
}

enterButton.addEventListener('click', () => {
    const nick = nickInput.value.trim();
    if (nick === "") {
        alert('Por favor, insira um nick.');
        return;
    }

    if (!participants.includes(nick) && !waitingParticipants.includes(nick)) {
        console.log('Sending entry request:', nick);
        sendAction('JOIN', nick);
        currentNick = nick;
        localStorage.setItem('userNick', currentNick);
        nickInput.value = '';
        exitButton.classList.remove('hidden');
        enterButton.classList.add('hidden');
    } else {
        alert('Você já está na sala ou na fila de espera.');
    }
});

exitButton.addEventListener('click', () => {
    if (currentNick !== '') {
        const confirmation = confirm('Você tem certeza de que deseja sair?');
        if (!confirmation) return;
        
        sendAction('LEAVE', currentNick);
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

// Initialize the room and start polling
startPolling();

// Check if the user is already in the room when loading the page
if (currentNick !== '') {
    nickInput.value = currentNick;
    nickInput.disabled = true;
    exitButton.classList.remove('hidden');
    enterButton.classList.add('hidden');
}