const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ==== Sert les fichiers depuis la racine du projet ====
app.use(express.static(__dirname));
// Route pour le keep-alive
app.get('/keepalive', (req, res) => {
    res.send('ok');
});

// Route par défaut : envoie index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Génération d'un code de salon aléatoire
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

const rooms = {};

io.on('connection', (socket) => {
    console.log('Nouvelle connexion :', socket.id);

    socket.on('createRoom', () => {
        if (socket.room) {
            socket.emit('error', 'Vous êtes déjà dans un salon.');
            return;
        }
        let code;
        do {
            code = generateRoomCode();
        } while (rooms[code]);

        rooms[code] = {
            players: [socket.id],
            playerTurn: 1,
            gameOver: false
        };

        socket.room = code;
        socket.playerNumber = 1;
        socket.join(code);
        socket.emit('roomCreated', { code, playerNumber: 1 });
        console.log(`Salon ${code} créé par ${socket.id}`);
    });

    socket.on('joinRoom', (code) => {
        code = code.toUpperCase().trim();
        if (socket.room) {
            socket.emit('error', 'Vous êtes déjà dans un salon.');
            return;
        }
        const room = rooms[code];
        if (!room) {
            socket.emit('error', 'Salon introuvable.');
            return;
        }
        if (room.players.length >= 2) {
            socket.emit('error', 'Salon complet (2 joueurs max).');
            return;
        }

        room.players.push(socket.id);
        socket.room = code;
        socket.playerNumber = 2;
        socket.join(code);

        io.to(code).emit('gameStart', {
            player1: room.players[0],
            player2: room.players[1],
            currentTurn: 1
        });
        socket.emit('joinedRoom', { code, playerNumber: 2 });
        console.log(`${socket.id} a rejoint le salon ${code}`);
    });

    socket.on('makeMove', (data) => {
        const room = rooms[socket.room];
        if (!room || room.gameOver) return;
        if (room.playerTurn !== socket.playerNumber) {
            socket.emit('error', 'Ce n’est pas votre tour.');
            return;
        }
        const opponentId = room.players.find(id => id !== socket.id);
        if (opponentId) {
            io.to(opponentId).emit('opponentMove', data);
        }
        room.playerTurn = room.playerTurn === 1 ? 2 : 1;
        io.to(socket.room).emit('turnChange', { currentTurn: room.playerTurn });
    });

    socket.on('gameOver', (winner) => {
        const room = rooms[socket.room];
        if (room) {
            room.gameOver = true;
            io.to(socket.room).emit('gameOver', winner);
        }
    });

    socket.on('rematchRequest', () => {
        const room = rooms[socket.room];
        if (!room || !room.gameOver) return;
        const opponentId = room.players.find(id => id !== socket.id);
        if (opponentId) {
            io.to(opponentId).emit('rematchRequest');
        }
    });

    socket.on('rematchAccept', () => {
        const room = rooms[socket.room];
        if (!room) return;
        room.gameOver = false;
        room.playerTurn = 1;
        io.to(socket.room).emit('rematchStart');
    });

    socket.on('disconnect', () => {
        console.log('Déconnexion :', socket.id);
        const roomCode = socket.room;
        if (!roomCode) return;
        const room = rooms[roomCode];
        if (!room) return;
        const opponentId = room.players.find(id => id !== socket.id);
        if (opponentId) {
            io.to(opponentId).emit('opponentDisconnected');
        }
        setTimeout(() => {
            if (rooms[roomCode] && rooms[roomCode].players.length < 2) {
                delete rooms[roomCode];
                console.log(`Salon ${roomCode} supprimé (inactif).`);
            }
        }, 30000);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur Songo en ligne sur http://localhost:${PORT}`);
});