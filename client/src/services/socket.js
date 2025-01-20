import { io } from 'socket.io-client';

class SocketService {
  static instance = null;
  static isConnecting = false;

  static async connect() {
    if (this.instance?.connected) {
      return this.instance;
    }

    if (this.instance) {
      this.instance.close();
      this.instance = null;
    }

    if (this.isConnecting) {
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.instance?.connected) {
            clearInterval(checkInterval);
            resolve(this.instance);
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Bağlantı zaman aşımına uğradı'));
        }, 5000);
      });
    }

    this.isConnecting = true;

    try {
      // In production, connect to the same origin
      const serverUrl = import.meta.env.PROD 
        ? window.location.origin
        : (import.meta.env.VITE_SERVER_URL || 'http://localhost:3002');

      this.instance = io(serverUrl, {
        transports: ['websocket'],
        forceNew: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 3,
        timeout: 5000
      });

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Bağlantı zaman aşımına uğradı'));
        }, 5000);

        this.instance.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.instance.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      this.instance.on('disconnect', (reason) => {
        console.log('Socket bağlantısı kesildi:', reason);
        if (reason === 'io server disconnect') {
          this.connect();
        }
      });

      console.log('Socket bağlantısı başarılı');
      this.isConnecting = false;
      return this.instance;
    } catch (error) {
      console.error('Bağlantı hatası:', error);
      this.isConnecting = false;
      this.instance = null;
      throw error;
    }
  }

  static async createRoom() {
    const socket = await this.connect();
    return new Promise((resolve, reject) => {
      socket.emit('createRoom', (error, roomId) => {
        if (error) {
          console.error('Oda oluşturma hatası:', error);
          reject(new Error(error));
        } else {
          console.log('Oda başarıyla oluşturuldu:', roomId);
          resolve(roomId);
        }
      });
    });
  }

  static async joinRoom(roomId, username) {
    const socket = await this.connect();
    console.log('Odaya katılma isteği gönderiliyor:', { roomId, username });
    
    return new Promise((resolve, reject) => {
      socket.emit('joinRoom', { roomId, username }, (response) => {
        if (response.success) {
          console.log('Odaya başarıyla katılındı');
          resolve(response);
        } else {
          console.error('Odaya katılma hatası:', response.error);
          reject(new Error(response.error || 'Odaya katılma başarısız'));
        }
      });
    });
  }

  static isConnected() {
    return this.instance?.connected || false;
  }

  static onUserJoined(callback) {
    if (this.instance) {
      this.instance.off('userJoined');
      this.instance.on('userJoined', (users) => {
        console.log('Yeni kullanıcı katıldı:', users);
        callback(users);
      });
    }
  }

  static onUserLeft(callback) {
    if (this.instance) {
      this.instance.off('userLeft');
      this.instance.on('userLeft', (users) => {
        console.log('Kullanıcı ayrıldı:', users);
        callback(users);
      });
    }
  }

  static async vote(roomId, value) {
    const socket = await this.connect();
    return new Promise((resolve, reject) => {
      socket.emit('vote', { roomId, value }, (error) => {
        if (error) {
          console.error('Oylama hatası:', error);
          reject(new Error(error.message || 'Oy gönderilemedi'));
        } else {
          console.log('Oy başarıyla gönderildi');
          resolve();
        }
      });
    });
  }

  static onVoteUpdate(callback) {
    if (this.instance) {
      this.instance.off('voteUpdate');
      this.instance.on('voteUpdate', (data) => {
        console.log('Oy güncellendi:', data);
        callback(data);
      });
    }
  }

  static onVotingComplete(callback) {
    if (this.instance) {
      this.instance.off('votingComplete');
      this.instance.on('votingComplete', (result) => {
        console.log('Oylama tamamlandı:', result);
        callback(result);
      });
    }
  }

  static async startVoting(roomId) {
    const socket = await this.connect();
    return new Promise((resolve, reject) => {
      socket.emit('startVoting', { roomId }, (error) => {
        if (error) {
          console.error('Oylama başlatma hatası:', error);
          reject(new Error(error.message || 'Oylama başlatılamadı'));
        } else {
          console.log('Oylama başlatıldı');
          resolve();
        }
      });
    });
  }

  static async endVoting(roomId) {
    const socket = await this.connect();
    return new Promise((resolve, reject) => {
      socket.emit('endVoting', { roomId }, (error) => {
        if (error) {
          console.error('Oylama sonlandırma hatası:', error);
          reject(new Error(error));
        } else {
          console.log('Oylama sonlandırıldı');
          resolve();
        }
      });
    });
  }

  static onVotingStarted(callback) {
    if (this.instance) {
      this.instance.off('votingStarted');
      this.instance.on('votingStarted', () => {
        console.log('Oylama başladı');
        callback();
      });
    }
  }

  static onVotingEnded(callback) {
    if (this.instance) {
      this.instance.off('votingEnded');
      this.instance.on('votingEnded', () => {
        console.log('Oylama sona erdi');
        callback();
      });
    }
  }

  static disconnect() {
    if (this.instance) {
      console.log('Socket bağlantısı kapatılıyor...');
      this.instance.disconnect();
      this.instance = null;
    }
  }
}

export default SocketService; 