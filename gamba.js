import { db } from './firebase-init.js';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const gamesCollection = collection(db, "games");

const gameAddForm = document.getElementById('game-add-form');
const gameLibraryList = document.getElementById('game-library-list');

// Wire up each trait slider to live-update its number display.
['energy', 'length', 'players', 'mood'].forEach(function(trait) {
  const slider = document.getElementById('game-' + trait);
  const display = document.getElementById('game-' + trait + '-display');
  slider.addEventListener('input', function() {
    display.textContent = slider.value;
  });
});

gameAddForm.addEventListener('submit', async function(event) {
  event.preventDefault();

  await addDoc(gamesCollection, {
    name: document.getElementById('game-name').value,
    energy: parseInt(document.getElementById('game-energy').value),
    length: parseInt(document.getElementById('game-length').value),
    players: parseInt(document.getElementById('game-players').value),
    mood: parseInt(document.getElementById('game-mood').value),
    createdAt: serverTimestamp()
  });

  gameAddForm.reset();
  ['energy', 'length', 'players', 'mood'].forEach(function(trait) {
    document.getElementById('game-' + trait).value = 3;
    document.getElementById('game-' + trait + '-display').textContent = '3';
  });
});

// Keep an always-current copy of your library in memory, so the quiz can use
// it instantly when submitted, without a separate trip to the database.
let libraryCache = [];

const gamesQuery = query(gamesCollection, orderBy('createdAt', 'desc'));

onSnapshot(gamesQuery, function(snapshot) {
  libraryCache = [];
  gameLibraryList.innerHTML = '';

  snapshot.forEach(function(docSnap) {
    const game = { id: docSnap.id, ...docSnap.data() };
    libraryCache.push(game);

    const card = document.createElement('div');
    card.className = 'entry-card';
    card.innerHTML = `
      <strong>${game.name}</strong>
      <div class="entry-meta">Energy ${game.energy} · Length ${game.length} · Players ${game.players} · Mood ${game.mood}</div>
      <button class="game-delete">&times; Remove</button>
    `;
    card.querySelector('.game-delete').addEventListener('click', async function() {
      await deleteDoc(doc(db, "games", game.id));
    });
    gameLibraryList.appendChild(card);
  });
});

// ----- The quiz -----

const quizForm = document.getElementById('quiz-form');
const quizResult = document.getElementById('quiz-result');

quizForm.addEventListener('submit', function(event) {
  event.preventDefault();

  if (libraryCache.length === 0) {
    quizResult.innerHTML = `<p class="entry-card">Add at least one game to your library first!</p>`;
    return;
  }

  // Build a "target profile" out of your answers — the kind of experience you're after right now.
  const target = {
    energy: parseInt(document.getElementById('quiz-energy').value),
    length: parseInt(document.getElementById('quiz-length').value),
    players: parseInt(document.getElementById('quiz-players').value),
    mood: parseInt(document.getElementById('quiz-mood').value)
  };

  // For each game, measure how far its traits are from your target —
  // squaring each difference means bigger mismatches count extra, and
  // negative differences can't cancel out positive ones. Whichever game
  // ends up with the smallest total distance is the closest match.
  let bestGame = null;
  let bestDistance = Infinity;

  libraryCache.forEach(function(game) {
    const distance =
      Math.pow(game.energy - target.energy, 2) +
      Math.pow(game.length - target.length, 2) +
      Math.pow(game.players - target.players, 2) +
      Math.pow(game.mood - target.mood, 2);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestGame = game;
    }
  });

  quizResult.innerHTML = `
    <div class="entry-card quiz-winner">
      <div class="entry-meta">Tonight's pick:</div>
      <strong style="font-size: 1.4em;">${bestGame.name}</strong>
    </div>
  `;
});
