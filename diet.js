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

const dietCollection = collection(db, "diet_entries");

const dietForm = document.getElementById('diet-form');
const dietList = document.getElementById('diet-list');

dietForm.addEventListener('submit', async function(event) {
  event.preventDefault();

  const date = document.getElementById('diet-date').value;
  const who = document.getElementById('diet-who').value;
  const meal = document.getElementById('diet-meal').value;
  const food = document.getElementById('diet-food').value;
  const brainFog = document.getElementById('diet-brainfog').value;
  const stomachPain = document.getElementById('diet-stomach').value;

  await addDoc(dietCollection, {
    date: date,
    who: who,
    meal: meal,
    food: food,
    brainFog: brainFog,
    stomachPain: stomachPain,
    createdAt: serverTimestamp()
  });

  dietForm.reset();
  document.getElementById('diet-date').valueAsDate = new Date();
});

const dietQuery = query(dietCollection, orderBy('createdAt', 'desc'));

onSnapshot(dietQuery, function(snapshot) {
  dietList.innerHTML = '';

  snapshot.forEach(function(docSnap) {
    const entry = docSnap.data();
    const entryId = docSnap.id;
    const card = document.createElement('div');
    card.className = 'entry-card';

    const erWarning = entry.stomachPain === '5'
      ? `<p class="er-warning">⚠️ You logged this as ER-level. Please don't ignore that.</p>`
      : '';

    const who = entry.who || 'Unknown';

    card.innerHTML = `
      <div class="entry-meta">${entry.date} — ${entry.meal} — ${who}</div>
      <strong>${entry.food}</strong>
      <p>Brain fog: ${entry.brainFog}/5 &nbsp;|&nbsp; Stomach pain: ${entry.stomachPain}/5</p>
      ${erWarning}
      <button class="diet-delete">&times; Remove</button>
    `;

    card.querySelector('.diet-delete').addEventListener('click', async function() {
      await deleteDoc(doc(db, "diet_entries", entryId));
    });

    dietList.appendChild(card);
  });
});

document.getElementById('diet-date').valueAsDate = new Date();
