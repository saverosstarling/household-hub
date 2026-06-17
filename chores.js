import { db } from './firebase-init.js';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const choresCollection = collection(db, "chores");

const choresForm = document.getElementById('chores-form');
const choresList = document.getElementById('chores-list');

choresForm.addEventListener('submit', async function(event) {
  event.preventDefault();

  const task = document.getElementById('chore-task').value;
  const who = document.getElementById('chore-who').value;
  const due = document.getElementById('chore-due').value;

  await addDoc(choresCollection, {
    task: task,
    who: who,
    due: due,
    done: false,
    createdAt: serverTimestamp()
  });

  choresForm.reset();
});

const choresQuery = query(choresCollection, orderBy('createdAt', 'desc'));

onSnapshot(choresQuery, function(snapshot) {
  choresList.innerHTML = '';

  snapshot.forEach(function(docSnap) {
    const chore = docSnap.data();

    // Every saved entry gets a unique ID from Firestore automatically.
    // We need this ID specifically to update or delete THIS ONE entry later —
    // collection() points at the whole group, but doc() + this ID points at one exact item in it.
    const choreId = docSnap.id;

    const card = document.createElement('div');
    card.className = 'entry-card chore-card';

    card.innerHTML = `
      <label class="chore-row">
        <input type="checkbox" ${chore.done ? 'checked' : ''} class="chore-checkbox">
        <span class="chore-text ${chore.done ? 'chore-done' : ''}">
          <strong>${chore.task}</strong>
          ${chore.who ? ` — ${chore.who}` : ''}
          ${chore.due ? ` (due ${chore.due})` : ''}
        </span>
      </label>
      <button class="chore-delete" title="Remove">&times;</button>
    `;

    // When the checkbox is toggled, update just the "done" field on this one
    // document. Notice we never touch the page directly here — onSnapshot
    // is already watching the database and will redraw everything automatically
    // the instant this change saves, including the strikethrough styling.
    const checkbox = card.querySelector('.chore-checkbox');
    checkbox.addEventListener('change', async function() {
      await updateDoc(doc(db, "chores", choreId), {
        done: checkbox.checked
      });
    });

    // Permanently removes this one document from the database.
    const deleteBtn = card.querySelector('.chore-delete');
    deleteBtn.addEventListener('click', async function() {
      await deleteDoc(doc(db, "chores", choreId));
    });

    choresList.appendChild(card);
  });
});
