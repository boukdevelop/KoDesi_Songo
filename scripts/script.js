// =====================================
// ÉTAT DU JEU (respectant les règles)
// =====================================
const gameState = {
    board: [
        [5,5,5,5,5,5,5], // rangée 0 = haut (Joueur 2)
        [5,5,5,5,5,5,5]  // rangée 1 = bas  (Joueur 1)
    ],
    scores: { player1: 0, player2: 0 },
    currentPlayer: 1,     // 1 = bas, 2 = haut
    gameOver: false,
    gameMode: 'pvp',      // 'pvp', 'pve', 'online'
    history: [],
    waitingForAI: false,
    waitingForServer: false, // bloque les clics en ligne tant que le serveur n'a pas changé le tour
    onlinePlayerNumber: null // 1 ou 2 en mode online
};

// ================ CYCLE DE SEMIS ================
const cycle = [
    [1,6],[1,5],[1,4],[1,3],[1,2],[1,1],[1,0],  // bas de droite à gauche
    [0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6]   // haut de gauche à droite
];

function cycleIndex(row, col) {
    return cycle.findIndex(([r,c]) => r === row && c === col);
}

function nextHole(row, col) {
    const idx = cycleIndex(row, col);
    const nextIdx = (idx + 1) % 14;
    return cycle[nextIdx];
}

// ================ FONCTIONS D'AFFICHAGE ================
function updateBoardDisplay() {
    const cells = document.querySelectorAll('td');
    cells.forEach((cell, index) => {
        const row = Math.floor(index / 7);
        const col = index % 7;
        cell.textContent = gameState.board[row][col];
    });
}

function updateScoreDisplay() {
    document.getElementById('score1').textContent = gameState.scores.player1;
    document.getElementById('score2').textContent = gameState.scores.player2;
}

function updateAllDisplay() {
    updateBoardDisplay();
    updateScoreDisplay();
}

// Historique dans .info
function addHistoryEntry(msg) {
    gameState.history.unshift(msg);
    const infoDiv = document.querySelector('.info');
    infoDiv.innerHTML = '';
    gameState.history.slice(0, 20).forEach(text => {
        const p = document.createElement('p');
        p.textContent = text;
        p.style.margin = '4px 0';
        p.style.fontFamily = "'Poppins', sans-serif";
        p.style.fontSize = '0.95rem';
        p.style.color = 'var(--secondary-text)';
        infoDiv.appendChild(p);
    });
}

// ================ MANIPULATION DU PLATEAU ================
function setCell(row, col, value) {
    gameState.board[row][col] = value;
    updateBoardDisplay();
}

function getCell(row, col) {
    return gameState.board[row][col];
}

function emptyCell(row, col) {
    const val = getCell(row, col);
    if (val > 0) {
        setCell(row, col, 0);
        return val;
    }
    return 0;
}

function addSeeds(row, col, amount) {
    gameState.board[row][col] += amount;
    updateBoardDisplay();
}

// ================ RÈGLES DU SONGO ================
function playerRow(player) {
    return player === 1 ? 1 : 0;
}

function opponent(player) {
    return player === 1 ? 2 : 1;
}

function seedsToOpponent(row, col) {
    const initial = getCell(row, col);
    if (initial === 0) return 0;
    let count = 0;
    let [r, c] = [row, col];
    for (let i = 0; i < initial; i++) {
        [r, c] = nextHole(r, c);
        if (r !== row) count++;
    }
    return count;
}

function isForbidden(row, col, player) {
    const ownRow = playerRow(player);
    const isSeven = (ownRow === 1 && col === 6) || (ownRow === 0 && col === 0);
    if (!isSeven) return false;
    const opp = seedsToOpponent(row, col);
    return opp === 1 || opp === 2;
}

function isLegalMove(row, col, player, checkSolidarity = true) {
    if (getCell(row, col) === 0) return false;
    if (row !== playerRow(player)) return false;
    if (checkSolidarity && isForbidden(row, col, player)) return false;
    return true;
}

function legalMoves(player, checkSolidarity = true) {
    const row = playerRow(player);
    const moves = [];
    for (let col = 0; col < 7; col++) {
        if (isLegalMove(row, col, player, checkSolidarity)) {
            moves.push([row, col]);
        }
    }
    return moves;
}

// Distribution des graines (retourne [lastRow, lastCol])
function sow(row, col, player) {
    const initialSeeds = getCell(row, col);
    let seeds = initialSeeds;
    emptyCell(row, col);

    if (seeds > 13) {
        let [r, c] = [row, col];
        for (let i = 0; i < 13; i++) {
            [r, c] = nextHole(r, c);
            addSeeds(r, c, 1);
            seeds--;
        }
        const oppRow = opponent(player) === 1 ? 1 : 0;
        let oppCol = 0;
        while (seeds > 0) {
            addSeeds(oppRow, oppCol, 1);
            seeds--;
            oppCol = (oppCol + 1) % 7;
        }
        return [oppRow, (oppCol - 1 + 7) % 7];
    } else {
        let [r, c] = [row, col];
        for (let i = 0; i < initialSeeds; i++) {
            [r, c] = nextHole(r, c);
            addSeeds(r, c, 1);
        }
        return [r, c];
    }
}

// Vérifie et effectue les captures
function checkCaptures(lastRow, lastCol, player, initialSeeds) {
    const oppRow = opponent(player) === 1 ? 1 : 0;
    const opponentFirstCol = (oppRow === 1) ? 6 : 0;

    const oppEmpty = gameState.board[oppRow].every(v => v === 0);
    if (oppEmpty) return;

    const isOpponentFirstHole = (lastRow === oppRow && lastCol === opponentFirstCol);
    const fullTurn = initialSeeds >= 14;

    let captured = 0;
    if (isOpponentFirstHole && fullTurn) {
        if (getCell(lastRow, lastCol) > 0) {
            emptyCell(lastRow, lastCol);
            captured = 1;
        }
    } else {
        if (lastRow === oppRow) {
            const val = getCell(lastRow, lastCol);
            if (val >= 2 && val <= 4) {
                captured += emptyCell(lastRow, lastCol);
                let [r, c] = [lastRow, lastCol];
                const totalSteps = initialSeeds > 13 ? 13 + (initialSeeds - 13) : initialSeeds;
                for (let i = 0; i < totalSteps - 1; i++) {
                    const idx = cycleIndex(r, c);
                    const prevIdx = (idx - 1 + 14) % 14;
                    [r, c] = cycle[prevIdx];
                    if (r === oppRow) {
                        const v = getCell(r, c);
                        if (v >= 2 && v <= 4) {
                            captured += emptyCell(r, c);
                        } else break;
                    } else break;
                }
            }
        }
    }

    if (captured > 0) {
        if (player === 1) gameState.scores.player1 += captured;
        else gameState.scores.player2 += captured;
        updateScoreDisplay();
        addHistoryEntry(`Joueur ${player} capture ${captured} graine(s).`);
    }
}

// Solidarité
function solidarityMoves(player) {
    const oppRow = opponent(player) === 1 ? 1 : 0;
    if (!gameState.board[oppRow].every(v => v === 0)) return null;
    const allMoves = legalMoves(player, false);
    if (allMoves.length === 0) return [];
    const goodMoves = allMoves.filter(([r, c]) => seedsToOpponent(r, c) >= 7);
    if (goodMoves.length > 0) return goodMoves;
    const maxOpp = Math.max(...allMoves.map(([r, c]) => seedsToOpponent(r, c)));
    return allMoves.filter(([r, c]) => seedsToOpponent(r, c) === maxOpp);
}

// Filtrage des coups légaux (inclut solidarité)
function getFilteredMoves(player) {
    const oppRow = opponent(player) === 1 ? 1 : 0;
    if (gameState.board[oppRow].every(v => v === 0)) {
        const solMoves = solidarityMoves(player);
        if (solMoves) return solMoves;
    }
    return legalMoves(player, true);
}

// Exécute un mouvement (semis + captures + vérification fin de partie) – pas de switch ni d'historique
function executeMove(row, col, player) {
    const initialSeeds = getCell(row, col);
    const [lastRow, lastCol] = sow(row, col, player);
    const oppRow = opponent(player) === 1 ? 1 : 0;
    const willOppEmpty = gameState.board[oppRow].every(v => v === 0);
    if (!willOppEmpty) {
        checkCaptures(lastRow, lastCol, player, initialSeeds);
    } else {
        addHistoryEntry(`Camp adverse vidé, aucune capture.`);
    }
    return checkEndGame(player);
}

// Joue un coup complet en local (historique + changement de tour)
function playMove(row, col, player) {
    addHistoryEntry(`Joueur ${player} sème ${getCell(row, col)} graines depuis [${row},${col}]`);
    const finished = executeMove(row, col, player);
    if (!finished) switchPlayer();
}

// Vérifie les conditions de fin de partie
function checkEndGame(player) {
    const totalBoard = gameState.board[0].reduce((a,b)=>a+b,0) + gameState.board[1].reduce((a,b)=>a+b,0);
    if (totalBoard < 10) {
        gameState.scores.player1 += gameState.board[1].reduce((a,b)=>a+b,0);
        gameState.scores.player2 += gameState.board[0].reduce((a,b)=>a+b,0);
        gameState.board[0] = [0,0,0,0,0,0,0];
        gameState.board[1] = [0,0,0,0,0,0,0];
        updateAllDisplay();
        endGame();
        return true;
    }
    if (gameState.scores.player1 >= 40 || gameState.scores.player2 >= 40) {
        endGame();
        return true;
    }
    const oppRow = opponent(player) === 1 ? 1 : 0;
    if (gameState.board[oppRow].every(v => v === 0)) {
        const moves = solidarityMoves(player);
        if (moves && moves.length === 0) {
            gameState.scores.player1 += gameState.board[1].reduce((a,b)=>a+b,0);
            gameState.scores.player2 += gameState.board[0].reduce((a,b)=>a+b,0);
            gameState.board[0] = [0,0,0,0,0,0,0];
            gameState.board[1] = [0,0,0,0,0,0,0];
            updateAllDisplay();
            endGame();
            return true;
        }
    }
    return false;
}

function endGame() {
    gameState.gameOver = true;
    updateScoreDisplay();
    let winner = '';
    if (gameState.scores.player1 >= 40) winner = 'Joueur 1 gagne !';
    else if (gameState.scores.player2 >= 40) winner = 'Joueur 2 gagne !';
    else if (gameState.scores.player1 === gameState.scores.player2) winner = 'Match nul !';
    else winner = (gameState.scores.player1 > gameState.scores.player2 ? 'Joueur 1' : 'Joueur 2') + ' gagne !';
    addHistoryEntry(`Partie terminée. ${winner}`);

    // En ligne : notifier le serveur et afficher les actions
    if (gameState.gameMode === 'online' && socket) {
        socket.emit('gameOver', gameState.scores.player1 >= 40 ? 1 : 2);
        document.getElementById('online-actions').style.display = 'block';
    } else {
        alert(winner);
    }
}

// Changement de joueur (local + IA)
function switchPlayer() {
    gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
    highlightCurrentPlayer();
    addHistoryEntry(`Tour du Joueur ${gameState.currentPlayer}`);

    if (gameState.gameOver) return;
    if (gameState.gameMode === 'pve' && gameState.currentPlayer === 2 && !gameState.waitingForAI) {
        setTimeout(() => aiPlay(), 800);
    }
}

// Mise en évidence du joueur actif
function highlightCurrentPlayer() {
    const p1 = document.querySelector('.joueur1');
    const p2 = document.querySelector('.joueur2');
    if (gameState.currentPlayer === 1) {
        p1.style.borderColor = '#DAA520';
        p1.style.boxShadow = '0 0 20px rgba(218, 165, 32, 0.6)';
        p2.style.borderColor = 'var(--secondary-text)';
        p2.style.boxShadow = 'none';
    } else {
        p2.style.borderColor = '#DAA520';
        p2.style.boxShadow = '0 0 20px rgba(218, 165, 32, 0.6)';
        p1.style.borderColor = 'var(--secondary-text)';
        p1.style.boxShadow = 'none';
    }
}

// ================ INTELLIGENCE ARTIFICIELLE (PvE) ================
function aiPlay() {
    if (gameState.gameOver) return;
    gameState.waitingForAI = true;
    const moves = getFilteredMoves(2);
    if (moves.length === 0) {
        gameState.waitingForAI = false;
        return;
    }
    const [row, col] = moves[Math.floor(Math.random() * moves.length)];
    handleCellClick(row, col);
    gameState.waitingForAI = false;
}

// ================ GESTION DES CLICS ================
function handleCellClick(row, col) {
    if (gameState.gameOver) {
        alert('Partie terminée.');
        return;
    }
    if (gameState.waitingForAI || gameState.waitingForServer) return;

    const player = gameState.currentPlayer;

    // Mode ONLINE
    if (gameState.gameMode === 'online') {
        // Vérifier que c'est bien notre tour
        if (player !== gameState.onlinePlayerNumber) {
            alert("Ce n'est pas votre tour.");
            return;
        }
        // Vérifier validité locale
        const allowedMoves = getFilteredMoves(player);
        if (!allowedMoves.some(([r,c]) => r === row && c === col)) {
            if (getCell(row, col) === 0) alert("Case vide.");
            else if (isForbidden(row, col, player)) alert("Coup interdit.");
            else alert("Coup non autorisé.");
            return;
        }

        // Bloquer les clics jusqu'à la réponse du serveur
        gameState.waitingForServer = true;
        // Envoyer le coup au serveur
        socket.emit('makeMove', { row, col, player });
        // Exécuter localement (le serveur relaiera à l'autre)
        addHistoryEntry(`Vous (Joueur ${player}) cliquez sur [${row},${col}]`);
        const finished = executeMove(row, col, player);
        // Ne pas changer de tour (le serveur le fera)
        // Réactivera les clics quand turnChange sera reçu
        return;
    }

    // Mode local (PvP / PvE)
    if (row !== playerRow(player)) {
        alert("Ce n'est pas votre rangée.");
        return;
    }

    const allowedMoves = getFilteredMoves(player);
    if (!allowedMoves.some(([r,c]) => r === row && c === col)) {
        if (getCell(row, col) === 0) alert("Case vide.");
        else if (isForbidden(row, col, player)) alert("Coup interdit (case 7 avec 1 ou 2 graines chez l’adversaire).");
        else alert("Coup non autorisé (solidarité).");
        return;
    }

    addHistoryEntry(`Joueur ${player} clique sur [${row},${col}]`);
    playMove(row, col, player);
}

// ================ MODE EN LIGNE (Socket.IO) ================
let socket = null;
const isOnlineAvailable = typeof io !== 'undefined';

function initOnline() {
    if (!isOnlineAvailable) {
        alert("Socket.IO non disponible. Vérifiez votre connexion.");
        return;
    }
    socket = io();

    // Création de salon
    socket.on('roomCreated', ({ code, playerNumber }) => {
        document.getElementById('room-code-display').textContent = code;
        document.getElementById('waiting-message').textContent = 'En attente de l’adversaire...';
        document.getElementById('create-room-section').style.display = 'none';
    });

    // Début de partie
    socket.on('gameStart', ({ currentTurn }) => {
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        document.getElementById('online-actions').style.display = 'none';
        document.getElementById('options-panel').style.display = 'none';

        resetBoardLocal();
        gameState.gameMode = 'online';
        gameState.onlinePlayerNumber = socket.playerNumber;
        gameState.currentPlayer = currentTurn;
        gameState.waitingForServer = false;
        highlightCurrentPlayer();
        addHistoryEntry('Partie en ligne démarrée !');

        if (currentTurn !== socket.playerNumber) {
            addHistoryEntry("En attente du coup de l'adversaire...");
        }
    });

    // Coup adverse
    socket.on('opponentMove', ({ row, col, player }) => {
        addHistoryEntry(`L'adversaire (Joueur ${player}) joue en [${row},${col}]`);
        executeMove(row, col, player);
        // Le serveur enverra turnChange après
    });

    // Changement de tour décidé par le serveur
    socket.on('turnChange', ({ currentTurn }) => {
        gameState.currentPlayer = currentTurn;
        gameState.waitingForServer = false;
        highlightCurrentPlayer();
        if (currentTurn === gameState.onlinePlayerNumber) {
            addHistoryEntry('C’est votre tour.');
        } else {
            addHistoryEntry('Tour de l’adversaire...');
        }
    });

    // Fin de partie (peut aussi être déclenchée par le client)
    socket.on('gameOver', (winner) => {
        if (!gameState.gameOver) {
            gameState.gameOver = true;
            updateScoreDisplay();
            addHistoryEntry(`Partie terminée, joueur ${winner} gagne.`);
            document.getElementById('online-actions').style.display = 'block';
        }
    });

    // Revanche
    socket.on('rematchRequest', () => {
        if (confirm('L’adversaire propose une revanche. Accepter ?')) {
            socket.emit('rematchAccept');
            resetBoardLocal();
            document.getElementById('online-actions').style.display = 'none';
            addHistoryEntry('Revanche acceptée, nouvelle partie !');
        }
    });

    socket.on('rematchStart', () => {
        resetBoardLocal();
        document.getElementById('online-actions').style.display = 'none';
        addHistoryEntry('Revanche acceptée, nouvelle partie !');
    });

    // Déconnexion adverse
    socket.on('opponentDisconnected', () => {
        addHistoryEntry('L’adversaire s’est déconnecté.');
        alert('L’adversaire a quitté la partie.');
        document.getElementById('online-actions').style.display = 'none';
        showMainMenu();
    });

    socket.on('error', (msg) => {
        alert('Erreur : ' + msg);
    });

    // Boutons du panneau online
    document.getElementById('btn-create-room').addEventListener('click', () => {
        socket.emit('createRoom');
    });

    document.getElementById('btn-join-room').addEventListener('click', () => {
        const code = document.getElementById('room-code-input').value.toUpperCase().trim();
        if (code.length !== 4) {
            alert('Code invalide (4 caractères).');
            return;
        }
        socket.emit('joinRoom', code);
    });

    document.getElementById('btn-back-online').addEventListener('click', () => {
        socket.disconnect();
        document.getElementById('online-panel').style.display = 'none';
        document.getElementById('main-menu').style.display = 'flex';
    });

    // Actions en jeu (revanche / quitter)
    document.getElementById('btn-rematch').addEventListener('click', () => {
        socket.emit('rematchRequest');
        addHistoryEntry('Demande de revanche envoyée.');
    });

    document.getElementById('btn-leave-online').addEventListener('click', () => {
        if (confirm('Quitter la partie en ligne ?')) {
            socket.disconnect();
            showMainMenu();
        }
    });
}

// Exécute un coup venant de l'adversaire (sans interaction)
function executeOpponentMove(row, col, player) {
    // Vérifie que la case n'est pas vide (sécurité)
    if (getCell(row, col) === 0) return;
    addHistoryEntry(`Adversaire (Joueur ${player}) sème depuis [${row},${col}]`);
    executeMove(row, col, player);
}

// ================ RÉINITIALISATION ================
function resetBoardLocal() {
    gameState.board = [
        [5,5,5,5,5,5,5],
        [5,5,5,5,5,5,5]
    ];
    gameState.scores.player1 = 0;
    gameState.scores.player2 = 0;
    gameState.currentPlayer = 1;
    gameState.gameOver = false;
    gameState.history = [];
    gameState.waitingForAI = false;
    gameState.waitingForServer = false;
    updateAllDisplay();
    highlightCurrentPlayer();
    document.querySelector('.info').innerHTML = '';
    addHistoryEntry('Nouvelle partie');
}

function resetBoard() {
    resetBoardLocal();
    if (gameState.gameMode === 'online' && document.getElementById('online-actions')) {
        document.getElementById('online-actions').style.display = 'none';
    }
}

// ================ NAVIGATION ENTRE ÉCRANS ================
function showMainMenu() {
    document.getElementById('main-menu').style.display = 'flex';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('online-panel').style.display = 'none';
    if (socket) {
        socket.disconnect();
    }
}

function startGame(mode) {
    gameState.gameMode = mode;
    if (mode === 'online') {
        document.getElementById('online-panel').style.display = 'block';
        initOnline();
    } else {
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        resetBoardLocal();
        addHistoryEntry(`Mode : ${mode === 'pvp' ? 'Joueur vs Joueur' : 'Joueur vs IA'}`);
        if (mode === 'pve' && gameState.currentPlayer === 2) {
            setTimeout(() => aiPlay(), 1000);
        }
    }
}

// ================ MENU OPTIONS (dans le jeu) ================
function setupOptionsPanel() {
    const optionsBtn = document.getElementById('options');
    const panel = document.getElementById('options-panel');
    const applyBtn = document.getElementById('apply-options');

    optionsBtn.addEventListener('click', () => {
        panel.style.display = (panel.style.display === 'none' ? 'block' : 'none');
    });

    applyBtn.addEventListener('click', () => {
        const selectedMode = document.querySelector('input[name="gameMode"]:checked').value;
        if (selectedMode === 'online') {
            panel.style.display = 'none';
            showMainMenu();
            startGame('online');
        } else {
            gameState.gameMode = selectedMode;
            resetBoardLocal();
            panel.style.display = 'none';
            addHistoryEntry(`Mode changé : ${selectedMode === 'pvp' ? 'Joueur vs Joueur' : 'Joueur vs IA'}`);
        }
    });
}

// ================ INITIALISATION ================
function initGame() {
    // Affiche le menu principal
    document.getElementById('main-menu').style.display = 'flex';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('online-panel').style.display = 'none';

    // Boutons du menu principal
    document.getElementById('btn-pvp').addEventListener('click', () => startGame('pvp'));
    document.getElementById('btn-pve').addEventListener('click', () => startGame('pve'));
    document.getElementById('btn-online').addEventListener('click', () => startGame('online'));

    // Bouton "Menu" dans la barre de jeu -> retour au menu
    document.getElementById('menu').addEventListener('click', () => {
        if (confirm('Retourner au menu principal ? La partie en cours sera perdue.')) {
            showMainMenu();
        }
    });

    setupOptionsPanel();
    initEventListeners();
    addResetButton();
}

function initEventListeners() {
    const cells = document.querySelectorAll('td');
    cells.forEach((cell, index) => {
        const row = Math.floor(index / 7);
        const col = index % 7;
        cell.addEventListener('click', () => handleCellClick(row, col));
    });
}

// Bouton "Nouvelle partie" (local) / "Revanche" (online)
function addResetButton() {
    if (document.getElementById('reset-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'reset-btn';
    btn.textContent = 'Nouvelle partie 🔄';
    btn.style.cssText = `
        margin-top:30px; padding: 20px 30px; border-radius: 24px;
        color: var(--secondary-text); font-family: 'Cinzel';
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(16px) saturate(120%);
        -webkit-backdrop-filter: blur(16px) saturate(120%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-top: 1px solid rgba(255, 255, 255, 0.3);
        border-left: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.25), inset 0 0 0 1px rgba(255, 255, 255, 0.05);
        transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
        cursor: pointer; position: relative; overflow: hidden;
    `;
    btn.addEventListener('mouseover', () => {
        btn.style.transform = 'scale(1.05)';
        btn.style.boxShadow = `0 15px 40px 0 rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.15)`;
        btn.style.borderTop = '1px solid rgba(255, 255, 255, 0.5)';
    });
    btn.addEventListener('mouseout', () => {
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = '0 8px 32px 0 rgba(0, 0, 0, 0.25), inset 0 0 0 1px rgba(255, 255, 255, 0.05)';
        btn.style.borderTop = '1px solid rgba(255, 255, 255, 0.3)';
    });
    btn.addEventListener('click', () => {
        if (gameState.gameMode === 'online') {
            // Proposer une revanche au lieu de simplement réinitialiser
            socket.emit('rematchRequest');
            addHistoryEntry('Demande de revanche envoyée.');
        } else {
            resetBoard();
        }
    });
    document.querySelector('.contain').appendChild(btn);
}

document.addEventListener('DOMContentLoaded', initGame);