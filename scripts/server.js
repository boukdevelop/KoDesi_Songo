// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Pour servir les fichiers statiques (ton HTML/CSS/JS)
app.use(express.static(path.join(__dirname, 'public')));

// Route par défaut pour le jeu
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Génération d'un code de salon aléatoire (4 caractères)
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// État des salons
const rooms = {}; // { code: { players: [], playerTurn: 1, gameOver: false } }

// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
    console.log('Nouvelle connexion :', socket.id);

    // --- CRÉER UN SALON ---
    socket.on('createRoom', () => {
        // Vérifier si le joueur n'est pas déjà dans un salon
        if (socket.room) {
            socket.emit('error', 'Vous êtes déjà dans un salon.');
            return;
        }

        let code;
        do {
            code = generateRoomCode();
        } while (rooms[code]); // S'assurer que le code est unique

        rooms[code] = {
            players: [socket.id],
            playerTurn: 1, // Le joueur 1 commence toujours
            gameOver: false
        };

        socket.room = code;
        socket.playerNumber = 1;
        socket.join(code);

        socket.emit('roomCreated', { code, playerNumber: 1 });
        console.log(`Salon ${code} créé par ${socket.id}`);
    });

    // --- REJOINDRE UN SALON ---
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

        // Informer les deux joueurs que la partie peut commencer
        io.to(code).emit('gameStart', {
            player1: room.players[0],
            player2: room.players[1],
            currentTurn: 1 // le joueur 1 commence
        });

        socket.emit('joinedRoom', { code, playerNumber: 2 });
        console.log(`${socket.id} a rejoint le salon ${code}`);
    });

    // --- JOUER UN COUP ---
    socket.on('makeMove', (data) => {
        const room = rooms[socket.room];
        if (!room || room.gameOver) return;

        // Vérifier que c'est bien le tour de ce joueur
        if (room.playerTurn !== socket.playerNumber) {
            socket.emit('error', 'Ce n’est pas votre tour.');
            return;
        }

        // Le serveur relaie le coup à l'adversaire
        // data doit contenir : row, col (et éventuellement toute information de l'état du jeu)
        // Pour une validation minimale, on pourrait vérifier la case, mais on fait confiance au client pour l'instant
        const opponentId = room.players.find(id => id !== socket.id);
        if (opponentId) {
            io.to(opponentId).emit('opponentMove', data);
        }

        // Passer le tour à l'autre joueur
        room.playerTurn = room.playerTurn === 1 ? 2 : 1;

        // Notifier les deux joueurs du changement de tour
        io.to(socket.room).emit('turnChange', { currentTurn: room.playerTurn });
    });

    // --- FIN DE PARTIE (signalée par un client) ---
    socket.on('gameOver', (winner) => {
        const room = rooms[socket.room];
        if (room) {
            room.gameOver = true;
            io.to(socket.room).emit('gameOver', winner); // winner = 1 ou 2
        }
    });

    // --- DEMANDE DE REVANCHE ---
    socket.on('rematchRequest', () => {
        const room = rooms[socket.room];
        if (!room || !room.gameOver) return;

        // Envoyer une demande de revanche à l'autre joueur
        const opponentId = room.players.find(id => id !== socket.id);
        if (opponentId) {
            io.to(opponentId).emit('rematchRequest');
        }
    });

    socket.on('rematchAccept', () => {
        const room = rooms[socket.room];
        if (!room) return;

        // Réinitialiser l'état du salon pour une nouvelle partie
        room.gameOver = false;
        room.playerTurn = 1; // le joueur 1 recommence
        io.to(socket.room).emit('rematchStart');
    });

    // --- DÉCONNEXION ---
    socket.on('disconnect', () => {
        console.log('Déconnexion :', socket.id);
        const roomCode = socket.room;
        if (!roomCode) return;

        const room = rooms[roomCode];
        if (!room) return;

        // Prévenir l'autre joueur
        const opponentId = room.players.find(id => id !== socket.id);
        if (opponentId) {
            io.to(opponentId).emit('opponentDisconnected');
        }

        // Nettoyer le salon après un délai (pour permettre une éventuelle reconnexion)
        setTimeout(() => {
            if (rooms[roomCode] && rooms[roomCode].players.length < 2) {
                // Si toujours un seul joueur après 30s, on supprime le salon
                delete rooms[roomCode];
                console.log(`Salon ${roomCode} supprimé (inactif).`);
            }
        }, 30000);
    });

    // --- GESTION DES ERREURS ---
    socket.on('error', (msg) => {
        console.error('Erreur socket :', msg);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur Songo en ligne sur le port ${PORT}`);
});