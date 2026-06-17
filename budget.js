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

const budgetCollection = collection(db, "budget_items");

const budgetForm = document.getElementById('budget-form');
const budgetList = document.getElementById('budget-list');
const dependsOnSelect = document.getElementById('budget-dependson');
const weightSlider = document.getElementById('budget-weight');
const weightDisplay = document.getElementById('budget-weight-display');

// Update the little number next to the slider live, as you drag it —
// purely cosmetic, doesn't touch the database.
weightSlider.addEventListener('input', function() {
  weightDisplay.textContent = weightSlider.value;
});

budgetForm.addEventListener('submit', async function(event) {
  event.preventDefault();

  const name = document.getElementById('budget-name').value;
  const cost = parseFloat(document.getElementById('budget-cost').value);
  const saved = parseFloat(document.getElementById('budget-saved').value) || 0;
  const weight = parseInt(weightSlider.value);
  const dependsOn = dependsOnSelect.value; // empty string = no dependency chosen

  await addDoc(budgetCollection, {
    name: name,
    cost: cost,
    saved: saved,
    weight: weight,
    dependsOn: dependsOn,
    createdAt: serverTimestamp()
  });

  budgetForm.reset();
  weightSlider.value = 5;
  weightDisplay.textContent = '5';
});

const budgetQuery = query(budgetCollection, orderBy('createdAt', 'desc'));

onSnapshot(budgetQuery, function(snapshot) {
  // Turn the raw database results into a plain list, tagging each one with
  // its own ID. "{ id: docSnap.id, ...docSnap.data() }" means: start a new
  // object with an id field, then copy in every field from the saved entry too.
  const items = [];
  snapshot.forEach(function(docSnap) {
    items.push({ id: docSnap.id, ...docSnap.data() });
  });

  // ----- Rebuild the "depends on" dropdown so it always lists every current item -----
  const previousSelection = dependsOnSelect.value;
  dependsOnSelect.innerHTML = '<option value="">None</option>';
  items.forEach(function(item) {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.name;
    dependsOnSelect.appendChild(option);
  });
  dependsOnSelect.value = previousSelection;

  // An item is unlocked if it has no dependency, or if whatever it depends
  // on has already been fully saved up for.
  function isUnlocked(item) {
    if (!item.dependsOn) return true;
    const dependency = items.find(function(i) { return i.id === item.dependsOn; });
    if (!dependency) return true; // the thing it depended on got deleted, so nothing's blocking it now
    return dependency.saved >= dependency.cost;
  }

  // Sort: every unlocked item first (highest "want it" weight at the top),
  // then locked items at the bottom.
  const sorted = items.slice().sort(function(a, b) {
    const aUnlocked = isUnlocked(a);
    const bUnlocked = isUnlocked(b);
    if (aUnlocked && !bUnlocked) return -1;
    if (!aUnlocked && bUnlocked) return 1;
    return b.weight - a.weight;
  });

  budgetList.innerHTML = '';

  sorted.forEach(function(item) {
    const unlocked = isUnlocked(item);
    const progress = Math.min(100, Math.round((item.saved / item.cost) * 100));
    const affordable = item.saved >= item.cost;
    const dependency = item.dependsOn ? items.find(function(i) { return i.id === item.dependsOn; }) : null;

    const card = document.createElement('div');
    card.className = 'entry-card budget-card' + (unlocked ? '' : ' budget-locked');

    card.innerHTML = `
      <div class="entry-meta">Want it: ${item.weight}/10 ${unlocked ? '' : ('— locked until "' + (dependency ? dependency.name : 'an item') + '" is fully funded')}</div>
      <strong>${item.name}</strong> — $${item.saved.toFixed(2)} / $${item.cost.toFixed(2)}
      <div class="progress-track">
        <div class="progress-fill" style="width:${progress}%"></div>
      </div>
      ${affordable ? '<p class="budget-ready">✅ Fully funded — go get it!</p>' : ''}
      <div class="budget-actions">
        <button class="budget-add5">+ $5</button>
        <button class="budget-add20">+ $20</button>
        <button class="budget-delete" title="Remove">&times;</button>
      </div>
    `;

    card.querySelector('.budget-add5').addEventListener('click', async function() {
      await updateDoc(doc(db, "budget_items", item.id), { saved: item.saved + 5 });
    });
    card.querySelector('.budget-add20').addEventListener('click', async function() {
      await updateDoc(doc(db, "budget_items", item.id), { saved: item.saved + 20 });
    });
    card.querySelector('.budget-delete').addEventListener('click', async function() {
      await deleteDoc(doc(db, "budget_items", item.id));
    });

    budgetList.appendChild(card);
  });
});
