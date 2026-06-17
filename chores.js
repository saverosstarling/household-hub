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

// Keep the latest chores around in memory so the calendar can redraw
// itself instantly when you click prev/next month, with no extra database trip.
let latestChores = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let currentOpenDay = null; // tracks which day's panel is currently showing, if any

const choresQuery = query(choresCollection, orderBy('createdAt', 'desc'));

onSnapshot(choresQuery, function(snapshot) {
  latestChores = [];
  choresList.innerHTML = '';

  snapshot.forEach(function(docSnap) {
    const chore = { id: docSnap.id, ...docSnap.data() };
    latestChores.push(chore);

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

    const checkbox = card.querySelector('.chore-checkbox');
    checkbox.addEventListener('change', async function() {
      await updateDoc(doc(db, "chores", chore.id), { done: checkbox.checked });
    });

    const deleteBtn = card.querySelector('.chore-delete');
    deleteBtn.addEventListener('click', async function() {
      await deleteDoc(doc(db, "chores", chore.id));
    });

    choresList.appendChild(card);
  });

  renderCalendar();

  // If a day panel is currently open, refresh it too — this is what makes
  // a chore you just added from inside the panel show up there instantly.
  if (currentOpenDay) {
    const dayChores = latestChores.filter(function(c) { return c.due === currentOpenDay; });
    showDayPanel(currentOpenDay, dayChores);
  }
});

// ----- Calendar -----

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function renderCalendar() {
  const grid = document.getElementById('chores-calendar-grid');
  const label = document.getElementById('chores-calendar-label');
  if (!grid || !label) return;

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay();

  label.textContent = `${monthNames[currentMonth]} ${currentYear}`;

  const choresByDate = {};
  latestChores.forEach(function(c) {
    if (!c.due) return;
    if (!choresByDate[c.due]) choresByDate[c.due] = [];
    choresByDate[c.due].push(c);
  });

  let html = '';
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(function(d) {
    html += `<div class="calendar-day-label">${d}</div>`;
  });

  for (let i = 0; i < startWeekday; i++) {
    html += `<div class="calendar-cell empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayChores = choresByDate[dateStr] || [];
    const openCount = dayChores.filter(function(c) { return !c.done; }).length;

    let cellClass = 'calendar-cell';
    if (dayChores.length > 0) {
      cellClass += openCount === 0 ? ' day-complete' : ' day-has-chores';
    }

    html += `
      <div class="${cellClass}" data-date="${dateStr}">
        <div class="calendar-day-number">${day}</div>
        ${dayChores.length > 0 ? `<div class="calendar-dot-count">${dayChores.length}</div>` : ''}
      </div>
    `;
  }

  grid.innerHTML = html;

  grid.querySelectorAll('.calendar-cell:not(.empty)').forEach(function(cell) {
    cell.addEventListener('click', function() {
      const date = cell.getAttribute('data-date');
      showDayPanel(date, choresByDate[date] || []);
    });
  });
}

function showDayPanel(dateStr, dayChores) {
  currentOpenDay = dateStr;
  const panel = document.getElementById('chores-day-panel');

  const listHtml = dayChores.map(function(c) {
    return `
      <div class="entry-card chore-card">
        <label class="chore-row">
          <input type="checkbox" ${c.done ? 'checked' : ''} class="day-chore-checkbox" data-id="${c.id}">
          <span class="chore-text ${c.done ? 'chore-done' : ''}"><strong>${c.task}</strong>${c.who ? ' — ' + c.who : ''}</span>
        </label>
      </div>
    `;
  }).join('');

  panel.innerHTML = `
    <h4>${dateStr}</h4>
    ${listHtml || '<p class="entry-meta">Nothing scheduled yet.</p>'}
    <form id="day-add-form" class="entry-form">
      <label>Add a chore for this day
        <input type="text" id="day-chore-task" required>
      </label>
      <label>Who's doing it?
        <select id="day-chore-who">
          <option value="Olly">Olly</option>
          <option value="Sav">Sav</option>
          <option value="Both">Both</option>
        </select>
      </label>
      <button type="submit">Add</button>
    </form>
  `;

  panel.querySelectorAll('.day-chore-checkbox').forEach(function(checkbox) {
    checkbox.addEventListener('change', async function() {
      await updateDoc(doc(db, "chores", checkbox.dataset.id), { done: checkbox.checked });
    });
  });

  document.getElementById('day-add-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    await addDoc(choresCollection, {
      task: document.getElementById('day-chore-task').value,
      who: document.getElementById('day-chore-who').value,
      due: dateStr,
      done: false,
      createdAt: serverTimestamp()
    });
  });
}

document.getElementById('cal-prev').addEventListener('click', function() {
  currentMonth -= 1;
  if (currentMonth < 0) { currentMonth = 11; currentYear -= 1; }
  renderCalendar();
});
document.getElementById('cal-next').addEventListener('click', function() {
  currentMonth += 1;
  if (currentMonth > 11) { currentMonth = 0; currentYear += 1; }
  renderCalendar();
});
