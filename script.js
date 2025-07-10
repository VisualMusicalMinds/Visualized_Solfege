// --- AUDIO & STATE ---
const context = new (window.AudioContext || window.webkitAudioContext)();

// Audio setup
const compressor = context.createDynamicsCompressor();
compressor.threshold.value = -24;
compressor.knee.value = 30;
compressor.ratio.value = 12;
compressor.attack.value = 0.003;
compressor.release.value = 0.25;
compressor.connect(context.destination);

// State variables
const activeTouches = new Map();
const waveforms = ['sine', 'triangle', 'square', 'sawtooth', 'voice'];
let currentWaveformIndex = 1;
let currentWaveform = waveforms[currentWaveformIndex];
let globalVolume = 0.4;

const keyNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
let currentKeyIndex = 0;
let currentScale = 'major';

// Scale definitions with interval patterns and solfege mappings
const scaleDefinitions = {
  'major': {
    name: 'Major',
    intervals: [0, 2, 4, 5, 7, 9, 11], // W-W-H-W-W-W-H
    solfege: ['Do', 'Re', 'Mi', 'Fa', 'So', 'La', 'Ti']
  },
  'natural-minor': {
    name: 'Natural Minor',
    intervals: [0, 2, 3, 5, 7, 8, 10], // W-H-W-W-H-W-W
    solfege: ['Do', 'Re', 'Me', 'Fa', 'So', 'Le', 'Te']
  },
  'harmonic-minor': {
    name: 'Harmonic Minor',
    intervals: [0, 2, 3, 5, 7, 8, 11], // W-H-W-W-H-W+H-H
    solfege: ['Do', 'Re', 'Me', 'Fa', 'So', 'Le', 'Ti']
  },
  'melodic-minor': {
    name: 'Melodic Minor',
    intervals: [0, 2, 3, 5, 7, 9, 11], // W-H-W-W-W-W-H
    solfege: ['Do', 'Re', 'Me', 'Fa', 'So', 'La', 'Ti']
  },
  'dorian': {
    name: 'Dorian Mode',
    intervals: [0, 2, 3, 5, 7, 9, 10], // W-H-W-W-W-H-W
    solfege: ['Do', 'Re', 'Me', 'Fa', 'So', 'La', 'Te']
  },
  'phrygian': {
    name: 'Phrygian Mode',
    intervals: [0, 1, 3, 5, 7, 8, 10], // H-W-W-W-H-W-W
    solfege: ['Do', 'Ra', 'Me', 'Fa', 'So', 'Le', 'Te']
  },
  'lydian': {
    name: 'Lydian Mode',
    intervals: [0, 2, 4, 6, 7, 9, 11], // W-W-W-H-W-W-H
    solfege: ['Do', 'Re', 'Mi', 'Fi', 'So', 'La', 'Ti']
  },
  'mixolydian': {
    name: 'Mixolydian Mode',
    intervals: [0, 2, 4, 5, 7, 9, 10], // W-W-H-W-W-H-W
    solfege: ['Do', 'Re', 'Mi', 'Fa', 'So', 'La', 'Te']
  },
  'locrian': {
    name: 'Locrian Mode',
    intervals: [0, 1, 3, 5, 6, 8, 10], // H-W-W-H-W-W-W
    solfege: ['Do', 'Ra', 'Me', 'Fa', 'Se', 'Le', 'Te']
  }
};

// Define colors for sharp and flat notes
const DARK_RED = '#990000';
const DARK_BLUE = '#000099';

// Helper function to get note names in chromatic order
const chromaticNotes = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Generate letter names for a specific key and scale
function generateLetterNamesForScale(keyName, scaleName) {
  const scale = scaleDefinitions[scaleName];
  if (!scale) return {};
  
  const keyIndex = chromaticNotes.indexOf(keyName);
  const letterNames = {};
  
  scale.solfege.forEach((solfege, index) => {
    const noteIndex = (keyIndex + scale.intervals[index]) % 12;
    letterNames[solfege] = chromaticNotes[noteIndex];
  });
  
  return letterNames;
}

// Generate color mappings for a specific key (colors stay tied to letter names)
function generateColorsForScale(keyName, scaleName) {
  const scale = scaleDefinitions[scaleName];
  if (!scale) return {};
  
  // Base color mapping tied to chromatic scale positions
  const baseColors = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#5af5fa', '#007AFF', '#AF52DE', 
                     '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#5af5fa'];
  const keyIndex = chromaticNotes.indexOf(keyName);
  const colors = {};
  
  scale.solfege.forEach((solfege, index) => {
    const noteIndex = (keyIndex + scale.intervals[index]) % 12;
    colors[solfege] = baseColors[noteIndex % 7]; // Cycle through 7 colors
  });
  
  return colors;
}

// Base frequencies
const baseFrequencies = {
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'F5': 698.46
};
let noteFrequencies = { ...baseFrequencies };

// Transposition logic
const semitoneShiftMap = {'C':0,'Db':1,'D':2,'Eb':3,'E':4,'F':5,'Gb':6,'G':-5,'Ab':-4,'A':-3,'Bb':-2,'B':-1};

function transposeFrequency(freq, semitoneShift) {
  return freq * Math.pow(2, semitoneShift / 12);
}

function updateTransposedFrequencies() {
  const shift = semitoneShiftMap[keyNames[currentKeyIndex]];
  noteFrequencies = {};
  for (const [note, freq] of Object.entries(baseFrequencies)) {
    noteFrequencies[note] = transposeFrequency(freq, shift);
  }
}

// Dynamic color and letter name mappings (generated based on current key and scale)
let noteColorsByKey = {};
let letterNamesByKey = {};

// Function to update mappings when key or scale changes
function updateScaleMappings() {
  const currentKey = keyNames[currentKeyIndex];
  
  // Generate new mappings for all keys with current scale
  noteColorsByKey = {};
  letterNamesByKey = {};
  
  keyNames.forEach(key => {
    letterNamesByKey[key] = generateLetterNamesForScale(key, currentScale);
    noteColorsByKey[key] = generateColorsForScale(key, currentScale);
  });
}

// UI state
let cButtonState = 'note'; // can be 'note' or 'S'
let keyboardButtonActive = false;
let accordionCollapsed = true; // Start collapsed on mobile

// Map to identify if a note is flat or sharp
const noteAccidentalMap = {
  'C': false, 'C#': 'sharp', 'Db': 'flat',
  'D': false, 'D#': 'sharp', 'Eb': 'flat',
  'E': false, 'F': false, 'F#': 'sharp',
  'Gb': 'flat', 'G': false, 'G#': 'sharp',
  'Ab': 'flat', 'A': false, 'A#': 'sharp',
  'Bb': 'flat', 'B': false, 'Cb': 'flat'
};

// Keyboard mappings (expanded to include new solfege syllables)
const buttonSolfegeNames = {
  'f': 'Fa', 'q': 'So', 'd': 'Mi', 's': 'Re', 'a': 'Do', 'x': 'La', 'c': 'Ti',
  'z': 'So', 'w': 'La', 'e': 'Ti', '1': 'Do', '2': 'Re', '3': 'Mi',
  ';': 'Fa', 'm': 'So', 'l': 'Mi', 'k': 'Re', 'j': 'Do', ',': 'La', '.': 'Ti',
  'u': 'So', 'i': 'La', 'o': 'Ti', '7': 'Do', '8': 'Re', '9': 'Mi',
  'y': 'Fa', 'h': 'Ti', '/': 'Do', 'p': 'Do', '6': 'Ti', '0': 'Fa',
  // New mappings for alternative solfege syllables will be handled dynamically
};

// Function to get current solfege syllable for a key based on current scale
function getCurrentSolfege(key) {
  const baseSolfege = buttonSolfegeNames[key];
  if (!baseSolfege) return null;
  
  const scale = scaleDefinitions[currentScale];
  if (!scale) return baseSolfege;
  
  // Map major scale positions to current scale positions
  const majorSolfege = ['Do', 'Re', 'Mi', 'Fa', 'So', 'La', 'Ti'];
  const majorIndex = majorSolfege.indexOf(baseSolfege);
  
  if (majorIndex !== -1 && scale.solfege[majorIndex]) {
    return scale.solfege[majorIndex];
  }
  
  return baseSolfege;
}

// Keyboard display pairs for display in keyboard mode (expanded for new syllables)
const keyboardDisplayPairs = {
  'Fa': 'f | ;', 'Mi': 'd | l', 'Re': 's | k', 'Do': 'a | j', 'Ti': 'c | .', 'La': 'x | ,', 'So': 'z | m',
  // Additional syllables
  'Me': 'd | l', 'Le': 'x | ,', 'Te': 'c | .', 'Ra': 's | k', 'Fi': 'f | ;', 'Se': 'z | m'
};

const keyboardDisplayPairsWithPosition = {
  'mid_Fa': 'f | ;',  'mid_Mi': 'd | l',  'mid_Re': 's | k',  'mid_Do': 'a | j',
  'low_Ti': 'c | .', 'low_La': 'x | ,', 'low_So': 'z | m',
  'high_So': 'q | u', 'high_La': 'w | i', 'high_Ti': 'e | o',
  'higher_Do': '1 | 7', 'higher_Re': '2 | 8', 'higher_Mi': '3 | 9',
  'highest_Fa': '0'
};

// Map button keys to which note they represent (grouped by note position)
const keyGroups = {
  'low_So': ['z', 'm'], 'low_La': ['x', ','], 'low_Ti': ['c', '.', 'h'],
  'mid_Do': ['a', 'j', '/'], 'mid_Re': ['s', 'k'], 'mid_Mi': ['d', 'l'], 'mid_Fa': ['f', ';', 'y'],
  'high_So': ['q', 'u'], 'high_La': ['w', 'i'], 'high_Ti': ['e', 'o', '6'],
  'higher_Do': ['1', '7', 'p'], 'higher_Re': ['2', '8'], 'higher_Mi': ['3', '9'],
  'highest_Fa': ['0']
};

// Map to find the position group for a key
const keyToPositionGroup = {};
for (const [group, keys] of Object.entries(keyGroups)) {
  for (const key of keys) {
    keyToPositionGroup[key] = group;
  }
}

// Audio synthesis setup
const harmonics = 20;
const real = new Float32Array(harmonics);
const imag = new Float32Array(harmonics);
real[1] = 1;
real[2] = 0.15;
real[3] = 0.1;
real[4] = 0.05;
for (let i = 5; i < harmonics; i++) real[i] = 0;
const customVoiceWave = context.createPeriodicWave(real, imag);

// Audio state
const activeOscillators = {};
const heldKeys = new Set();
const accidentalHeld = { sharp: false, flat: false };
const heldNoteKeys = new Set();
let sharpTouchHeld = false;
let flatTouchHeld = false;

// --- AUDIO FUNCTIONS ---
function getAccidentalShift() {
  if (sharpTouchHeld && flatTouchHeld) return 0;
  if (sharpTouchHeld) return 1;
  if (flatTouchHeld) return -1;
  if (accidentalHeld.sharp && accidentalHeld.flat) return 0;
  if (accidentalHeld.sharp) return 1;
  if (accidentalHeld.flat) return -1;
  return 0;
}

function startNote(key, freq) {
  stopNote(key);

  const now = context.currentTime;
  let osc, gain, lfo, lfoGain, filter;

  gain = context.createGain();
  gain.gain.setValueAtTime(0, now);

  if (currentWaveform === "voice") {
    osc = context.createOscillator();
    osc.setPeriodicWave(customVoiceWave);
    osc.frequency.value = freq;

    lfo = context.createOscillator();
    lfoGain = context.createGain();
    lfo.frequency.setValueAtTime(1.5, now);
    lfo.frequency.linearRampToValueAtTime(5, now + 1);
    lfoGain.gain.setValueAtTime(2.0, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start();

    filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.value = 1;

    osc.connect(filter);
    filter.connect(gain);

    const attackTime = 0.08;
    const decayTime = 0.18;
    const sustainLevel = globalVolume * 0.5;
    const maxLevel = globalVolume * 0.85;

    gain.gain.linearRampToValueAtTime(maxLevel, now + attackTime);
    gain.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);

    gain.connect(compressor);
    osc.start();

    activeOscillators[key] = { osc, gain, lfo, lfoGain, filter };
  } else {
    osc = context.createOscillator();
    osc.type = currentWaveform;
    osc.frequency.value = freq;

    filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.value = 1;

    osc.connect(filter);
    filter.connect(gain);

    const attackTime = 0.015;
    gain.gain.linearRampToValueAtTime(globalVolume, now + attackTime);

    gain.connect(compressor);
    osc.start();

    activeOscillators[key] = { osc, gain, filter };
  }
}

function stopNote(key) {
  const active = activeOscillators[key];
  if (!active) return;

  const now = context.currentTime;

  if (active.osc) {
    const gain = active.gain;

    if (currentWaveform === "voice") {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      const releaseTime = 0.6;
      const stopBuffer = 0.1;
      gain.gain.linearRampToValueAtTime(0.0001, now + releaseTime);
      active.osc.stop(now + releaseTime + stopBuffer);
      if (active.lfo) active.lfo.stop(now + releaseTime + stopBuffer);
    } else {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      const releaseTime = 0.2;
      const stopBuffer = 0.1;
      gain.gain.exponentialRampToValueAtTime(0.001, now + releaseTime);
      active.osc.stop(now + releaseTime + stopBuffer);
    }
  }

  delete activeOscillators[key];
}

function handlePlayKey(key) {
  const btn = buttons.find(b => b.keys.includes(key));
  if (!btn) return;
  heldNoteKeys.add(key);
  const accidental = getAccidentalShift();
  const oscKey = `${key}_${accidental}`;
  const freq = noteFrequencies[btn.note] * Math.pow(2, accidental / 12);
  startNote(oscKey, freq);
}

function handleStopKey(key) {
  heldNoteKeys.delete(key);
  stopNote(`${key}_0`);
  stopNote(`${key}_1`);
  stopNote(`${key}_-1`);
}

function reTriggerHeldKeysAccidentals() {
  for (const key of heldNoteKeys) {
    stopNote(`${key}_0`);
    stopNote(`${key}_1`);
    stopNote(`${key}_-1`);
    const btn = buttons.find(b => b.keys.includes(key));
    if (!btn) continue;
    const accidental = getAccidentalShift();
    const oscKey = `${key}_${accidental}`;
    const freq = noteFrequencies[btn.note] * Math.pow(2, accidental / 12);
    startNote(oscKey, freq);
  }
}

// --- GRID SETUP ---
const positions = {
  '10a': [9, 0], '10b': [9, 1], '10c': [9, 2], '10d': [9, 3],
  '3a': [2, 0], '4a': [3, 0], '3b': [2, 1], '4b': [3, 1], '3c': [2, 2], '4c': [3, 2],
  '5a': [4, 0], '6a': [5, 0],
  '5b': [4, 1], '6b': [5, 1], '7b': [6, 1], '5c': [4, 2], '6c': [5, 2], '7c': [6, 2],
  '8b': [7, 1], '8c': [7, 2],
  '9b': [8, 1], '9c': [8, 2],
  '4d': [3, 3], '3d': [2, 3],
  '2c': [1, 2], '2d': [1, 3],
  '1c': [0, 2], '1d': [0, 3]
};

// Button definitions
const buttons = [
  { name: 'Fa', keys: ['f', ';', 'y'], note: 'F4', cells: ['3a','4a'] },
  { name: 'So', keys: ['z', 'm'], note: 'G3', cells: ['9b','9c'] },
  { name: 'Mi', keys: ['d', 'l'], note: 'E4', cells: ['5a'] },
  { name: 'Re', keys: ['s', 'k'], note: 'D4', cells: ['6a'] },
  { name: 'Do', keys: ['a', 'j', '/'], note: 'C4', cells: ['5b','6b','7b','5c','6c','7c'] },
  { name: 'La', keys: ['x', ','], note: 'A3', cells: ['8b'] },
  { name: 'Ti', keys: ['c', '.', 'h'], note: 'B3', cells: ['8c'] },
  { name: 'So', keys: ['q', 'u'], note: 'G4', cells: ['3b','4b','3c','4c'] },
  { name: 'La', keys: ['w', 'i'], note: 'A4', cells: ['4d'] },
  { name: 'Ti', keys: ['e', 'o', '6'], note: 'B4', cells: ['3d'] },
  { name: 'Do', keys: ['1', '7', 'p'], note: 'C5', cells: ['2c','2d'] },
  { name: 'Re', keys: ['2', '8'], note: 'D5', cells: ['1c'] },
  { name: 'Mi', keys: ['3', '9'], note: 'E5', cells: ['1d'] },
  { name: 'Fa', keys: ['0'], note: 'F5', cells: [] }
];

// DOM references
const grid = document.getElementById('grid');
const keyToDiv = {};
const cellRefs = {};
const noteButtonRefs = {};

// --- ACCORDION FUNCTIONALITY ---
function toggleAccordion() {
  accordionCollapsed = !accordionCollapsed;
  updateAccordionState();
}

function updateAccordionState() {
  const controlsContainer = document.querySelector('.controls-container');
  const accordionToggle = document.querySelector('.accordion-toggle');
  const gridWrapper = document.querySelector('.proportional-grid-wrapper');
  
  if (!controlsContainer || !accordionToggle || !gridWrapper) return;
  
  if (accordionCollapsed) {
    controlsContainer.classList.remove('expanded');
    controlsContainer.classList.add('collapsed');
    accordionToggle.classList.remove('expanded');
    accordionToggle.classList.add('collapsed');
    accordionToggle.innerHTML = 'Menu <span class="icon">▼</span>';
    gridWrapper.classList.remove('menu-expanded');
  } else {
    controlsContainer.classList.remove('collapsed');
    controlsContainer.classList.add('expanded');
    accordionToggle.classList.remove('collapsed');
    accordionToggle.classList.add('expanded');
    accordionToggle.innerHTML = 'Menu <span class="icon">▲</span>';
    gridWrapper.classList.add('menu-expanded');
  }
}

// --- UI SETUP ---
function initializeGrid() {
  for (let r = 0; r < 11; r++) {
    for (let c = 0; c < 4; c++) {
      const div = document.createElement('div');
      div.className = 'cell';
      div.style.top = (r * (100 / 11)) + '%';
      div.style.left = (c * (100 / 4)) + '%';
      div.style.width = (100 / 4 - 0.5) + '%';
      div.style.height = (100 / 11 - 0.5) + '%';
      const rowNum = r + 1;
      const colLetter = String.fromCharCode(97 + c);
      cellRefs[`${rowNum}${colLetter}`] = div;
      grid.appendChild(div);
    }
  }
}

function renderToggleButton() {
  const el = document.createElement('button');
  el.className = 'chord-toggle-btn';
  el.setAttribute('type', 'button');
  el.setAttribute('aria-pressed', cButtonState === 'S');
  if (cButtonState === 'note') {
    el.innerHTML = '<span class="music-symbol">&#9835;</span>';
  } else {
    el.innerText = 'S';
  }
  el.addEventListener('click', () => {
    cButtonState = (cButtonState === 'note') ? 'S' : 'note';
    keyboardButtonActive = false;
    updateKeyboardButton();
    renderToggleButton();
    updateBoxNames();
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      cButtonState = (cButtonState === 'note') ? 'S' : 'note';
      keyboardButtonActive = false;
      updateKeyboardButton();
      renderToggleButton();
      updateBoxNames();
    }
  });
  cellRefs['5d'].innerHTML = '';
  cellRefs['5d'].appendChild(el);
}

function setupAccidentalButtons() {
  cellRefs['5d'].style.border = "2px solid #ddd";
  renderToggleButton();

  cellRefs['7d'].innerHTML = '<img class="solfege-img" src="https://raw.githubusercontent.com/VisualMusicalMinds/Musical-Images/refs/heads/main/MusicAppSharpSign3.png" alt="Sharp">';
  cellRefs['8d'].innerHTML = '<img class="solfege-img" src="https://raw.githubusercontent.com/VisualMusicalMinds/Musical-Images/refs/heads/main/MusicAppFlatSign3.png" alt="Flat">';
}

function setSharpTouchHeld(val) {
  sharpTouchHeld = val;
  if (val) cellRefs['7d'].classList.add('active');
  else cellRefs['7d'].classList.remove('active');
  reTriggerHeldKeysAccidentals();
}

function setFlatTouchHeld(val) {
  flatTouchHeld = val;
  if (val) cellRefs['8d'].classList.add('active');
  else cellRefs['8d'].classList.remove('active');
  reTriggerHeldKeysAccidentals();
}

function setupTouchHandlers() {
  const sharpCell = cellRefs['7d'];
  const flatCell = cellRefs['8d'];

  sharpCell.addEventListener('touchstart', function(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      activeTouches.set(touch.identifier, { type: 'sharp', element: sharpCell });
    }
    setSharpTouchHeld(true);
  });

  flatCell.addEventListener('touchstart', function(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      activeTouches.set(touch.identifier, { type: 'flat', element: flatCell });
    }
    setFlatTouchHeld(true);
  });

  sharpCell.addEventListener('mousedown', function(e) {
    e.preventDefault();
    setSharpTouchHeld(true);
  });

  flatCell.addEventListener('mousedown', function(e) {
    e.preventDefault();
    setFlatTouchHeld(true);
  });
}

function updateBoxNames() {
  const currentKey = keyNames[currentKeyIndex];

  for (const btn of buttons) {
    const div = noteButtonRefs[btn.keys[0]];
    if (!div) continue;

    if (keyboardButtonActive) {
      const keyPosition = keyToPositionGroup[btn.keys[0]];
      let kbText = '';
      if (keyboardDisplayPairsWithPosition[keyPosition]) {
        kbText = keyboardDisplayPairsWithPosition[keyPosition];
      } else {
        // Use the current solfege syllable for this button
        const currentSolfege = getCurrentSolfege(btn.keys[0]);
        kbText = keyboardDisplayPairs[currentSolfege] || '';
      }
      div.innerHTML = `<span class="keybinding-text">${kbText}</span>`;
      div.style.color = 'white';
    }
    else if (cButtonState === 'note') {
      // Get the current solfege syllable for this scale
      const currentSolfege = getCurrentSolfege(btn.keys[0]);
      div.textContent = currentSolfege || btn.name;
      
      const noteValue = letterNamesByKey[currentKey] && letterNamesByKey[currentKey][currentSolfege];

      if (noteValue && noteAccidentalMap[noteValue] === 'flat') {
        div.style.color = DARK_BLUE;
      } else if (noteValue && noteAccidentalMap[noteValue] === 'sharp') {
        div.style.color = DARK_RED;
      } else {
        div.style.color = 'white';
      }
    }
    else {
      // Show letter names
      const currentSolfege = getCurrentSolfege(btn.keys[0]);
      const noteValue = letterNamesByKey[currentKey] && letterNamesByKey[currentKey][currentSolfege];
      div.textContent = noteValue || currentSolfege;

      if (noteValue && noteAccidentalMap[noteValue] === 'flat') {
        div.style.color = DARK_BLUE;
      } else if (noteValue && noteAccidentalMap[noteValue] === 'sharp') {
        div.style.color = DARK_RED;
      } else {
        div.style.color = 'white';
      }
    }
  }
}

function createControlsBar() {
  const controlsBar = document.getElementById('controls-bar');
  
  // Create accordion toggle button
  const accordionToggle = document.createElement('button');
  accordionToggle.className = 'accordion-toggle collapsed';
  accordionToggle.innerHTML = 'Menu <span class="icon">▼</span>';
  accordionToggle.addEventListener('click', toggleAccordion);
  
  // Create controls container
  const controlsContainer = document.createElement('div');
  controlsContainer.className = 'controls-container collapsed';
  
  // Key control
  const keyButton = document.createElement('div');
  keyButton.className = 'control-area';
  keyButton.tabIndex = 0;
  keyButton.setAttribute('aria-label', 'Key control');
  keyButton.innerHTML = '<div class="arrow" id="key-left">&#9664;</div><div id="key-name">C</div><div class="arrow" id="key-right">&#9654;</div>';

  // Scale control
  const scaleControl = document.createElement('div');
  scaleControl.className = 'control-area scale-control';
  scaleControl.tabIndex = 0;
  scaleControl.setAttribute('aria-label', 'Scale control');
  
  // Create scale dropdown with all scales
  const scaleOptions = Object.entries(scaleDefinitions)
    .map(([key, scale]) => `<option value="${key}" ${key === currentScale ? 'selected' : ''}>${scale.name}</option>`)
    .join('');
  scaleControl.innerHTML = `<select id="scale-select" class="scale-dropdown">${scaleOptions}</select>`;

  // Waveform control
  const waveButton = document.createElement('div');
  waveButton.className = 'control-area';
  waveButton.tabIndex = 0;
  waveButton.setAttribute('aria-label', 'Waveform control');
  waveButton.innerHTML = '<div class="arrow" id="left-arrow">&#9664;</div><div id="waveform-name">triangle</div><div class="arrow" id="right-arrow">&#9654;</div>';

  // Volume control
  const volumeControl = document.createElement('div');
  volumeControl.className = 'volume-control';
  volumeControl.innerHTML = `
    <span class="volume-label" id="volume-label" for="volume-slider">Volume</span>
    <input type="range" min="0" max="1" step="0.01" value="0.4" id="volume-slider" class="volume-slider" aria-label="Volume slider">
    <span class="volume-value" id="volume-value">40%</span>
  `;
  volumeControl.tabIndex = 0;
  volumeControl.setAttribute('aria-label', 'Volume control');
  volumeControl.style.outline = 'none';

  // Keyboard button
  const keyboardButton = document.createElement('div');
  keyboardButton.className = 'control-area keyboard-button';
  keyboardButton.tabIndex = 0;
  keyboardButton.setAttribute('aria-label', 'Keyboard view toggle');
  keyboardButton.textContent = 'Keyboard';
  keyboardButton.id = 'keyboard-button';

  // Add controls to container
  controlsContainer.appendChild(keyButton);
  controlsContainer.appendChild(scaleControl);
  controlsContainer.appendChild(waveButton);
  controlsContainer.appendChild(volumeControl);
  controlsContainer.appendChild(keyboardButton);

  // Add both accordion toggle and container to controls bar
  controlsBar.appendChild(accordionToggle);
  controlsBar.appendChild(controlsContainer);

  return { keyButton, scaleControl, waveButton, volumeControl, keyboardButton };
}

function updateKeyboardButton() {
  const keyboardButton = document.getElementById('keyboard-button');
  if (keyboardButtonActive) {
    keyboardButton.classList.add('active-control');
    keyboardButton.style.background = '#007AFF';
    keyboardButton.style.color = 'white';
  } else {
    keyboardButton.classList.remove('active-control');
    keyboardButton.style.background = '';
    keyboardButton.style.color = '';
  }
}

function setupControlEvents() {
  document.getElementById("key-left").onclick = () => {
    currentKeyIndex = (currentKeyIndex - 1 + keyNames.length) % keyNames.length;
    document.getElementById("key-name").textContent = keyNames[currentKeyIndex];
    updateTransposedFrequencies();
    updateScaleMappings();
    updateSolfegeColors();
    updateBoxNames();
  };
  
  document.getElementById("key-right").onclick = () => {
    currentKeyIndex = (currentKeyIndex + 1) % keyNames.length;
    document.getElementById("key-name").textContent = keyNames[currentKeyIndex];
    updateTransposedFrequencies();
    updateScaleMappings();
    updateSolfegeColors();
    updateBoxNames();
  };
  
  // Scale dropdown change handler
  document.getElementById("scale-select").onchange = (e) => {
    currentScale = e.target.value;
    updateScaleMappings();
    updateSolfegeColors();
    updateBoxNames();
  };
  
  document.getElementById("left-arrow").onclick = () => {
    currentWaveformIndex = (currentWaveformIndex - 1 + waveforms.length) % waveforms.length;
    currentWaveform = waveforms[currentWaveformIndex];
    document.getElementById("waveform-name").textContent = currentWaveform;
  };
  
  document.getElementById("right-arrow").onclick = () => {
    currentWaveformIndex = (currentWaveformIndex + 1) % waveforms.length;
    currentWaveform = waveforms[currentWaveformIndex];
    document.getElementById("waveform-name").textContent = currentWaveform;
  };

  // Volume control
  const volumeSlider = document.getElementById('volume-slider');
  const volumeValue = document.getElementById('volume-value');
  volumeSlider.value = globalVolume;
  volumeValue.textContent = `${Math.round(globalVolume * 100)}%`;
  volumeSlider.addEventListener('input', () => {
    globalVolume = parseFloat(volumeSlider.value);
    volumeValue.textContent = `${Math.round(globalVolume * 100)}%`;
  });

  // Keyboard button
  const keyboardButton = document.getElementById('keyboard-button');
  keyboardButton.addEventListener('click', () => {
    keyboardButtonActive = !keyboardButtonActive;
    updateKeyboardButton();
    updateBoxNames();
  });
}

function renderButtons() {
  buttons.forEach(btn => {
    if (btn.cells.length === 0) return;

    const div = document.createElement('div');
    div.className = 'note-button';
    
    // Get the current solfege syllable for this button
    const currentSolfege = getCurrentSolfege(btn.keys[0]);
    div.textContent = currentSolfege || btn.name;
    
    div.style.outline = 'none';
    div.setAttribute('data-keys', btn.keys.join(','));
    
    // Get color from current mappings
    const currentKey = keyNames[currentKeyIndex];
    const color = (noteColorsByKey[currentKey] && noteColorsByKey[currentKey][currentSolfege]) || '#ccc';
    div.style.backgroundColor = color;
    
    const rows = [...new Set(btn.cells.map(c => positions[c][0]))];
    const cols = [...new Set(btn.cells.map(c => positions[c][1]))];
    const top = Math.min(...rows) * (100 / 11);
    const left = Math.min(...cols) * (100 / 4);
    const height = rows.length * (100 / 11) - 0.5;
    const width = cols.length * (100 / 4) - 0.5;
    
    div.style.top = `${top}%`;
    div.style.left = `${left}%`;
    div.style.height = `${height}%`;
    div.style.width = `${width}%`;

    // Mouse events
    div.addEventListener('mousedown', (e) => {
      e.preventDefault();
      handlePlayKey(btn.keys[0]);
      div.classList.add('active');
      window.focus();
    });
    
    div.addEventListener('mouseup', () => {
      handleStopKey(btn.keys[0]);
      div.classList.remove('active');
    });
    
    div.addEventListener('mouseleave', () => {
      handleStopKey(btn.keys[0]);
      div.classList.remove('active');
    });

    // Touch events
    div.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        activeTouches.set(touch.identifier, { key: btn.keys[0], element: div });
      }
      handlePlayKey(btn.keys[0]);
      div.classList.add('active');
      window.focus();
    });

    grid.appendChild(div);
    btn.keys.forEach(k => {
      keyToDiv[k] = div;
      noteButtonRefs[k] = div;
    });
  });
}

function setupGlobalEventHandlers() {
  // Touch and mouse cleanup
  document.addEventListener('touchend', handleTouchEnd);
  document.addEventListener('touchcancel', handleTouchEnd);
  
  document.addEventListener('mouseup', (e) => {
    accidentalHeld.sharp = false;
    accidentalHeld.flat = false;
    cellRefs['7d'].classList.remove('active');
    cellRefs['8d'].classList.remove('active');
    setSharpTouchHeld(false);
    setFlatTouchHeld(false);
    for (const key of [...heldNoteKeys]) {
      handleStopKey(key);
      if (keyToDiv[key]) {
        keyToDiv[key].classList.remove('active');
      }
    }
  });

  // Keyboard events
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    let accidentalChanged = false;
    
    if (e.key === '=') {
      accidentalHeld.sharp = true; 
      accidentalChanged = true;
      cellRefs['7d'].classList.add('active');
    }
    if (e.key === '-') {
      accidentalHeld.flat = true; 
      accidentalChanged = true;
      cellRefs['8d'].classList.add('active');
    }

    // Control navigation
    if (document.activeElement && document.activeElement.classList.contains('control-area')) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (document.activeElement.querySelector('#key-left')) {
          if (e.key === 'ArrowLeft') document.getElementById('key-left').click();
          else if (e.key === 'ArrowRight') document.getElementById('key-right').click();
          e.preventDefault();
          return;
        }
        if (document.activeElement.querySelector('#left-arrow')) {
          if (e.key === 'ArrowLeft') document.getElementById('left-arrow').click();
          else if (e.key === 'ArrowRight') document.getElementById('right-arrow').click();
          e.preventDefault();
          return;
        }
      }
    }

    if (document.activeElement && document.activeElement.classList.contains('volume-control') && 
        (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      return;
    }

    if (document.activeElement && document.activeElement.id === 'keyboard-button' && 
        (e.key === ' ' || e.key === 'Enter')) {
      document.getElementById('keyboard-button').click();
      e.preventDefault();
      return;
    }

    // Note playing
    if (!heldKeys.has(e.key) && buttons.some(b => b.keys.includes(e.key))) {
      heldKeys.add(e.key);
      handlePlayKey(e.key);
      if (keyToDiv[e.key]) keyToDiv[e.key].classList.add('active');
    }
    
    if (accidentalChanged) {
      reTriggerHeldKeysAccidentals();
    }
  });

  window.addEventListener('keyup', (e) => {
    let accidentalChanged = false;
    
    if (e.key === '=') {
      accidentalHeld.sharp = false; 
      accidentalChanged = true;
      cellRefs['7d'].classList.remove('active');
    }
    if (e.key === '-') {
      accidentalHeld.flat = false; 
      accidentalChanged = true;
      cellRefs['8d'].classList.remove('active');
    }
    
    if (heldKeys.has(e.key)) {
      heldKeys.delete(e.key);
      handleStopKey(e.key);
      if (keyToDiv[e.key]) keyToDiv[e.key].classList.remove('active');
    }
    
    if (accidentalChanged) {
      reTriggerHeldKeysAccidentals();
    }
  });

  // Visibility and blur cleanup
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      for (const key of [...heldNoteKeys]) {
        handleStopKey(key);
      }
      heldNoteKeys.clear();
      accidentalHeld.sharp = false;
      accidentalHeld.flat = false;
      setSharpTouchHeld(false);
      setFlatTouchHeld(false);
      activeTouches.clear();
      document.querySelectorAll('.active').forEach(el => {
        el.classList.remove('active');
      });
    }
  });

  window.addEventListener('blur', () => {
    const activeOscKeys = Object.keys(activeOscillators);
    if (activeOscKeys.length > 0) {
      for (const key of activeOscKeys) {
        stopNote(key);
      }
    }
  });

  // Handle window resize to update accordion state
  window.addEventListener('resize', () => {
    const mq = window.matchMedia("(max-width: 550px)");
    if (!mq.matches) {
      // Reset accordion state when returning to desktop
      const controlsContainer = document.querySelector('.controls-container');
      const accordionToggle = document.querySelector('.accordion-toggle');
      const gridWrapper = document.querySelector('.proportional-grid-wrapper');
      if (controlsContainer) {
        controlsContainer.classList.remove('collapsed', 'expanded');
      }
      if (accordionToggle) {
        accordionToggle.style.display = 'none';
      }
      if (gridWrapper) {
        gridWrapper.classList.remove('menu-expanded');
      }
    } else {
      // Ensure proper state on mobile
      updateAccordionState();
    }
  });
}

function handleTouchEnd(e) {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    const touchData = activeTouches.get(touch.identifier);
    if (touchData) {
      if (touchData.key) {
        handleStopKey(touchData.key);
        if (touchData.element) {
          touchData.element.classList.remove('active');
        }
      } else if (touchData.type === 'sharp') {
        setSharpTouchHeld(false);
      } else if (touchData.type === 'flat') {
        setFlatTouchHeld(false);
      }
      activeTouches.delete(touch.identifier);
    }
  }
}

function updateSolfegeColors() {
  const currentKey = keyNames[currentKeyIndex];
  const bgColors = noteColorsByKey[currentKey];
  
  buttons.forEach(btn => {
    const div = keyToDiv[btn.keys[0]];
    if (div) {
      // Get the current solfege syllable for this button and scale
      const currentSolfege = getCurrentSolfege(btn.keys[0]);
      
      if (bgColors && bgColors[currentSolfege]) {
        div.style.backgroundColor = bgColors[currentSolfege];
      }

      if (!keyboardButtonActive) {
        const noteValue = letterNamesByKey[currentKey] && letterNamesByKey[currentKey][currentSolfege];

        if (noteValue && noteAccidentalMap[noteValue] === 'flat') {
          div.style.color = DARK_BLUE;
        } else if (noteValue && noteAccidentalMap[noteValue] === 'sharp') {
          div.style.color = DARK_RED;
        } else {
          div.style.color = 'white';
        }
      } else {
        div.style.color = 'white';
      }
    }
  });
}

function resizeGrid() {
  const gridEl = document.getElementById('grid');
  const gridWrapper = document.querySelector('.proportional-grid-wrapper');
  const gwRect = gridWrapper.getBoundingClientRect();
  const availableWidth = gwRect.width;
  const availableHeight = gwRect.height;
  const aspectW = 4;
  const aspectH = 11;
  
  let gridWidth = availableHeight * (aspectW/aspectH);
  let gridHeight = availableHeight;
  
  if (gridWidth > availableWidth) {
    gridWidth = availableWidth;
    gridHeight = availableWidth * (aspectH/aspectW);
  }
  
  gridEl.style.width = gridWidth + 'px';
  gridEl.style.height = gridHeight + 'px';
  gridEl.style.marginLeft = "auto";
  gridEl.style.marginRight = "auto";
  gridEl.style.marginTop = "0";
  gridEl.style.marginBottom = "0";
  
  const fontSize = Math.min(gridHeight / 11, gridWidth / 4) * 0.5;
  gridEl.querySelectorAll('.note-button').forEach(div => {
    div.style.fontSize = fontSize + 'px';
  });
  gridEl.querySelectorAll('.cell').forEach(div => {
    div.style.fontSize = fontSize + 'px';
  });
  
  const toggleBtn = cellRefs['5d'].querySelector('.chord-toggle-btn');
  if (toggleBtn) toggleBtn.style.fontSize = Math.max(fontSize * 1.1, 20) + 'px';
}

// --- INITIALIZATION ---
function initialize() {
  initializeGrid();
  setupAccidentalButtons();
  setupTouchHandlers();
  createControlsBar();
  setupControlEvents();
  renderButtons();
  setupGlobalEventHandlers();
  
  // Resize handling
  window.addEventListener('resize', resizeGrid);
  window.addEventListener('DOMContentLoaded', () => { 
    setTimeout(() => { 
      resizeGrid(); 
      updateSolfegeColors(); 
      updateBoxNames(); 
    }, 1); 
  });
  
  setTimeout(() => { 
    resizeGrid(); 
    updateScaleMappings();
    updateSolfegeColors(); 
    updateBoxNames(); 
    updateAccordionState(); // Initialize accordion state
  }, 200);
  
  const mq = window.matchMedia("(max-width: 550px)");
  mq.addEventListener("change", () => { 
    resizeGrid(); 
    updateSolfegeColors(); 
    updateBoxNames(); 
  });

  // Initial setup
  updateScaleMappings(); // Initialize scale mappings first
  updateTransposedFrequencies();
  updateSolfegeColors();
  updateBoxNames();
}

// Start the application
initialize();
