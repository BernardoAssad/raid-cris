let participants = [];
let waitingParticipants = [];
let currentNick = localStorage.getItem('userNick') || '';

const maxParticipants = 10; // Adicione esta linha
const adminPassword = 'pokeraidcrisao'; // Adicione esta linha

let eventSource;
const enterButton = document.getElementById('enter-btn');
const exitButton = document.getElementById('exit-btn');
const nickInput = document.getElementById('nick-input');
const roomList = document.getElementById('room-list');
const waitingList = document.getElementById('waiting-list');
const statusDiv = document.getElementById('status');
const fullRoomNames = document.getElementById('full-room-names');
const clearButton = document.getElementById('clear-btn');
const showNamesButton = document.getElementById('show-names-btn');
const copyButton = document.getElementById('copy-btn');

function connectEventSource() {
    eventSource = new EventSource('/api/events');

    eventSource.onopen = () => {
        if (currentNick) {
            sendAction('JOIN', currentNick);
        }
    };

    eventSource.onmessage = (event) => {
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

    eventSource.onerror = (error) => {
        eventSource.close();
        setTimeout(connectEventSource, 5000);  // Tenta reconectar após 5 segundos
    };
}

connectEventSource();

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
        sendAction('CLEAR').then(() => {
            // Atualiza a sala após a limpeza
            updateRoom();
        });
    } else {
        alert('Senha incorreta! A fila não será limpa.');
    }
});


showNamesButton.addEventListener('click', () => {
    const password = prompt('Por favor, insira a senha de administrador para mostrar os nomes:');
    
    if (password === adminPassword) {
        displayFullRoomNames();
        displayCopyButton();
    } else {
        alert('Senha incorreta! Os nomes não serão exibidos.');
    }
});

function sendAction(type, nick, isMainQueue) {
    fetch('/api/action', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, nick, isMainQueue }),
    }).then(response => {
        if (!response.ok) {
            throw new Error('Falha ao enviar ação');
        }
        return response.json();
    }).then(data => {
        if (data.type === 'ERROR') {
            alert(data.message);
        }
    }).catch(error => {
        console.error('Erro ao enviar ação:', error);
        alert('Ocorreu um erro ao enviar a ação. Por favor, tente novamente.');
    });
}

enterButton.addEventListener('click', () => {
    const nick = nickInput.value.trim();
    if (nick === "") {
        alert('Por favor, insira um nick.');
        return;
    }

    sendAction('JOIN', nick);
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
        
        sendAction('LEAVE', currentNick);
        localStorage.removeItem('userNick');
        currentNick = '';

        exitButton.classList.add('hidden');
        enterButton.classList.remove('hidden');
        nickInput.disabled = false;
    }
});

function displayFullRoomNames() {
    // Exibe a lista de participantes
    fullRoomNames.classList.remove('hidden');
    
    // Define o texto a ser copiado no elemento correto
    const roomNamesElement = document.getElementById('room-names');
    roomNamesElement.innerText = 'Participantes: ' + participants.join(', ');

    // Mostra o botão de copiar
    copyButton.classList.remove('hidden');
}


function displayCopyButton() {
    copyButton.classList.remove('hidden');
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

document.getElementById('copy-btn').addEventListener('click', function() {
    const roomNamesElement = document.getElementById('room-names');
    const roomNamesText = roomNamesElement.innerText; // Obtém o texto do elemento

    console.log('Texto a ser copiado:', roomNamesText); // Adicione esta linha

    // Verifica se roomNamesText não está vazio
    if (roomNamesText) {
        // Copia o texto para a área de transferência
        navigator.clipboard.writeText(roomNamesText).then(function() {
            alert('Nomes copiados para a área de transferência!'); // Mensagem de confirmação
        }, function(err) {
            console.error('Erro ao copiar texto: ', err);
        });
    } else {
        alert('Nenhum nome para copiar!'); // Mensagem caso não haja texto
    }
});

