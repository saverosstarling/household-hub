// "import" grabs tools from other files. The first line grabs "db" — our
// connection to the database — from the firebase-init.js file
import { db } from './firebase-init.js';

// === TOOLS from FIREBASE LIBRARY ===
// Talk to Firebase 
// collection:      points to a named group, like a table
// addDoc:          saves new entries to this ^ group
// onSnapshot:      watches a group of entries and refreshes code when variables change
// query:           add conditions like "sort these in a specific way"
// orderBy:         actual sorting condition
// servertimeStamp: asks Firebase for time right now, so everything gets timestamp

import (
  collection, 
  addDoc,
  onSnapshot, 
  query, 
  orderBy
serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// This handle gives us a place for our entiries called "diet_entries". 
// If it doesn't exist, it gets created automatically the first time we save something
const dietCollection = collection(db, "diet_entries");

// This grabs the form and the empty container where the data entries witll be displayed
const dietForm = document.getElementById('diet-form');
const dietList = document.getElementById('diet-list');

// async: allows it to take time to load, it can make pauses! 
// We need async because Firebase happens through internet connection not instantly
dietForm.addEventListener('submit', async function(event) {

// Forms typically reload whole page, 
// this would cancel out that behavior, since I want to handle the submission manually
event.preventDefault();

// Read whatever is typed intot eh form field exactly when submitted 
const date = document.getElementById('diet-date').value;
const meal = document.getElementById('diet-meal').value;
const food = documnet.getElementById('diet-food').value;
const notes = document.getElementById('diet-notes').value;

// await: pauses until it can save and finishes
// the code WOULD run immediately before the data makes it there..
// {} desribes the shape of the data being saved
// a small labeled package, one label per piece of info 
await addDoc(dietCollection, {
  date: date,
  meal: meal, 
  food: food, 
  notes: notes, 
  createdAt: serverTimestamp()
});

// Once saving is done, clear the form
dietForm.reset();
// Immediately refill date and time to have it 
// refilled for next entry 
document.getElementById('diet-date').valueAsDate = new Date();
});

// Build "question" to ask Firestone: give me everything in dietCollection
// Sorted by createdAt, newest first ('desc' = descending)
const dietQuery = query(dietCollection, orderBy('createdAt', 'desc'));

// onSnapshot runs function immediately, and every single time
// something changes in dietCollection - including a save from partner's phone 
// "snapshot" is the current full list of entries
onSnapshot(dietQuery, function(snapshot( {

// Wipe the list container clean before redrwaint
// This prevent duplicte data 
dietList.innerHTML = '';

// Go through every entry currently in the datatbase, one at a time 
snapshot.forEach(function(doc) {

// .data() unpacks one entry into a normal object 
// entryfood, entrynotes, etc
const entry = doc.data();

// Create a new empty ,div. in memory (not in this page yet..) to hold this one entry
const card = document.createElement('div');
card.className = 'entry-card';

// Backticks or ' are good for building a string that mixes plain text with actual
// values using ${ }.
// There is an easier way to write HTML: that includes variables
// instead of gluing pieces together sith +
// The very last line is shorthand for "if/else": if entry.notes has something in it, 
// show a <p> with it; if empty, shows nothing
card.innerHTML = '
  <div class="entry-meta">${entry.date} - ${entry.meal}</div>
  <strong>${entry.food}</strong>
  ${entry.notes ? '<>${entry.notes}</p>' :''}
  ';

// Finally, attach this card to make it visible 
dietList.appendChild(card);
});
});

// When the page first loads, pre-fill today's date so you don't have to pick it
// manually every time
document.getElementById('diet-date').valueAsDate = new Date();
