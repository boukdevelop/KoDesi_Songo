// ================ GESTION DES ÉCRANS ================
function showMainMenu() {
    document.getElementById('main-menu').style.display = 'flex';
    document.getElementById('game-screen').style.display = 'none';
}

function startGame(mode) {
    gameState.gameMode = mode;
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    resetBoard();
}

// ================ ÉVÉNEMENTS DU MENU PRINCIPAL ================
document.getElementById('btn-pvp').addEventListener('click', () => startGame('pvp'));
document.getElementById('btn-pve').addEventListener('click', () => startGame('pve'));
// Bouton en ligne (désactivé pour l’instant)

// ================ RETOUR AU MENU DEPUIS LE JEU ================
document.getElementById('menu').addEventListener('click', () => {
    if (confirm('Voulez-vous retourner au menu principal ? La partie en cours sera perdue.')) {
        showMainMenu();
    }
});

// ================ MODIFIER L'INITIALISATION ================
function initGame() {
    // Au chargement, on affiche le menu principal
    showMainMenu();
    initEventListeners();
    addResetButton();
    setupOptionsPanel();
}
// La ligne document.addEventListener('DOMContentLoaded', initGame); reste inchangée