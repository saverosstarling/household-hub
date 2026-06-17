import { db } from './firebase-init.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const dietCollection = collection(db, "diet_entries");
const budgetCollection = collection(db, "budget_items");

// ----- Diet heatmaps -----

function severityColor(average) {
  const hue = 120 - (average / 5) * 120;
  return `hsl(${hue}, 65%, 60%)`;
}

function buildHeatmap(entries, containerId) {
  const container = document.getElementById(containerId);

  if (entries.length === 0) {
    container.innerHTML = '<p class="entry-meta">No entries logged yet.</p>';
    return;
  }

  const groups = {};
  entries.forEach(function(entry) {
    const key = entry.food.trim().toLowerCase();
    if (!groups[key]) {
      groups[key] = { name: entry.food.trim(), fogTotal: 0, painTotal: 0, count: 0 };
    }
    groups[key].fogTotal += parseInt(entry.brainFog);
    groups[key].painTotal += parseInt(entry.stomachPain);
    groups[key].count += 1;
  });

  const rows = Object.values(groups).map(function(g) {
    return {
      name: g.name,
      avgFog: g.fogTotal / g.count,
      avgPain: g.painTotal / g.count,
      count: g.count
    };
  }).sort(function(a, b) {
    return (b.avgFog + b.avgPain) - (a.avgFog + a.avgPain);
  });

  let html = `
    <table class="heatmap-table">
      <tr><th>Food</th><th>Avg Brain Fog</th><th>Avg Stomach Pain</th><th>Times logged</th></tr>
  `;

  rows.forEach(function(row) {
    html += `
      <tr>
        <td>${row.name}</td>
        <td style="background:${severityColor(row.avgFog)}">${row.avgFog.toFixed(1)}</td>
        <td style="background:${severityColor(row.avgPain)}">${row.avgPain.toFixed(1)}</td>
        <td>${row.count}</td>
      </tr>
    `;
  });

  html += '</table>';
  container.innerHTML = html;
}

onSnapshot(dietCollection, function(snapshot) {
  const allEntries = [];
  snapshot.forEach(function(doc) { allEntries.push(doc.data()); });

  const ollyEntries = allEntries.filter(function(e) { return e.who === 'Olly'; });
  const savEntries = allEntries.filter(function(e) { return e.who === 'Sav'; });

  buildHeatmap(ollyEntries, 'olly-heatmap');
  buildHeatmap(savEntries, 'sav-heatmap');
});

// ----- Budget snapshot -----

const budgetColors = ['#D69141', '#ECBE52', '#9069A6', '#5B7553', '#37536B', '#8C4A6B', '#c0392b', '#2e7d32'];

function isUnlocked(item, allItems) {
  if (!item.dependsOn) return true;
  const dependency = allItems.find(function(i) { return i.id === item.dependsOn; });
  if (!dependency) return true;
  return dependency.saved >= dependency.cost;
}

onSnapshot(budgetCollection, function(snapshot) {
  const items = [];
  snapshot.forEach(function(docSnap) {
    items.push({ id: docSnap.id, ...docSnap.data() });
  });

  const container = document.getElementById('budget-overview');

  if (items.length === 0) {
    container.innerHTML = '<p class="entry-meta">No budget items yet.</p>';
    return;
  }

  const totalSaved = items.reduce(function(sum, item) { return sum + item.saved; }, 0);
  const totalCost = items.reduce(function(sum, item) { return sum + item.cost; }, 0);
  const overallPercent = totalCost > 0 ? Math.min(100, Math.round((totalSaved / totalCost) * 100)) : 0;

  // The "next up" target: the highest-weight item that's both unlocked
  // and not yet fully funded — literally what you should save toward next.
  const candidates = items
    .filter(function(item) { return isUnlocked(item, items) && item.saved < item.cost; })
    .sort(function(a, b) { return b.weight - a.weight; });

  const nextUp = candidates[0];

  // Each funded item gets a pie slice sized by its share of your TOTAL saved money.
  let cumulative = 0;
  const slices = items
    .filter(function(item) { return item.saved > 0; })
    .map(function(item, index) {
      const slicePercent = (item.saved / totalSaved) * 100;
      const start = cumulative;
      cumulative += slicePercent;
      const color = budgetColors[index % budgetColors.length];
      return `${color} ${start}% ${cumulative}%`;
    });

  const pieStyle = slices.length > 0
    ? `background: conic-gradient(${slices.join(', ')});`
    : `background: #ddd;`;

  const legendHtml = items
    .filter(function(item) { return item.saved > 0; })
    .map(function(item, index) {
      const color = budgetColors[index % budgetColors.length];
      return `<div class="pie-legend-row"><span class="pie-swatch" style="background:${color}"></span>${item.name} — $${item.saved.toFixed(2)}</div>`;
    })
    .join('');

  container.innerHTML = `
    <div class="entry-card">
      <div class="entry-meta">Overall progress</div>
      <strong>$${totalSaved.toFixed(2)} / $${totalCost.toFixed(2)} saved (${overallPercent}%)</strong>
      <div class="progress-track">
        <div class="progress-fill" style="width:${overallPercent}%"></div>
      </div>
    </div>

    ${nextUp ? `
      <div class="entry-card next-up-banner">
        <div class="entry-meta">Next up</div>
        <strong>You're $${(nextUp.cost - nextUp.saved).toFixed(2)} away from "${nextUp.name}"!</strong>
      </div>
    ` : `
      <div class="entry-card">Everything's either fully funded or locked — nice work!</div>
    `}

    <div class="entry-card">
      <div class="entry-meta">How your savings are distributed</div>
      <div class="pie-chart" style="${pieStyle}"></div>
      <div class="pie-legend">${legendHtml}</div>
    </div>
  `;
});
