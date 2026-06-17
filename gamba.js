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

gameAddForm.addEventListener('submit', async function(event) {
  event.preventDefault();

  // Gather every checked tag checkbox into a simple list, e.g. ["Narrative", "Adventure"].
  const checkedTags = Array.from(document.querySelectorAll('.game-tag:checked')).map(function(cb) {
    return cb.value;
  });

  await addDoc(gamesCollection, {
    name: document.getElementById('game-name').value,
    tags: checkedTags,
    createdAt: serverTimestamp()
  });

  gameAddForm.reset();
});

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
      <div class="entry-meta">${(game.tags || []).join(', ') || 'No tags yet'}</div>
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

  // Tally up points per tag based on your answers.
  const scores = {};
  function addPoint(tag) {
    scores[tag] = (scores[tag] || 0) + 1;
  }
  addPoint(document.getElementById('quiz-q1').value);
  addPoint(document.getElementById('quiz-q2').value);
  addPoint(document.getElementById('quiz-q3').value);

  // Whichever tag scored highest "wins."
  let winningTag = null;
  let highestScore = -1;
  for (const tag in scores) {
    if (scores[tag] > highestScore) {
      highestScore = scores[tag];
      winningTag = tag;
    }
  }

  // Every game in your library carrying that tag is a valid candidate.
  const matches = libraryCache.filter(function(game) {
    return (game.tags || []).includes(winningTag);
  });

  if (matches.length === 0) {
    quizResult.innerHTML = `<div class="entry-card">No games tagged "${winningTag}" yet — add one to your library that fits!</div>`;
    return;
  }

  // More than one match? Random pick breaks the tie.
  const winner = matches[Math.floor(Math.random() * matches.length)];

  quizResult.innerHTML = `
    <div class="entry-card quiz-winner">
      <div class="entry-meta">Tonight's vibe: ${winningTag}</div>
      <strong style="font-size: 1.4em;">${winner.name}</strong>
    </div>
  `;
});
