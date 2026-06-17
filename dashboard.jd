import { db } from './firebase-init.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const dietCollection = collection(db, "diet_entries");

// Turns a 0-5 average into a color: green at 0, sliding to red at 5.
// Hue 120 in the color wheel is green, hue 0 is red — we slide between them.
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

  // Group entries by food name (trimmed + lowercased, so "Pizza" and "pizza " count as the same thing).
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

  // Convert totals into averages, worst-correlated food sorted to the top.
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

  const ollyEntries = allEntries.filter(function(e) { return e.who === 'Oliver'; });
  const savEntries = allEntries.filter(function(e) { return e.who === 'Saveroski'; });

  buildHeatmap(ollyEntries, 'olly-heatmap');
  buildHeatmap(savEntries, 'sav-heatmap');
});
