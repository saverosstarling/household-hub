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
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const choresCollection = collection(db, "chores");
const themesDocRef = doc(db, "settings", "eveningThemes");

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

let latestChores = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let currentOpenDay = null;

let themesSettings = {
  mode: 'schedule',
  themesList: ['Reading', 'Video Games', 'Quality Time', 'Game Night'],
  schedule: {}
};

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
  if (currentOpenDay) {
    const dayChores = latestChores.filter(function(c) { return c.due === currentOpenDay; });
    showDayPanel(currentOpenDay, dayChores);
  }
});

// ----- Evening Themes settings -----

const weekdayNamesFull = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const weekdaysForSchedule = ['Monday','Tuesday','Wednesday','Thursday','Friday'];

onSnapshot(themesDocRef, function(docSnap) {
  if (docSnap.exists()) {
    themesSettings = docSnap.data();
    if (!themesSettings.schedule) themesSettings.schedule = {};
    if (!themesSettings.themesList) themesSettings.themesList = [];
  } else {
    // First time ever loading this — save sensible defaults so there's
    // something to work with. This triggers this same listener again.
    setDoc(themesDocRef, themesSettings);
    return;
  }
  renderThemeSettings();
  renderCalendar();
});

async function saveThemesSettings() {
  await setDoc(themesDocRef, themesSettings);
}

function renderThemeSettings() {
  const modeSelect = document.getElementById('theme-mode');
  modeSelect.value = themesSettings.mode;

  const scheduleEditor = document.getElementById('theme-schedule-editor');
  if (themesSettings.mode === 'schedule') {
    scheduleEditor.innerHTML = weekdaysForSchedule.map(function(day) {
      const options = themesSettings.themesList.map(function(theme) {
        const selected = themesSettings.schedule[day] === theme ? 'selected' : '';
        return `<option value="${theme}" ${selected}>${theme}</option>`;
      }).join('');
      return `
        <label>${day}
          <select class="schedule-day-select" data-day="${day}">
            <option value="">(none)</option>
            ${options}
          </select>
        </label>
      `;
    }).join('');

    scheduleEditor.querySelectorAll('.schedule-day-select').forEach(function(select) {
      select.addEventListener('change', async function() {
        themesSettings.schedule[select.dataset.day] = select.value;
        await saveThemesSettings();
      });
    });
  } else {
    scheduleEditor.innerHTML = '<p class="entry-meta">Each weekday will get a theme randomly picked from your list below.</p>';
  }

  const listDisplay = document.getElementById('theme-list-display');
  listDisplay.innerHTML = themesSettings.themesList.map(function(theme, index) {
    return `<span class="theme-tag">${theme} <button class="theme-remove" data-index="${index}">&times;</button></span>`;
  }).join('');

  listDisplay.querySelectorAll('.theme-remove').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      themesSettings.themesList.splice(parseInt(btn.dataset.index), 1);
      await saveThemesSettings();
    });
  });
}

document.getElementById('theme-mode').addEventListener('change', async function() {
  themesSettings.mode = this.value;
  await saveThemesSettings();
});

document.getElementById('theme-add-form').addEventListener('submit', async function(event) {
  event.preventDefault();
  const input = document.getElementById('new-theme-name');
  const name = input.value.trim();
  if (name && !themesSettings.themesList.includes(name)) {
    themesSettings.themesList.push(name);
    await saveThemesSettings();
  }
  input.value = '';
});

// Figures out what (if anything) tonight's theme is for a given date.
// Weekends always return null — themes only exist Monday through Friday.
function getThemeForDate(dateStr) {
  const parts = dateStr.split('-').map(Number);
  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  const weekday = dateObj.getDay();
  if (weekday === 0 || weekday === 6) return null;
  if (!themesSettings.themesList || themesSettings.themesList.length === 0) return null;

  if (themesSettings.mode === 'schedule') {
    const weekdayName = weekdayNamesFull[weekday];
    return (themesSettings.schedule && themesSettings.schedule[weekdayName]) || null;
  } else {
    const seed = parseInt(dateStr.replace(/-/g, ''));
    const index = seed % themesSettings.themesList.length;
    return themesSettings.themesList[index];
  }
}

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
    const theme = getThemeForDate(dateStr);

    let cellClass = 'calendar-cell';
    if (dayChores.length > 0) {
      cellClass += openCount === 0 ? ' day-complete' : ' day-has-chores';
    }

    html += `
      <div class="${cellClass}" data-date="${dateStr}">
        <div class="calendar-day-number">${day}</div>
        ${theme ? `<div class="calendar-theme">${theme}</div>` : ''}
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
  const theme = getThemeForDate(dateStr);

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
    ${theme ? `<p class="entry-meta">Tonight's theme: <strong>${theme}</strong></p>` : ''}
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
