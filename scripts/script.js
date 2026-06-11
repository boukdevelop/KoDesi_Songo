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
    gameMode: 'pvp',      // 'pvp' ou 'pve'
    history: [],          // historique pour l'affichage
    waitingForAI: false   // empêche les clics pendant que l'IA joue
};

// ================ CYCLE DE SEMIS ================
// Ordre absolu des cases dans la boucle (14 positions)
const cycle = [
    [1,6],[1,5],[1,4],[1,3],[1,2],[1,1],[1,0],  // bas de droite à gauche
    [0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6]   // haut de gauche à droite
];

// Index de chaque case dans le cycle
function cycleIndex(row, col) {
    return cycle.findIndex(([r,c]) => r === row && c === col);
}

// Case suivante dans le cycle
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

// Retourne la rangée du joueur (0 pour joueur 2 haut, 1 pour joueur 1 bas)
function playerRow(player) {
    return player === 1 ? 1 : 0;
}

// Retourne l'adversaire
function opponent(player) {
    return player === 1 ? 2 : 1;
}

// Nombre de graines qu'un coup distribuerait dans le camp adverse
function seedsToOpponent(row, col) {
    const initial = getCell(row, col);
    if (initial === 0) return 0;
    let count = 0;
    let [r, c] = [row, col];
    for (let i = 0; i < initial; i++) {
        [r, c] = nextHole(r, c);
        if (r !== row) count++;  // camp adverse
    }
    return count;
}

// Vérifie si le coup est interdit (case 7 + 1 ou 2 graines chez l’adversaire)
function isForbidden(row, col, player) {
    // case 7 = colonne 6 pour le joueur bas (rangée 1), colonne 0 pour le joueur haut (rangée 0)
    const ownRow = playerRow(player);
    const isSeven = (ownRow === 1 && col === 6) || (ownRow === 0 && col === 0);
    if (!isSeven) return false;
    const opp = seedsToOpponent(row, col);
    return opp === 1 || opp === 2;
}

// Vérifie si le coup est légal (case non vide, pas interdit, sauf si solidarité force)
function isLegalMove(row, col, player, checkSolidarity = true) {
    if (getCell(row, col) === 0) return false;
    if (row !== playerRow(player)) return false;
    // Si solidarité obligatoire, on accepte même les coups interdits
    if (checkSolidarity && isForbidden(row, col, player)) return false;
    return true;
}

// Retourne les coups légaux pour un joueur
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

// Distribution des graines (retourne la dernière case)
function sow(row, col, player) {
    const initialSeeds = getCell(row, col);
    let seeds = initialSeeds;
    emptyCell(row, col);

    // Si > 13 : un tour complet sans la case d'origine, puis uniquement camp adverse
    if (seeds > 13) {
        // Tour complet sans remplir la case d'origine
        let [r, c] = [row, col];
        for (let i = 0; i < 13; i++) {
            [r, c] = nextHole(r, c);
            addSeeds(r, c, 1);
            seeds--;
        }
        // Maintenant on sème exclusivement dans le camp adverse (rangée opposée)
        const oppRow = opponent(player) === 1 ? 1 : 0;
        let oppCol = 0; // on commence toujours à la gauche du camp adverse (col 0)
        while (seeds > 0) {
            addSeeds(oppRow, oppCol, 1);
            seeds--;
            oppCol = (oppCol + 1) % 7; // de gauche à droite en boucle
        }
        return [oppRow, (oppCol - 1 + 7) % 7]; // dernière case remplie
    } else {
        // Semis normal dans la boucle
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
    const opponentFirstCol = (oppRow === 1) ? 6 : 0; // case n°1 adverse

    // Interdiction de vider totalement le camp adverse
    const oppEmpty = gameState.board[oppRow].every(v => v === 0);
    if (oppEmpty) return; // aucune capture

    // Détermine si le dernier coup tombe sur la case 1 adverse après un tour complet
    const isOpponentFirstHole = (lastRow === oppRow && lastCol === opponentFirstCol);
    const fullTurn = initialSeeds >= 14;

    let captured = 0;
    // Si dernier coup = case 1 adverse et tour complet -> on ne prend qu'une graine
    if (isOpponentFirstHole && fullTurn) {
        // On retire une graine (la dernière posée)
        if (getCell(lastRow, lastCol) > 0) {
            emptyCell(lastRow, lastCol);
            captured = 1;
        }
        // Pas de chaîne possible ici (la règle le dit)
    } else {
        // Capture normale : dernière case doit avoir 2 à 4 graines (adversaire)
        if (lastRow === oppRow) {
            const val = getCell(lastRow, lastCol);
            if (val >= 2 && val <= 4) {
                captured += emptyCell(lastRow, lastCol);
                // Capture en chaîne en remontant le chemin
                // On reparcourt le chemin à l'envers depuis la dernière case
                let [r, c] = [lastRow, lastCol];
                const totalSteps = initialSeeds > 13 ? 13 + (initialSeeds - 13) : initialSeeds;
                // Reculer pas à pas
                for (let i = 0; i < totalSteps - 1; i++) {
                    // Pour reculer d'un pas, on cherche la case précédente dans le cycle
                    const idx = cycleIndex(r, c);
                    const prevIdx = (idx - 1 + 14) % 14;
                    [r, c] = cycle[prevIdx];
                    if (r === oppRow) {
                        const v = getCell(r, c);
                        if (v >= 2 && v <= 4) {
                            captured += emptyCell(r, c);
                        } else {
                            break; // la chaîne s'arrête
                        }
                    } else {
                        break; // on quitte le camp adverse
                    }
                }
            }
        }
    }

    // Ajoute les captures au score du joueur
    if (captured > 0) {
        if (player === 1) gameState.scores.player1 += captured;
        else gameState.scores.player2 += captured;
        updateScoreDisplay();
        addHistoryEntry(`Joueur ${player} capture ${captured} graine(s).`);
    }
}

// Solidarité : retourne les coups jouables quand le camp adverse est vide
function solidarityMoves(player) {
    const oppRow = opponent(player) === 1 ? 1 : 0;
    const ownRow = playerRow(player);
    // Si le camp adverse n'est pas vide, pas de solidarité
    if (!gameState.board[oppRow].every(v => v === 0)) return null;

    const allMoves = legalMoves(player, false); // on autorise les coups interdits
    if (allMoves.length === 0) return [];

    // Chercher un coup qui donne au moins 7 graines à l'adversaire
    const goodMoves = allMoves.filter(([r, c]) => seedsToOpponent(r, c) >= 7);
    if (goodMoves.length > 0) return goodMoves;

    // Sinon, celui qui en donne le maximum
    const maxOpp = Math.max(...allMoves.map(([r, c]) => seedsToOpponent(r, c)));
    return allMoves.filter(([r, c]) => seedsToOpponent(r, c) === maxOpp);
}

// Applique un coup complet (semis + captures + règles de fin)
function playMove(row, col, player) {
    const initialSeeds = getCell(row, col);
    const [lastRow, lastCol] = sow(row, col, player);

    addHistoryEntry(`Joueur ${player} sème ${initialSeeds} graines depuis [${row},${col}]`);

    // Vérifier l'interdiction de vider le camp adverse (les captures seront annulées si le camp adverse devient vide)
    const oppRow = opponent(player) === 1 ? 1 : 0;
    const willOppEmpty = gameState.board[oppRow].every(v => v === 0);
    if (!willOppEmpty) {
        checkCaptures(lastRow, lastCol, player, initialSeeds);
    } else {
        addHistoryEntry(`Camp adverse vidé, aucune capture.`);
    }

    // Vérifier les conditions de fin de partie
    if (checkEndGame(player)) return;

    // Changement de joueur
    switchPlayer();
}

// Vérifie les conditions de fin de partie
function checkEndGame(player) {
    const totalBoard = gameState.board[0].reduce((a,b)=>a+b,0) + gameState.board[1].reduce((a,b)=>a+b,0);
    // Moins de 10 graines sur le plateau
    if (totalBoard < 10) {
        gameState.scores.player1 += gameState.board[1].reduce((a,b)=>a+b,0);
        gameState.scores.player2 += gameState.board[0].reduce((a,b)=>a+b,0);
        gameState.board[0] = [0,0,0,0,0,0,0];
        gameState.board[1] = [0,0,0,0,0,0,0];
        updateAllDisplay();
        endGame();
        return true;
    }
    // Un joueur atteint 40 graines
    if (gameState.scores.player1 >= 40 || gameState.scores.player2 >= 40) {
        endGame();
        return true;
    }
    // Solidarité impossible
    const oppRow = opponent(player) === 1 ? 1 : 0;
    if (gameState.board[oppRow].every(v => v === 0)) {
        const moves = solidarityMoves(player);
        if (moves && moves.length === 0) {
            // Aucun coup ne peut atteindre l'adversaire => fin
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
    alert(winner);
}

// Change de joueur (et déclenche l'IA si nécessaire)
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

// ================ INTELLIGENCE ARTIFICIELLE ================
function aiPlay() {
    if (gameState.gameOver) return;
    gameState.waitingForAI = true;
    const moves = getFilteredMoves(2);
    if (moves.length === 0) {
        // Aucun coup possible -> fin de partie (normalement déjà géré)
        gameState.waitingForAI = false;
        return;
    }
    // Choisir un coup au hasard parmi les coups légaux filtrés
    const [row, col] = moves[Math.floor(Math.random() * moves.length)];
    playMove(row, col, 2);
    gameState.waitingForAI = false;
}

// ================ FILTRAGE DES COUPS (solidarité, interdits) ================
function getFilteredMoves(player) {
    const oppRow = opponent(player) === 1 ? 1 : 0;
    // Solidarité ?
    if (gameState.board[oppRow].every(v => v === 0)) {
        const solMoves = solidarityMoves(player);
        if (solMoves) return solMoves;
    }
    // Coups légaux normaux (sans les interdits)
    return legalMoves(player, true);
}

// ================ GESTION DES CLICS ================
function handleCellClick(row, col) {
    if (gameState.gameOver) {
        alert('Partie terminée.');
        return;
    }
    if (gameState.waitingForAI) return;

    const player = gameState.currentPlayer;
    // Vérifie que la case appartient au joueur
    if (row !== playerRow(player)) {
        alert("Ce n'est pas votre rangée.");
        return;
    }

    // Récupère la liste des coups autorisés (solidarité ou non)
    const allowedMoves = getFilteredMoves(player);
    const isAllowed = allowedMoves.some(([r,c]) => r === row && c === col);

    if (!isAllowed) {
        if (getCell(row, col) === 0) {
            alert("Case vide.");
        } else if (isForbidden(row, col, player)) {
            alert("Coup interdit (case 7 avec 1 ou 2 graines chez l’adversaire).");
        } else {
            alert("Coup non autorisé (solidarité).");
        }
        return;
    }

    addHistoryEntry(`Joueur ${player} clique sur [${row},${col}]`);
    playMove(row, col, player);
}

// ================ MENU OPTIONS ================
function setupOptionsPanel() {
    const optionsBtn = document.getElementById('options');
    const panel = document.getElementById('options-panel');
    const applyBtn = document.getElementById('apply-options');

    optionsBtn.addEventListener('click', () => {
        panel.style.display = (panel.style.display === 'none' ? 'block' : 'none');
    });

    applyBtn.addEventListener('click', () => {
        const selectedMode = document.querySelector('input[name="gameMode"]:checked').value;
        gameState.gameMode = selectedMode;
        panel.style.display = 'none';
        resetBoard();
        addHistoryEntry(`Mode: ${selectedMode === 'pvp' ? 'Joueur vs Joueur' : 'Joueur vs IA'}`);
    });
}

// ================ RÉINITIALISATION ================
function resetBoard() {
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
    updateAllDisplay();
    highlightCurrentPlayer();
    document.querySelector('.info').innerHTML = '';
    addHistoryEntry('Nouvelle partie démarrée.');
}

// ================ INITIALISATION ================
function initGame() {
    resetBoard();
    initEventListeners();
    addResetButton();
    setupOptionsPanel();
    highlightCurrentPlayer();
    addHistoryEntry('Songo prêt. Que le meilleur gagne !');
}

function initEventListeners() {
    const cells = document.querySelectorAll('td');
    cells.forEach((cell, index) => {
        const row = Math.floor(index / 7);
        const col = index % 7;
        cell.addEventListener('click', () => handleCellClick(row, col));
    });
}

function addResetButton() {
    if (document.getElementById('reset-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'reset-btn';
    btn.textContent = 'Nouvelle partie 🔄';
    btn.style.cssText = `
        margin-top:30px;
        padding: 20px 30px;
        border-radius: 24px;
        color: var(--secondary-text);
        font-family: 'Cinzel';
        
        /* 1. La base translucide */
        background: rgba(255, 255, 255, 0.05);
        
        /* 2. L'effet de flou et la saturation de la lumière */
        backdrop-filter: blur(16px) saturate(120%);
        -webkit-backdrop-filter: blur(16px) saturate(120%); /* Pour Safari */
        
        /* 3. L'éclairage des bords (Edge Lighting) */
        /* On simule la lumière qui frappe le bord supérieur gauche */
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-top: 1px solid rgba(255, 255, 255, 0.3);
        border-left: 1px solid rgba(255, 255, 255, 0.2);
        
        /* 4. Les ombres (Profondeur externe + reflet interne) */
        box-shadow: 
            0 8px 32px 0 rgba(0, 0, 0, 0.25),         /* Ombre portée douce */
            inset 0 0 0 1px rgba(255, 255, 255, 0.05); /* Reflet interne subtil */
        
        /* 5. Préparation pour l'animation au survol */
        transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
        cursor: pointer;
        position: relative;
        overflow: hidden;
    `;
    btn.addEventListener('mouseover', () => {
        btn.style.transform = 'scale(1.05)';
        btn.style.boxShadow = ` 
            0 15px 40px 0 rgba(0, 0, 0, 0.35),
            inset 0 0 0 1px rgba(255, 255, 255, 0.15);
        `;
        btn.style.borderTop = '1px solid rgba(255, 255, 255, 0.5)'
    });
    btn.addEventListener('mouseout', () => {
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = 'none';
    });
    btn.addEventListener('click', resetBoard);
    document.querySelector('.contain').appendChild(btn);
}

document.addEventListener('DOMContentLoaded', initGame);