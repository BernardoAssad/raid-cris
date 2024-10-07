let participants = [];
let waitingParticipants = [];
let currentNick = localStorage.getItem('userNick') || '';

const maxParticipants = 10; // Adicione esta linha
let adminPassword;

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

function fetchAdminPassword() {
    fetch('/api/admin-password')
        .then(response => response.json())
        .then(data => {
            adminPassword = data.password;
        })
        .catch(error => console.error('Erro ao buscar a senha do administrador:', error));
}

fetchAdminPassword();

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

function showPasswordModal(callback) {
    const passwordModal = document.getElementById('password-modal');
    const adminPasswordInput = document.getElementById('admin-password-input');
    const confirmPasswordBtn = document.getElementById('confirm-password-btn');
    const cancelPasswordBtn = document.getElementById('cancel-password-btn');

    // Exibe o modal
    passwordModal.classList.remove('hidden');

    // Define o comportamento dos botões
    confirmPasswordBtn.onclick = () => {
        const enteredPassword = adminPasswordInput.value;
        passwordModal.classList.add('hidden'); // Esconde o modal após confirmar
        adminPasswordInput.value = ''; // Limpa o campo de senha
        callback(enteredPassword); // Chama o callback com a senha inserida
    };

    cancelPasswordBtn.onclick = () => {
        passwordModal.classList.add('hidden'); // Esconde o modal se o usuário cancelar
        adminPasswordInput.value = ''; // Limpa o campo de senha
        callback(null); // Cancela a ação
    };
}

function askAdminPassword(callback) {
    showPasswordModal(callback);
}

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
        askAdminPassword((enteredPassword) => {
            if (enteredPassword === adminPassword) {
                sendAction('REMOVE', participant, isMainQueue);
            } else {
                alert('Senha incorreta! O participante não será removido.');
            }
        });
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
    askAdminPassword((enteredPassword) => {
        if (enteredPassword === adminPassword) {
            sendAction('CLEAR').then(() => {
                updateRoom();
            });
        } else {
            alert('Senha incorreta! A fila não será limpa.');
        }
    });
});

showNamesButton.addEventListener('click', () => {
    askAdminPassword((enteredPassword) => {
        if (enteredPassword === adminPassword) {
            displayFullRoomNames();
        } else {
            alert('Senha incorreta! Os nomes não serão exibidos.');
        }
    });
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
    const fullRoomNames = document.getElementById('full-room-names');
    fullRoomNames.classList.remove('hidden');
    
    // Define o texto a ser exibido no elemento
    const roomNamesElement = document.getElementById('room-names');
    roomNamesElement.innerText = 'Participantes: ' + participants.join(', ');

    // Adiciona a funcionalidade de cópia ao clicar no elemento
    roomNamesElement.style.cursor = 'pointer';
    roomNamesElement.title = 'Clique para copiar os nomes';
    roomNamesElement.onclick = function() {
        // Copia apenas os nomes dos participantes
        copyTextToClipboard(participants.join(', '));
    };
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

function copyTextToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        alert('Nomes copiados para a área de transferência!');
    }).catch(function(err) {
        console.error('Erro ao copiar texto: ', err);
        fallbackCopyTextToClipboard(text);
    });
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        const msg = successful ? 'Nomes copiados para a área de transferência!' : 'Falha ao copiar os nomes.';
        alert(msg);
    } catch (err) {
        console.error('Fallback: Erro ao copiar', err);
        alert('Erro ao copiar os nomes. Por favor, copie manualmente.');
    }

    document.body.removeChild(textArea);
}