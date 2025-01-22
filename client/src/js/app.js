// Socket.io bağlantısı
const socket = io();
let pokerTable;

// Sayfa yüklendiğinde
window.onload = function() {
    const container = document.getElementById('pokerTable');
    pokerTable = new PokerTable3D(container);
};

// Fonksiyonları global scope'a taşıyalım
window.createRoom = function() {
    const username = document.getElementById('createUsername').value.trim();
    
    if (!username) {
        showNotification('Lütfen kullanıcı adınızı girin', 'warning');
        return;
    }
    
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    socket.emit('joinRoom', { roomId, username, isHost: true });
    showNotification('Oda oluşturuluyor...', 'info');
}

window.joinRoom = function() {
    const roomId = document.getElementById('joinRoomId').value.trim().toUpperCase();
    const username = document.getElementById('joinUsername').value.trim();
    
    if (!roomId || !username) {
        showNotification('Lütfen oda ID ve kullanıcı adınızı girin', 'warning');
        return;
    }
    
    socket.emit('joinRoom', { roomId, username, isHost: false });
}

// Socket olaylarını dinle
socket.on('roomError', (error) => {
    showNotification(error.message, 'error');
});

socket.on('joinSuccess', (data) => {
    document.getElementById('loginPage').style.display = 'none';
    showNotification(`${data.roomId} odasına başarıyla katıldınız!`, 'success');
    pokerTable.setRoomId(data.roomId);
});

socket.on('updateUsers', ({ users, count }) => {
    // Sandalye sayısını güncelle
    pokerTable.updateChairs(count);
    
    // Kullanıcıları sandalyelere yerleştir
    users.forEach((user, index) => {
        pokerTable.addPlayer(index, user.username, true);
    });
});

// Bildirim gösterme
function showNotification(message, type = 'error') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let icon = '❌';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'info') icon = 'ℹ️';

    notification.innerHTML = `
        <span class="notification-icon">${icon}</span>
        <span class="notification-message">${message}</span>
    `;

    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
}

function showPokerRoom(roomId, username, isHost) {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('pokerPage').style.display = 'block';
    document.getElementById('currentRoomId').textContent = roomId;
    
    // Host kontrollerini göster/gizle
    document.getElementById('hostControls').style.display = isHost ? 'block' : 'none';
}

// Boş sandalyeleri oluştur
function createEmptyChairs() {
    document.querySelectorAll('.player-position').forEach(pos => {
        pos.innerHTML = `
            <div class="chair chair-empty">
                <div class="chair-back"></div>
                <div class="chair-seat"></div>
            </div>
        `;
    });
}

// Oyuncu ekle
function addPlayer(username, position, isHost = false) {
    const playerPosition = document.querySelector(`.position-${position}`);
    if (playerPosition) {
        playerPosition.innerHTML = `
            <div class="chair active">
                <div class="chair-back"></div>
                <div class="chair-seat"></div>
                <div class="player-info">
                    <div class="player-name">${username} ${isHost ? '👑' : ''}</div>
                    <div class="player-card">•••</div>
                </div>
            </div>
        `;
    }
}

function startVoting() {
    document.querySelector('#hostControls button:first-child').style.display = 'none';
    document.querySelector('#hostControls button:last-child').style.display = 'inline-block';
    // TODO: Socket.io ile oylama başlatma
}

function endVoting() {
    document.querySelector('#hostControls button:first-child').style.display = 'inline-block';
    document.querySelector('#hostControls button:last-child').style.display = 'none';
    // TODO: Socket.io ile oylama bitirme
}

function updateUserCount(count) {
    document.querySelector('.center-info p').textContent = `${count} Kullanıcı`;
} 