// Socket.io bağlantısı
const socket = io();
let pokerTable;

// Global değişkenler
let currentRoomId = null;
let isHost = false;
let hasVoted = false;
let votingActive = false;
let users = []; // Kullanıcıları global olarak tutalım

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
    currentRoomId = data.roomId;
    isHost = data.isHost;
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('hostControls').style.display = isHost ? 'block' : 'none';
    
    // Oda ID'si için kopyalama butonu ekle
    const roomIdDiv = document.createElement('div');
    roomIdDiv.id = 'roomIdDisplay';
    roomIdDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        background: rgba(27, 94, 32, 0.9);
        padding: 10px 15px;
        border-radius: 8px;
        color: white;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
    `;
    roomIdDiv.innerHTML = `
        <span>Oda: ${data.roomId}</span>
        <button onclick="copyRoomId('${data.roomId}')" style="
            background: white;
            color: #1B5E20;
            border: none;
            border-radius: 4px;
            padding: 5px 10px;
            cursor: pointer;
            font-size: 0.9rem;
        ">
            📋 Kopyala
        </button>
    `;
    document.body.appendChild(roomIdDiv);

    showNotification(`${data.roomId} odasına başarıyla katıldınız!`, 'success');
    pokerTable.setRoomId(data.roomId);
});

socket.on('updateUsers', ({ users: updatedUsers, count }) => {
    users = updatedUsers; // Global users'ı güncelle
    pokerTable.updateChairs(count);
    
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

// Puanlama başlat
window.startVoting = function() {
    if (!isHost) return;
    socket.emit('startVoting', currentRoomId);
    document.querySelector('.start-voting').style.display = 'none';
    document.querySelector('.end-voting').style.display = 'block';
    document.querySelector('.reset-voting').style.display = 'none';
    votingActive = true;
}

// Puanlama bitir
window.endVoting = function() {
    if (!isHost) return;
    socket.emit('endVoting', currentRoomId);
    document.querySelector('.start-voting').style.display = 'none';
    document.querySelector('.end-voting').style.display = 'none';
    document.querySelector('.reset-voting').style.display = 'block';
    votingActive = false;
}

// Oy kullan
window.vote = function(score) {
    if (hasVoted) {
        showNotification('Zaten oy kullandınız!', 'warning');
        return;
    }
    
    socket.emit('vote', {
        roomId: currentRoomId,
        score: score
    });
    
    hasVoted = true;
    // Kendi oyumuz için de sadece tik işareti gösterelim
    const userIndex = users.findIndex(u => u.id === socket.id);
    if (userIndex !== -1) {
        pokerTable.showVoteCheck(userIndex);
    }
    
    // Kullanılan oyu vurgula
    const buttons = document.querySelectorAll('#votingButtons button');
    buttons.forEach(btn => {
        if (btn.textContent === score.toString()) {
            btn.style.background = '#1B5E20';
            btn.style.color = 'white';
        }
    });
}

// Socket olaylarını dinle
socket.on('vote', (data) => {
    const { userId, position, score } = data;
    if (!votingActive) return;
    pokerTable.showVoteCheck(position); // Sadece tik işaretini göster, puanı gösterme
});

socket.on('votingStarted', () => {
    hasVoted = false;
    votingActive = true;
    showNotification('Puanlama başladı!', 'info');
    showVotingButtons();
    pokerTable.clearAllVotes(); // Önceki puanları temizle
    pokerTable.clearAllChecks(); // Önceki tikleri temizle
});

socket.on('votingEnded', (results) => {
    const { votes, average, finalScore } = results;
    votingActive = false;
    
    // Önce tüm tikleri temizle
    pokerTable.clearAllChecks();
    
    // Sonra tüm oyları göster
    votes.forEach(([userId, score]) => {
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            pokerTable.showPlayerVote(userIndex, score);
        }
    });
    
    // Sonuçları göster
    const voteValues = votes.map(([_, score]) => score);
    showVotingResults(voteValues, average, finalScore);
    hideVotingButtons();
});

socket.on('votingReset', () => {
    pokerTable.clearAllVotes();
    pokerTable.clearAllChecks();
    hideVotingButtons();
    showNotification('Puanlama sıfırlandı!', 'info');
});

// Oylama sonuçlarını gösteren fonksiyon
function showVotingResults(votes, average, finalScore) {
    // Varsa eski sonuç kutusunu kaldır
    const existingResults = document.getElementById('votingResults');
    if (existingResults) {
        existingResults.remove();
    }

    const resultsDiv = document.createElement('div');
    resultsDiv.id = 'votingResults';
    resultsDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(27, 94, 32, 0.95);
        padding: 20px;
        border-radius: 12px;
        color: white;
        text-align: center;
        z-index: 1000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        min-width: 300px;
    `;

    // Oyları sırala
    const sortedVotes = [...votes].sort((a, b) => a - b);

    resultsDiv.innerHTML = `
        <h2 style="margin: 0 0 15px 0;">Puanlama Sonuçları</h2>
        <div style="margin: 10px 0;">
            <strong>Verilen Oylar:</strong><br>
            <span style="font-size: 20px;">${sortedVotes.join(' - ')}</span>
        </div>
        <div style="margin: 15px 0;">
            <strong>Ortalama:</strong><br>
            <span style="font-size: 24px;">${average.toFixed(1)}</span>
        </div>
        <div style="margin: 15px 0;">
            <strong>Final Puan:</strong><br>
            <span style="font-size: 32px; font-weight: bold; color: #4CAF50;">${finalScore}</span>
            <br>
            <span style="font-size: 14px; opacity: 0.8;">(En Yakın Fibonacci)</span>
        </div>
        <button onclick="this.parentElement.remove()" style="
            margin-top: 15px;
            padding: 8px 16px;
            background: white;
            color: #1B5E20;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.2s;
        ">Kapat</button>
    `;

    document.body.appendChild(resultsDiv);
    
    // 10 saniye sonra otomatik kapat
    setTimeout(() => {
        if (document.getElementById('votingResults')) {
            document.getElementById('votingResults').remove();
        }
    }, 10000);
}

function showVotingButtons() {
    const fibNumbers = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
    const votingDiv = document.createElement('div');
    votingDiv.id = 'votingButtons';
    
    fibNumbers.forEach(num => {
        const btn = document.createElement('button');
        btn.textContent = num;
        btn.onclick = () => vote(num);
        votingDiv.appendChild(btn);
    });

    document.body.appendChild(votingDiv);
}

function hideVotingButtons() {
    const votingDiv = document.getElementById('votingButtons');
    if (votingDiv) {
        votingDiv.remove();
    }
}

// Kopyalama fonksiyonu
window.copyRoomId = function(roomId) {
    navigator.clipboard.writeText(roomId).then(() => {
        showNotification('Oda ID kopyalandı!', 'success');
    }).catch(() => {
        showNotification('Kopyalama başarısız!', 'error');
    });
}

window.resetVoting = function() {
    if (!isHost) return;
    pokerTable.clearAllVotes();
    pokerTable.clearAllChecks();
    document.querySelector('.start-voting').style.display = 'block';
    document.querySelector('.end-voting').style.display = 'none';
    document.querySelector('.reset-voting').style.display = 'none';
    socket.emit('resetVoting', currentRoomId);
} 