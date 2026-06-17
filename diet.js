import { db } from './firebase-init.js';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const dietCollection = collection(db, "diet_entries");

const dietForm = document.getElementById('diet-form');
const dietList = document.getElementById('diet-list');

dietForm.addEventListener('submit', async function(event) {
  event.preventDefault();

  const date = document.getElementById('diet-date').value;
  const meal = document.getElementById('diet-meal').value;
  const food = document.getElementById('diet-food').value;
  const brainFog = document.getElementById('diet-brainfog').value;
  const stomachPain = document.getElementById('diet-stomach').value;

  await addDoc(dietCollection, {
    date: date,
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

  snapshot.forEach(function(doc) {
    const entry = doc.data();
    const card = document.createElement('div');
    card.className = 'entry-card';

    // defined "5" on the stomach pain scale as "call the ER" — so if
    // someone logs a 5, surface a clear flag rather than burying it in a number.
    const erWarning = entry.stomachPain === '5'
      ? `<p class="er-warning">⚠️ You logged this as ER-level. Please don't ignore that.</p>`
      : '';

    card.innerHTML = `
      <div class="entry-meta">${entry.date} — ${entry.meal}</div>
      <strong>${entry.food}</strong>
      <p>Brain fog: ${entry.brainFog}/5 &nbsp;|&nbsp; Stomach pain: ${entry.stomachPain}/5</p>
      ${erWarning}
    `;
    dietList.appendChild(card);
  });
});

document.getElementById('diet-date').valueAsDate = new Date();
