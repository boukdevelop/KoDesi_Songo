# 🎋 SONGO – Jeu de semailles Ekang

**K-Songo (KoDesi Songo)** est une adaptation numérique du jeu de société traditionnel Ekang (Cameroun, Gabon, Guinée équatoriale).  
Affrontez un ami, l’ordinateur ou un joueur en ligne dans ce jeu de stratégie abstrait proche de l’Awalé, mais avec ses propres règles de capture, solidarité et interdits.

---

## ✨ Fonctionnalités

- 🧑‍🤝‍🧑 **Joueur contre Joueur** (local) – sur le même écran.
- 🤖 **Joueur contre l’ordinateur** – IA aléatoire respectant les règles.
- 🌐 **Jeu en ligne** – création de salons avec code, partie en temps réel via WebSocket.
- 📜 **Historique des coups** en direct dans l’interface.
- 🎨 **Effets visuels modernes** (glassmorphisme, bordure géométrique Bamoun, animations fluides).
- 🔄 **Proposition de revanche** en fin de partie en ligne.
- ⏱️ **Semis animé** – chaque graine est déposée avec un léger délai pour mieux suivre la distribution.

---

## 📜 Règles du jeu (résumé)

Le Songo se joue à deux sur un plateau de 2 rangées de 7 cases. Chaque case contient 5 graines au départ.

1. **Tour à tour**, un joueur prend toutes les graines d’une case de son camp et les sème une à une dans les cases suivantes (en boucle : de droite à gauche dans son camp, puis de gauche à droite dans le camp adverse).
2. **Si le nombre de graines est > 13**, le joueur fait un tour complet sans la case de départ, puis continue uniquement dans le camp adverse.
3. **Captures** : lorsque la dernière graine tombe dans une case adverse contenant entre 1 et 3 graines (2 à 4 avec la graine déposée), le joueur ramasse ces graines, ainsi que celles des cases précédentes adverses qui remplissent la même condition (prise à la chaîne). Sauf cas particuliers (case n°1 adverse après un tour complet).
4. **Solidarité** : si le camp adverse est vide, le joueur doit jouer un coup qui lui donne au moins 7 graines. Sinon, il donne le maximum possible. Si aucun coup ne peut atteindre l’adversaire, la partie s’arrête.
5. **Interdits** : il est interdit de semer 1 ou 2 graines chez l’adversaire depuis sa case 7 (sauf obligation de solidarité). Vider complètement le camp adverse annule les captures.
6. **Fin de partie** : le jeu s’arrête quand un joueur atteint **40 graines**, ou qu’il reste moins de 10 graines sur le plateau, ou que la solidarité est impossible. Le joueur avec au moins 40 graines gagne.

> Règles complètes : inspirées de l’ouvrage de Serge MBARGA OWONA, *Le jeu de Songo*.

---

## 🧱 Technologies

- **Frontend** : HTML5, CSS3 (custom properties, glassmorphisme, grid/flex), JavaScript (vanilla, ES6+)
- **Backend temps réel** : Node.js, Express, Socket.IO
- **Moteur de jeu** : règles intégrales du Songo en pur JS
- **IA** : coups aléatoires parmi les coups valides
- **Déploiement** : Render, Cyclic, ou tout hébergeur supportant Node.js + WebSocket

---

## 🚀 Installation locale

### Prérequis

- [Node.js](https://nodejs.org) (version 16+)
- npm (inclus avec Node)

### Étapes

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/ton-compte/KoDesi_Songo.git
   cd KoDesi_Songo
