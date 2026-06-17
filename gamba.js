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

  const checkedTags = Array.from(document.querySelectorAll('.game-tag:checked')).map(function(cb) {
    return cb.value;
  });

  await addDoc(gamesCollection, {
    name: document.getElementById('game-name').value,
    tags: checkedTags,
    bio: document.getElementById('game-bio').value,
    steamLink: document.getElementById('game-steam').value,
    imageUrl: document.getElementById('game-image-url').value,
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
      ${game.imageUrl ? `<img src="${game.imageUrl}" class="game-thumb" alt="${game.name}">` : ''}
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

  const scores = {};
  function addPoint(tag) {
    scores[tag] = (scores[tag] || 0) + 1;
  }
  addPoint(document.getElementById('quiz-q1').value);
  addPoint(document.getElementById('quiz-q2').value);
  addPoint(document.getElementById('quiz-q3').value);

  let winningTag = null;
  let highestScore = -1;
  for (const tag in scores) {
    if (scores[tag] > highestScore) {
      highestScore = scores[tag];
      winningTag = tag;
    }
  }

  const matches = libraryCache.filter(function(game) {
    return (game.tags || []).includes(winningTag);
  });

  if (matches.length === 0) {
    quizResult.innerHTML = `<div class="entry-card">No games tagged "${winningTag}" yet — add one to your library that fits!</div>`;
    return;
  }

  const winner = matches[Math.floor(Math.random() * matches.length)];

  quizResult.innerHTML = `
    <div class="entry-card quiz-winner">
      <div class="entry-meta">Tonight's vibe: ${winningTag}</div>
      ${winner.imageUrl ? `<img src="${winner.imageUrl}" class="game-thumb" alt="${winner.name}">` : ''}
      <strong style="font-size: 1.4em;">${winner.name}</strong>
      ${winner.bio ? `<p>${winner.bio}</p>` : ''}
      ${winner.steamLink ? `<p><a href="${winner.steamLink}" target="_blank" rel="noopener">View on Steam</a></p>` : ''}
    </div>
  `;
});
