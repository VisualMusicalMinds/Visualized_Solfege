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

// Base color mapping for keys, tied to the 7 note letters
const KEY_COLORS = {
  'C': '#FF3B30', // Red
  'D': '#FF9500', // Orange
  'E': '#FFCC00', // Yellow
  'F': '#34C759', // Green
  'G': '#30c0c6', // Turquoise
  'A': '#007AFF', // Blue
  'B': '#AF52DE'  // Purple
};

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

const scaleSpellings = {
    'C': {
        'major': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
        'dorian': ['C', 'D', 'E♭', 'F', 'G', 'A', 'B♭'],
        'phrygian': ['C', 'D♭', 'E♭', 'F', 'G', 'A♭', 'B♭'],
        'lydian': ['C', 'D', 'E', 'F♯', 'G', 'A', 'B'],
        'mixolydian': ['C', 'D', 'E', 'F', 'G', 'A', 'B♭'],
        'natural-minor': ['C', 'D', 'E♭', 'F', 'G', 'A♭', 'B♭'],
        'harmonic-minor': ['C', 'D', 'E♭', 'F', 'G', 'A♭', 'B'],
        'melodic-minor': ['C', 'D', 'E♭', 'F', 'G', 'A', 'B'],
        'locrian': ['C', 'D♭', 'E♭', 'F', 'G♭', 'A♭', 'B♭']
    },
    'Db': {
        'major': ['D♭', 'E♭', 'F', 'G♭', 'A♭', 'B♭', 'C'],
        'dorian': ['D♭', 'E♭', 'F♭', 'G♭', 'A♭', 'B♭', 'C♭'],
        'phrygian': ['D♭', 'E𝄫', 'F♭', 'G♭', 'A♭', 'B𝄫', 'C♭'],
        'lydian': ['D♭', 'E♭', 'F', 'G', 'A♭', 'B♭', 'C'],
        'mixolydian': ['D♭', 'E♭', 'F', 'G♭', 'A♭', 'B♭', 'C♭'],
        'natural-minor': ['D♭', 'E♭', 'F♭', 'G♭', 'A♭', 'B𝄫', 'C♭'],
        'harmonic-minor': ['D♭', 'E♭', 'F♭', 'G♭', 'A♭', 'B𝄫', 'C'],
        'melodic-minor': ['D♭', 'E♭', 'F♭', 'G♭', 'A♭', 'B♭', 'C'],
        'locrian': ['D♭', 'E𝄫', 'F♭', 'G𝄫', 'A𝄫', 'B𝄫', 'C♭']
    },
    'C#': {
        'major': ['C♯', 'D♯', 'E♯', 'F♯', 'G♯', 'A♯', 'B♯'],
        'dorian': ['C♯', 'D♯', 'E', 'F♯', 'G♯', 'A♯', 'B'],
        'phrygian': ['C♯', 'D', 'E', 'F♯', 'G♯', 'A', 'B'],
        'lydian': ['C♯', 'D♯', 'E♯', 'F♯♯', 'G♯', 'A♯', 'B♯'],
        'mixolydian': ['C♯', 'D♯', 'E♯', 'F♯', 'G♯', 'A♯', 'B'],
        'natural-minor': ['C♯', 'D♯', 'E', 'F♯', 'G♯', 'A', 'B'],
        'harmonic-minor': ['C♯', 'D♯', 'E', 'F♯', 'G♯', 'A', 'B♯'],
        'melodic-minor': ['C♯', 'D♯', 'E', 'F♯', 'G♯', 'A♯', 'B♯'],
        'locrian': ['C♯', 'D', 'E', 'F♯', 'G', 'A', 'B']
    },
    'D': {
        'major': ['D', 'E', 'F♯', 'G', 'A', 'B', 'C♯'],
        'dorian': ['D', 'E', 'F', 'G', 'A', 'B', 'C'],
        'phrygian': ['D', 'E♭', 'F', 'G', 'A', 'B♭', 'C'],
        'lydian': ['D', 'E', 'F♯', 'G♯', 'A', 'B', 'C♯'],
        'mixolydian': ['D', 'E', 'F♯', 'G', 'A', 'B', 'C'],
        'natural-minor': ['D', 'E', 'F', 'G', 'A', 'B♭', 'C'],
        'harmonic-minor': ['D', 'E', 'F', 'G', 'A', 'B♭', 'C♯'],
        'melodic-minor': ['D', 'E', 'F', 'G', 'A', 'B', 'C♯'],
        'locrian': ['D', 'E♭', 'F', 'G', 'A♭', 'B♭', 'C']
    },
    'Eb': {
        'major': ['E♭', 'F', 'G', 'A♭', 'B♭', 'C', 'D'],
        'dorian': ['E♭', 'F', 'G♭', 'A♭', 'B♭', 'C', 'D♭'],
        'phrygian': ['E♭', 'F♭', 'G♭', 'A♭', 'B♭', 'C♭', 'D♭'],
        'lydian': ['E♭', 'F', 'G', 'A', 'B♭', 'C', 'D'],
        'mixolydian': ['E♭', 'F', 'G', 'A♭', 'B♭', 'C', 'D♭'],
        'natural-minor': ['E♭', 'F', 'G♭', 'A♭', 'B♭', 'C♭', 'D♭'],
        'harmonic-minor': ['E♭', 'F', 'G♭', 'A♭', 'B♭', 'C♭', 'D'],
        'melodic-minor': ['E♭', 'F', 'G♭', 'A♭', 'B♭', 'C', 'D'],
        'locrian': ['E♭', 'F♭', 'G♭', 'A♭', 'B𝄫', 'C♭', 'D♭']
    },
    'D#': {
        'major': ['D♯', 'E♯', 'F♯♯', 'G♯', 'A♯', 'B♯', 'C♯♯'],
        'dorian': ['D♯', 'E♯', 'F♯', 'G♯', 'A♯', 'B♯', 'C♯'],
        'phrygian': ['D♯', 'E', 'F♯', 'G♯', 'A♯', 'B', 'C♯'],
        'lydian': ['D♯', 'E♯', 'F♯♯', 'G♯♯', 'A♯', 'B♯', 'C♯♯'],
        'mixolydian': ['D♯', 'E♯', 'F♯♯', 'G♯', 'A♯', 'B♯', 'C♯'],
        'natural-minor': ['D♯', 'E♯', 'F♯', 'G♯', 'A♯', 'B', 'C♯'],
        'harmonic-minor': ['D♯', 'E♯', 'F♯', 'G♯', 'A♯', 'B', 'C♯♯'],
        'melodic-minor': ['D♯', 'E♯', 'F♯', 'G♯', 'A♯', 'B♯', 'C♯♯'],
        'locrian': ['D♯', 'E', 'F♯', 'G♯', 'A', 'B', 'C♯']
    },
    'E': {
        'major': ['E', 'F♯', 'G♯', 'A', 'B', 'C♯', 'D♯'],
        'dorian': ['E', 'F♯', 'G', 'A', 'B', 'C♯', 'D'],
        'phrygian': ['E', 'F', 'G', 'A', 'B', 'C', 'D'],
        'lydian': ['E', 'F♯', 'G♯', 'A♯', 'B', 'C♯', 'D♯'],
        'mixolydian': ['E', 'F♯', 'G♯', 'A', 'B', 'C♯', 'D'],
        'natural-minor': ['E', 'F♯', 'G', 'A', 'B', 'C', 'D'],
        'harmonic-minor': ['E', 'F♯', 'G', 'A', 'B', 'C', 'D♯'],
        'melodic-minor': ['E', 'F♯', 'G', 'A', 'B', 'C♯', 'D♯'],
        'locrian': ['E', 'F', 'G', 'A', 'B♭', 'C', 'D']
    },
    'F': {
        'major': ['F', 'G', 'A', 'B♭', 'C', 'D', 'E'],
        'dorian': ['F', 'G', 'A♭', 'B♭', 'C', 'D', 'E♭'],
        'phrygian': ['F', 'G♭', 'A♭', 'B♭', 'C', 'D♭', 'E♭'],
        'lydian': ['F', 'G', 'A', 'B', 'C', 'D', 'E'],
        'mixolydian': ['F', 'G', 'A', 'B♭', 'C', 'D', 'E♭'],
        'natural-minor': ['F', 'G', 'A♭', 'B♭', 'C', 'D♭', 'E♭'],
        'harmonic-minor': ['F', 'G', 'A♭', 'B♭', 'C', 'D♭', 'E'],
        'melodic-minor': ['F', 'G', 'A♭', 'B♭', 'C', 'D', 'E'],
        'locrian': ['F', 'G♭', 'A♭', 'B♭', 'C♭', 'D♭', 'E♭']
    },
    'Gb': {
        'major': ['G♭', 'A♭', 'B♭', 'C♭', 'D♭', 'E♭', 'F'],
        'dorian': ['G♭', 'A♭', 'B𝄫', 'C♭', 'D♭', 'E♭', 'F♭'],
        'phrygian': ['G♭', 'A𝄫', 'B𝄫', 'C♭', 'D♭', 'E𝄫', 'F♭'],
        'lydian': ['G♭', 'A♭', 'B♭', 'C', 'D♭', 'E♭', 'F'],
        'mixolydian': ['G♭', 'A♭', 'B♭', 'C♭', 'D♭', 'E♭', 'F♭'],
        'natural-minor': ['G♭', 'A♭', 'B𝄫', 'C♭', 'D♭', 'E𝄫', 'F♭'],
        'harmonic-minor': ['G♭', 'A♭', 'B𝄫', 'C♭', 'D♭', 'E𝄫', 'F'],
        'melodic-minor': ['G♭', 'A♭', 'B𝄫', 'C♭', 'D♭', 'E♭', 'F'],
        'locrian': ['G♭', 'A𝄫', 'B𝄫', 'C♭', 'D𝄫', 'E𝄫', 'F♭']
    },
    'F#': {
        'major': ['F♯', 'G♯', 'A♯', 'B', 'C♯', 'D♯', 'E♯'],
        'dorian': ['F♯', 'G♯', 'A', 'B', 'C♯', 'D♯', 'E'],
        'phrygian': ['F♯', 'G', 'A', 'B', 'C♯', 'D', 'E'],
        'lydian': ['F♯', 'G♯', 'A♯', 'B♯', 'C♯', 'D♯', 'E♯'],
        'mixolydian': ['F♯', 'G♯', 'A♯', 'B', 'C♯', 'D♯', 'E'],
        'natural-minor': ['F♯', 'G♯', 'A', 'B', 'C♯', 'D', 'E'],
        'harmonic-minor': ['F♯', 'G♯', 'A', 'B', 'C♯', 'D', 'E♯'],
        'melodic-minor': ['F♯', 'G♯', 'A', 'B', 'C♯', 'D♯', 'E♯'],
        'locrian': ['F♯', 'G', 'A', 'B', 'C', 'D', 'E']
    },
    'G': {
        'major': ['G', 'A', 'B', 'C', 'D', 'E', 'F♯'],
        'dorian': ['G', 'A', 'B♭', 'C', 'D', 'E', 'F'],
        'phrygian': ['G', 'A♭', 'B♭', 'C', 'D', 'E♭', 'F'],
        'lydian': ['G', 'A', 'B', 'C♯', 'D', 'E', 'F♯'],
        'mixolydian': ['G', 'A', 'B', 'C', 'D', 'E', 'F'],
        'natural-minor': ['G', 'A', 'B♭', 'C', 'D', 'E♭', 'F'],
        'harmonic-minor': ['G', 'A', 'B♭', 'C', 'D', 'E♭', 'F♯'],
        'melodic-minor': ['G', 'A', 'B♭', 'C', 'D', 'E', 'F♯'],
        'locrian': ['G', 'A♭', 'B♭', 'C', 'D♭', 'E♭', 'F']
    },
    'Ab': {
        'major': ['A♭', 'B♭', 'C', 'D♭', 'E♭', 'F', 'G'],
        'dorian': ['A♭', 'B♭', 'C♭', 'D♭', 'E♭', 'F', 'G♭'],
        'phrygian': ['A♭', 'B𝄫', 'C♭', 'D♭', 'E♭', 'F♭', 'G♭'],
        'lydian': ['A♭', 'B♭', 'C', 'D', 'E♭', 'F', 'G'],
        'mixolydian': ['A♭', 'B♭', 'C', 'D♭', 'E♭', 'F', 'G♭'],
        'natural-minor': ['A♭', 'B♭', 'C♭', 'D♭', 'E♭', 'F♭', 'G♭'],
        'harmonic-minor': ['A♭', 'B♭', 'C♭', 'D♭', 'E♭', 'F♭', 'G'],
        'melodic-minor': ['A♭', 'B♭', 'C♭', 'D♭', 'E♭', 'F', 'G'],
        'locrian': ['A♭', 'B𝄫', 'C♭', 'D♭', 'E𝄫', 'F♭', 'G♭']
    },
    'G#': {
        'major': ['G♯', 'A♯', 'B♯', 'C♯', 'D♯', 'E♯', 'F♯♯'],
        'dorian': ['G♯', 'A♯', 'B', 'C♯', 'D♯', 'E♯', 'F♯'],
        'phrygian': ['G♯', 'A', 'B', 'C♯', 'D♯', 'E', 'F♯'],
        'lydian': ['G♯', 'A♯', 'B♯', 'C♯♯', 'D♯', 'E♯', 'F♯♯'],
        'mixolydian': ['G♯', 'A♯', 'B♯', 'C♯', 'D♯', 'E♯', 'F♯'],
        'natural-minor': ['G♯', 'A♯', 'B', 'C♯', 'D♯', 'E', 'F♯'],
        'harmonic-minor': ['G♯', 'A♯', 'B', 'C♯', 'D♯', 'E', 'F♯♯'],
        'melodic-minor': ['G♯', 'A♯', 'B', 'C♯', 'D♯', 'E♯', 'F♯♯'],
        'locrian': ['G♯', 'A', 'B', 'C♯', 'D', 'E', 'F♯']
    },
    'A': {
        'major': ['A', 'B', 'C♯', 'D', 'E', 'F♯', 'G♯'],
        'dorian': ['A', 'B', 'C', 'D', 'E', 'F♯', 'G'],
        'phrygian': ['A', 'B♭', 'C', 'D', 'E', 'F', 'G'],
        'lydian': ['A', 'B', 'C♯', 'D♯', 'E', 'F♯', 'G♯'],
        'mixolydian': ['A', 'B', 'C♯', 'D', 'E', 'F♯', 'G'],
        'natural-minor': ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        'harmonic-minor': ['A', 'B', 'C', 'D', 'E', 'F', 'G♯'],
        'melodic-minor': ['A', 'B', 'C', 'D', 'E', 'F♯', 'G♯'],
        'locrian': ['A', 'B♭', 'C', 'D', 'E♭', 'F', 'G']
    },
    'Bb': {
        'major': ['B♭', 'C', 'D', 'E♭', 'F', 'G', 'A'],
        'dorian': ['B♭', 'C', 'D♭', 'E♭', 'F', 'G', 'A♭'],
        'phrygian': ['B♭', 'C♭', 'D♭', 'E♭', 'F', 'G♭', 'A♭'],
        'lydian': ['B♭', 'C', 'D', 'E', 'F', 'G', 'A'],
        'mixolydian': ['B♭', 'C', 'D', 'E♭', 'F', 'G', 'A♭'],
        'natural-minor': ['B♭', 'C', 'D♭', 'E♭', 'F', 'G♭', 'A♭'],
        'harmonic-minor': ['B♭', 'C', 'D♭', 'E♭', 'F', 'G♭', 'A'],
        'melodic-minor': ['B♭', 'C', 'D♭', 'E♭', 'F', 'G', 'A'],
        'locrian': ['B♭', 'C♭', 'D♭', 'E♭', 'F♭', 'G♭', 'A♭']
    },
    'A#': {
        'major': ['A♯', 'B♯', 'C♯♯', 'D♯', 'E♯', 'F♯♯', 'G♯♯'],
        'dorian': ['A♯', 'B♯', 'C♯', 'D♯', 'E♯', 'F♯♯', 'G♯'],
        'phrygian': ['A♯', 'B', 'C♯', 'D♯', 'E♯', 'F♯', 'G♯'],
        'lydian': ['A♯', 'B♯', 'C♯♯', 'D♯♯', 'E♯', 'F♯♯', 'G♯♯'],
        'mixolydian': ['A♯', 'B♯', 'C♯♯', 'D♯', 'E♯', 'F♯♯', 'G♯'],
        'natural-minor': ['A♯', 'B♯', 'C♯', 'D♯', 'E♯', 'F♯', 'G♯'],
        'harmonic-minor': ['A♯', 'B♯', 'C♯', 'D♯', 'E♯', 'F♯', 'G♯♯'],
        'melodic-minor': ['A♯', 'B♯', 'C♯', 'D♯', 'E♯', 'F♯♯', 'G♯♯'],
        'locrian': ['A♯', 'B', 'C♯', 'D♯', 'E', 'F♯', 'G♯']
    },
    'B': {
        'major': ['B', 'C♯', 'D♯', 'E', 'F♯', 'G♯', 'A♯'],
        'dorian': ['B', 'C♯', 'D', 'E', 'F♯', 'G♯', 'A'],
        'phrygian': ['B', 'C', 'D', 'E', 'F♯', 'G', 'A'],
        'lydian': ['B', 'C♯', 'D♯', 'E♯', 'F♯', 'G♯', 'A♯'],
        'mixolydian': ['B', 'C♯', 'D♯', 'E', 'F♯', 'G♯', 'A'],
        'natural-minor': ['B', 'C♯', 'D', 'E', 'F♯', 'G', 'A'],
        'harmonic-minor': ['B', 'C♯', 'D', 'E', 'F♯', 'G', 'A♯'],
        'melodic-minor': ['B', 'C♯', 'D', 'E', 'F♯', 'G♯', 'A♯'],
        'locrian': ['B', 'C', 'D', 'E', 'F', 'G', 'A']
    }
};

// Define colors for sharp and flat notes
const DARK_RED = '#990000';
const DARK_BLUE = '#000099';

// --- NEW FUNCTION ---
// Get the enharmonically correct key name based on the selected scale
function getEffectiveKeyName(keyIndex, scaleName) {
    const baseKeyName = keyNames[keyIndex];

    // Logic for Db/C# at index 1
    if (keyIndex === 1) {
        switch (scaleName) {
            case 'major':
            case 'lydian':
            case 'mixolydian':
                return 'Db';
            default: // minor scales, dorian, phrygian, locrian
                return 'C#';
        }
    }

    // Logic for Eb/D# at index 3
    if (keyIndex === 3) {
        switch (scaleName) {
            case 'phrygian':
            case 'locrian':
                return 'D#';
            default: // All other scales
                return 'Eb';
        }
    }
    
    // Logic for Gb/F# at index 6
    if (keyIndex === 6) {
        switch (scaleName) {
            case 'major':
            case 'lydian':
                return 'Gb';
            default: // All other scales
                return 'F#';
        }
    }

    // Logic for Ab/G# at index 8
    if (keyIndex === 8) {
        switch (scaleName) {
            case 'natural-minor':
            case 'harmonic-minor':
            case 'melodic-minor':
            case 'phrygian':
            case 'locrian':
                return 'G#';
            default: // Major, dorian, lydian, mixolydian
                return 'Ab';
        }
    }
    
    // Logic for Bb/A# at index 10
    if (keyIndex === 10) {
        switch (scaleName) {
            case 'locrian':
                return 'A#';
            default: // All other scales
                return 'Bb';
        }
    }

    // Return the default key name for all other keys
    return baseKeyName;
}


// Generate letter names for a specific key and scale using the new lookup table
function generateLetterNamesForScale(keyName, scaleName) {
    const scale = scaleDefinitions[scaleName];
    if (!scale) return {};

    // Use the hardcoded spellings
    const notes = scaleSpellings[keyName]?.[scaleName] || [];
    const letterNames = {};

    scale.solfege.forEach((solfege, index) => {
        if (notes[index]) {
            letterNames[solfege] = notes[index];
        }
    });

    return letterNames;
}


// Generate color mappings for a specific key (colors stay tied to letter names)
function generateColorsForScale(keyName, scaleName) {
    const scale = scaleDefinitions[scaleName];
    if (!scale) return {};

    const letterNames = generateLetterNamesForScale(keyName, scaleName);
    const colors = {};

    for (const solfege in letterNames) {
        const noteName = letterNames[solfege];
        const noteLetter = noteName.charAt(0);
        colors[solfege] = KEY_COLORS[noteLetter];
    }

    return colors;
}

// Base frequencies for C Major scale (anchor for calculations)
const baseFrequencies = {
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
    'F5': 698.46, 'F3': 174.61
};

// This will hold the currently active frequencies for the selected key and scale
let noteFrequencies = {};

// Function to calculate and update note frequencies for the current key and scale
function updateNoteFrequencies() {
    const keyIndex = currentKeyIndex; // 0 for C, 1 for Db, etc.
    let rootFrequency = 261.63 * Math.pow(2, keyIndex / 12); // C4 as the base
    const scale = scaleDefinitions[currentScale];

    // Lower the octave for keys Ab, A, Bb, and B to make them the lowest
    if ([8, 9, 10, 11].includes(keyIndex)) {
        rootFrequency /= 2;
    }

    const scaleFrequencies = {};
    scale.intervals.forEach((interval, i) => {
        const solfege = scale.solfege[i];
        scaleFrequencies[solfege] = rootFrequency * Math.pow(2, interval / 12);
    });

    // Map the calculated scale frequencies to the keyboard layout
    noteFrequencies = {
        'C4': scaleFrequencies['Do'],
        'D4': scaleFrequencies['Re'],
        'E4': scaleFrequencies['Mi'] || scaleFrequencies['Me'],
        'F4': scaleFrequencies['Fa'] || scaleFrequencies['Fi'],
        'G4': scaleFrequencies['So'] || scaleFrequencies['Se'],
        'A4': scaleFrequencies['La'] || scaleFrequencies['Le'],
        'B4': scaleFrequencies['Ti'] || scaleFrequencies['Te'],
        // Octaves and other notes
        'G3': (scaleFrequencies['So'] || scaleFrequencies['Se']) / 2,
        'A3': (scaleFrequencies['La'] || scaleFrequencies['Le']) / 2,
        'B3': (scaleFrequencies['Ti'] || scaleFrequencies['Te']) / 2,
        'C5': scaleFrequencies['Do'] * 2,
        'D5': scaleFrequencies['Re'] * 2,
        'E5': (scaleFrequencies['Mi'] || scaleFrequencies['Me']) * 2,
        'F5': (scaleFrequencies['Fa'] || scaleFrequencies['Fi']) * 2,
        'F3': (scaleFrequencies['Fa'] || scaleFrequencies['Fi']) / 2,
    };

    // Handle Phrygian 'Ra' which replaces 'Re'
    if (currentScale === 'phrygian' || currentScale === 'locrian') {
        noteFrequencies['D4'] = scaleFrequencies['Ra'];
        noteFrequencies['D5'] = scaleFrequencies['Ra'] * 2;
    }
}


// Dynamic color and letter name mappings (generated based on on current key and scale)
let noteColorsByKey = {};
let letterNamesByKey = {};

// Function to update mappings when key or scale changes
function updateScaleMappings() {
  // Generate new mappings for all keys with current scale
  noteColorsByKey = {};
  letterNamesByKey = {};
  
  keyNames.forEach((key, index) => {
    // For the Db/C# key
    if (index === 1) {
        letterNamesByKey['Db'] = generateLetterNamesForScale('Db', currentScale);
        noteColorsByKey['Db'] = generateColorsForScale('Db', currentScale);
        letterNamesByKey['C#'] = generateLetterNamesForScale('C#', currentScale);
        noteColorsByKey['C#'] = generateColorsForScale('C#', currentScale);
    // For the Eb/D# key
    } else if (index === 3) {
        letterNamesByKey['Eb'] = generateLetterNamesForScale('Eb', currentScale);
        noteColorsByKey['Eb'] = generateColorsForScale('Eb', currentScale);
        letterNamesByKey['D#'] = generateLetterNamesForScale('D#', currentScale);
        noteColorsByKey['D#'] = generateColorsForScale('D#', currentScale);
    // For the Gb/F# key
    } else if (index === 6) {
        letterNamesByKey['Gb'] = generateLetterNamesForScale('Gb', currentScale);
        noteColorsByKey['Gb'] = generateColorsForScale('Gb', currentScale);
        letterNamesByKey['F#'] = generateLetterNamesForScale('F#', currentScale);
        noteColorsByKey['F#'] = generateColorsForScale('F#', currentScale);
    // For the Ab/G# key
    } else if (index === 8) {
        letterNamesByKey['Ab'] = generateLetterNamesForScale('Ab', currentScale);
        noteColorsByKey['Ab'] = generateColorsForScale('Ab', currentScale);
        letterNamesByKey['G#'] = generateLetterNamesForScale('G#', currentScale);
        noteColorsByKey['G#'] = generateColorsForScale('G#', currentScale);
    // For the Bb/A# key
    } else if (index === 10) {
        letterNamesByKey['Bb'] = generateLetterNamesForScale('Bb', currentScale);
        noteColorsByKey['Bb'] = generateColorsForScale('Bb', currentScale);
        letterNamesByKey['A#'] = generateLetterNamesForScale('A#', currentScale);
        noteColorsByKey['A#'] = generateColorsForScale('A#', currentScale);
    } else {
        letterNamesByKey[key] = generateLetterNamesForScale(key, currentScale);
        noteColorsByKey[key] = generateColorsForScale(key, currentScale);
    }
  });

  // Also update the frequencies whenever the scale or key changes
  updateNoteFrequencies();
  updateSimulatedKeyboardColors();
}

// UI state
let cButtonState = 'note'; // can be 'note' or 'S'

// Map to identify if a note is flat or sharp
const noteAccidentalMap = {
  'C': false, 'C#': 'sharp', 'C♯': 'sharp', 'Db': 'flat', 'D♭': 'flat',
  'D': false, 'D#': 'sharp', 'D♯': 'sharp', 'Eb': 'flat', 'E♭': 'flat',
  'E': false, 'E#': 'sharp', 'E♯': 'sharp', 'Fb': 'flat', 'F♭': 'flat',
  'F': false, 'F#': 'sharp', 'F♯': 'sharp', 'Gb': 'flat', 'G♭': 'flat',
  'G': false, 'G#': 'sharp', 'G♯': 'sharp', 'Ab': 'flat', 'A♭': 'flat',
  'A': false, 'A#': 'sharp', 'A♯': 'sharp', 'Bb': 'flat', 'B♭': 'flat',
  'B': false, 'B#': 'sharp', 'B♯': 'sharp', 'Cb': 'flat', 'C♭': 'flat',
  // Double flats and sharps
  'Cbb': 'double-flat', 'Dbb': 'double-flat', 'Ebb': 'double-flat', 'Fbb': 'double-flat', 'Gbb': 'double-flat', 'Abb': 'double-flat', 'Bbb': 'double-flat',
  'C𝄫': 'double-flat', 'D𝄫': 'double-flat', 'E𝄫': 'double-flat', 'F𝄫': 'double-flat', 'G𝄫': 'double-flat', 'A𝄫': 'double-flat', 'B𝄫': 'double-flat',
  'Cx': 'double-sharp', 'Dx': 'double-sharp', 'Ex': 'double-sharp', 'Fx': 'double-sharp', 'Gx': 'double-sharp', 'Ax': 'double-sharp', 'Bx': 'double-sharp',
  'C♯♯': 'double-sharp', 'D♯♯': 'double-sharp', 'E♯♯': 'double-sharp', 'F♯♯': 'double-sharp', 'G♯♯': 'double-sharp', 'A♯♯': 'double-sharp', 'B♯♯': 'double-sharp',
};

// Keyboard mappings (expanded to include new solfege syllables)
const buttonSolfegeNames = {
  'f': 'Fa', 'q': 'So', 'd': 'Mi', 's': 'Re', 'a': 'Do', 'x': 'La', 'c': 'Ti',
  'z': 'So', 'w': 'La', 'e': 'Ti', '1': 'Do', '2': 'Re', '3': 'Mi',
  ';': 'Fa', 'm': 'So', 'l': 'Mi', 'k': 'Re', 'j': 'Do', ',': 'La', '.': 'Ti',
  'u': 'So', 'i': 'La', 'o': 'Ti', '7': 'Do', '8': 'Re', '9': 'Mi',
  'y': 'Fa', 'h': 'Ti', '/': 'Do', 'p': 'Do', '6': 'Ti', '0': 'Fa', 'r': 'Do', 'v': 'Do', '4': 'Fa',
  'n': 'Fa'
};

const solfegeToCssClass = {
    'Do': 'key-do',
    'Re': 'key-re', 'Ra': 'key-re',
    'Mi': 'key-mi', 'Me': 'key-mi',
    'Fa': 'key-fa', 'Fi': 'key-fa',
    'So': 'key-so', 'Se': 'key-so',
    'La': 'key-la', 'Le': 'key-la',
    'Ti': 'key-ti', 'Te': 'key-ti',
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
  
  // Ensure noteFrequencies has been calculated
  if (!noteFrequencies[btn.note]) {
      console.warn(`Frequency for note ${btn.note} not found.`);
      return;
  }
  
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
    
    if (!noteFrequencies[btn.note]) continue;

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
  { name: 'Do', keys: ['a', 'j', '/', 'v'], note: 'C4', cells: ['5b','6b','7b','5c','6c','7c'] },
  { name: 'La', keys: ['x', ','], note: 'A3', cells: ['8b'] },
  { name: 'Ti', keys: ['c', '.', 'h'], note: 'B3', cells: ['8c'] },
  { name: 'So', keys: ['q', 'u'], note: 'G4', cells: ['3b','4b','3c','4c'] },
  { name: 'La', keys: ['w', 'i'], note: 'A4', cells: ['4d'] },
  { name: 'Ti', keys: ['e', 'o', '6'], note: 'B4', cells: ['3d'] },
  { name: 'Do', keys: ['1', '7', 'p', 'r'], note: 'C5', cells: ['2c','2d'] },
  { name: 'Re', keys: ['2', '8'], note: 'D5', cells: ['1c'] },
  { name: 'Mi', keys: ['3', '9'], note: 'E5', cells: ['1d'] },
  { name: 'Fa', keys: ['0', '4'], note: 'F5', cells: [] },
  { name: 'Fa', keys: ['n'], note: 'F3', cells: [] }
];

// DOM references
const grid = document.getElementById('grid');
const keyToDiv = {};
const cellRefs = {};
const noteButtonRefs = {};

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
    updateBoxNames();
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      cButtonState = (cButtonState === 'note') ? 'S' : 'note';
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
  if (val) cellRefs['8d'].classList.remove('active');
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
  const currentKey = getEffectiveKeyName(currentKeyIndex, currentScale);

  for (const btn of buttons) {
    const div = noteButtonRefs[btn.keys[0]];
    if (!div) continue;

    if (cButtonState === 'note') {
      // Get the current solfege syllable for this scale
      const currentSolfege = getCurrentSolfege(btn.keys[0]);
      div.textContent = currentSolfege || btn.name;
      
      const noteValue = letterNamesByKey[currentKey] && letterNamesByKey[currentKey][currentSolfege];

      if (noteValue && (noteAccidentalMap[noteValue] === 'flat' || noteAccidentalMap[noteValue] === 'double-flat')) {
        div.style.color = DARK_BLUE;
      } else if (noteValue && (noteAccidentalMap[noteValue] === 'sharp' || noteAccidentalMap[noteValue] === 'double-sharp')) {
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

      if (noteValue && (noteAccidentalMap[noteValue] === 'flat' || noteAccidentalMap[noteValue] === 'double-flat')) {
        div.style.color = DARK_BLUE;
      } else if (noteValue && (noteAccidentalMap[noteValue] === 'sharp' || noteAccidentalMap[noteValue] === 'double-sharp')) {
        div.style.color = DARK_RED;
      } else {
        div.style.color = 'white';
      }
    }
  }
}

function createControlsBar() {
  const controlsBar = document.getElementById('controls-bar');
  controlsBar.innerHTML = ''; // Clear existing controls
  
  const keyButton = document.createElement('div');
  keyButton.className = 'control-area';
  keyButton.tabIndex = 0;
  keyButton.setAttribute('aria-label', 'Key control');
  keyButton.innerHTML = '<div class="arrow" id="key-left">&#9664;</div><div id="key-name">C</div><div class="arrow" id="key-right">&#9654;</div>';

  const scaleControl = document.createElement('div');
  scaleControl.className = 'control-area scale-control';
  scaleControl.tabIndex = 0;
  scaleControl.setAttribute('aria-label', 'Scale control');
  
  const scaleOptions = Object.entries(scaleDefinitions)
    .map(([key, scale]) => `<option value="${key}" ${key === currentScale ? 'selected' : ''}>${scale.name}</option>`)
    .join('');
  scaleControl.innerHTML = `<select id="scale-select" class="scale-dropdown">${scaleOptions}</select>`;

  const waveButton = document.createElement('div');
  waveButton.className = 'control-area';
  waveButton.tabIndex = 0;
  waveButton.setAttribute('aria-label', 'Waveform control');
  waveButton.innerHTML = '<div class="arrow" id="left-arrow">&#9664;</div><div id="waveform-name">triangle</div><div class="arrow" id="right-arrow">&#9654;</div>';

  const keyboardButton = document.createElement('div');
  keyboardButton.className = 'control-area keyboard-button';
  keyboardButton.tabIndex = 0;
  keyboardButton.setAttribute('aria-label', 'Keyboard view toggle');
  keyboardButton.textContent = 'Keyboard';
  keyboardButton.id = 'keyboard-button';

  // Group key and scale controls vertically
  const keyScaleGroup = document.createElement('div');
  keyScaleGroup.className = 'control-group';
  keyScaleGroup.appendChild(keyButton);
  keyScaleGroup.appendChild(scaleControl);
  
  // Group waveform and keyboard controls vertically
  const waveKeyboardGroup = document.createElement('div');
  waveKeyboardGroup.className = 'control-group';
  waveKeyboardGroup.appendChild(waveButton);
  waveKeyboardGroup.appendChild(keyboardButton);

  controlsBar.appendChild(keyScaleGroup);
  controlsBar.appendChild(waveKeyboardGroup);

  return { keyButton, scaleControl, waveButton, keyboardButton };
}

function darkenColor(hex, percent) {
    hex = hex.replace('#', '');
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    r = parseInt(r * (100 - percent) / 100);
    g = parseInt(g * (100 - percent) / 100);
    b = parseInt(b * (100 - percent) / 100);
    r = (r < 0) ? 0 : r;
    g = (g < 0) ? 0 : g;
    b = (b < 0) ? 0 : b;
    const rHex = (r.toString(16).length === 1) ? '0' + r.toString(16) : r.toString(16);
    const gHex = (g.toString(16).length === 1) ? '0' + g.toString(16) : g.toString(16);
    const bHex = (b.toString(16).length === 1) ? '0' + b.toString(16) : b.toString(16);
    return `#${rHex}${gHex}${bHex}`;
}

function updateControlsBarColor() {
    const keyName = getEffectiveKeyName(currentKeyIndex, currentScale);
    const baseNote = keyName.charAt(0);
    const color = KEY_COLORS[baseNote] || '#001f3f';
    const borderColor = darkenColor(color, 30);
    
    const controlsBar = document.getElementById('controls-bar');
    controlsBar.style.backgroundColor = color;
    controlsBar.style.borderColor = borderColor;
}

function setupControlEvents() {
  document.getElementById("key-left").onclick = () => {
    currentKeyIndex = (currentKeyIndex - 1 + keyNames.length) % keyNames.length;
    document.getElementById("key-name").textContent = getEffectiveKeyName(currentKeyIndex, currentScale);
    updateScaleMappings();
    updateSolfegeColors();
    updateBoxNames();
    updateControlsBarColor();
  };
  
  document.getElementById("key-right").onclick = () => {
    currentKeyIndex = (currentKeyIndex + 1) % keyNames.length;
    document.getElementById("key-name").textContent = getEffectiveKeyName(currentKeyIndex, currentScale);
    updateScaleMappings();
    updateSolfegeColors();
    updateBoxNames();
    updateControlsBarColor();
  };
  
  const scaleSelect = document.getElementById("scale-select");
  scaleSelect.onchange = (e) => {
    currentScale = e.target.value;
    const selectedScaleKey = e.target.value;
    const scaleKey = Object.keys(scaleDefinitions).find(key => key === selectedScaleKey) || 'major';
    currentScale = scaleKey;
    
    // Update the key name display in case it's an enharmonic key
    document.getElementById("key-name").textContent = getEffectiveKeyName(currentKeyIndex, currentScale);

    updateScaleMappings();
    updateSolfegeColors();
    updateBoxNames();
  };

  // Prevent letter keys from changing the dropdown selection
  scaleSelect.onkeydown = (e) => {
    if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
      e.preventDefault();
    }
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

  const keyboardButton = document.getElementById('keyboard-button');
  const modal = document.getElementById('keyboard-modal');
  const closeButton = document.querySelector('.close-button');

  keyboardButton.addEventListener('click', () => {
    modal.style.display = 'block';
  });

  closeButton.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  window.addEventListener('click', (event) => {
    if (event.target == modal) {
      modal.style.display = 'none';
    }
  });
}

function renderButtons() {
  buttons.forEach(btn => {
    if (btn.cells.length === 0) return;

    const div = document.createElement('div');
    div.className = 'note-button';
    
    const currentSolfege = getCurrentSolfege(btn.keys[0]);
    div.textContent = currentSolfege || btn.name;
    
    div.style.outline = 'none';
    div.setAttribute('data-keys', btn.keys.join(','));
    
    const currentKey = getEffectiveKeyName(currentKeyIndex, currentScale);
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
  const modal = document.getElementById('keyboard-modal');

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

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    let accidentalChanged = false;

    if (modal.style.display === 'block') {
      const keyElement = document.querySelector(`#simulated-keyboard .key[data-key="${e.key.toLowerCase()}"]`);
      if (keyElement) {
        keyElement.classList.add('pressed');
      }
    }
    
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

    if (document.activeElement && document.activeElement.id === 'keyboard-button' && 
        (e.key === ' ' || e.key === 'Enter')) {
      document.getElementById('keyboard-button').click();
      e.preventDefault();
      return;
    }

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

    if (modal.style.display === 'block') {
      const keyElement = document.querySelector(`#simulated-keyboard .key[data-key="${e.key.toLowerCase()}"]`);
      if (keyElement) {
        keyElement.classList.remove('pressed');
      }
    }
    
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
  const currentKey = getEffectiveKeyName(currentKeyIndex, currentScale);
  const bgColors = noteColorsByKey[currentKey];
  
  buttons.forEach(btn => {
    const div = keyToDiv[btn.keys[0]];
    if (div) {
      const currentSolfege = getCurrentSolfege(btn.keys[0]);
      
      if (bgColors && bgColors[currentSolfege]) {
        div.style.backgroundColor = bgColors[currentSolfege];
      }

      const noteValue = letterNamesByKey[currentKey] && letterNamesByKey[currentKey][currentSolfege];

      if (noteValue && (noteAccidentalMap[noteValue] === 'flat' || noteAccidentalMap[noteValue] === 'double-flat')) {
          div.style.color = DARK_BLUE;
      } else if (noteValue && (noteAccidentalMap[noteValue] === 'sharp' || noteAccidentalMap[noteValue] === 'double-sharp')) {
          div.style.color = DARK_RED;
      } else {
        div.style.color = 'white';
      }
    }
  });
}

function updateSimulatedKeyboardColors() {
    const currentKey = getEffectiveKeyName(currentKeyIndex, currentScale);
    const letterNames = letterNamesByKey[currentKey];
    if (!letterNames) return;

    const simulatedKeys = document.querySelectorAll('#simulated-keyboard .key[data-key]');
    
    simulatedKeys.forEach(keyEl => {
        const key = keyEl.getAttribute('data-key');
        const solfege = getCurrentSolfege(key);

        Object.values(solfegeToCssClass).forEach(className => keyEl.classList.remove(className));
        
        const isAccidentalKey = keyEl.classList.contains('key-sharp') || keyEl.classList.contains('key-flat');
        if (!isAccidentalKey) {
            keyEl.style.color = '';
        }

        if (solfege) {
            const noteNameForColor = letterNames[solfege];
            if (noteNameForColor) {
                const noteLetter = noteNameForColor.charAt(0);
                const baseSolfege = scaleDefinitions.major.solfege.find((s, i) => scaleSpellings.C.major[i] === noteLetter);
                const cssClass = solfegeToCssClass[baseSolfege];
                if (cssClass) {
                    keyEl.classList.add(cssClass);
                }
            }

            const noteValue = letterNames[solfege];
            if (noteValue) {
                const accidental = noteAccidentalMap[noteValue];
                if (accidental === 'sharp' || accidental === 'double-sharp') {
                    keyEl.style.color = DARK_RED;
                } else if (accidental === 'flat' || accidental === 'double-flat') {
                    keyEl.style.color = DARK_BLUE;
                }
            }
        }
    });
}

function setupSimulatedKeyboardEvents() {
    const simulatedKeys = document.querySelectorAll('#simulated-keyboard .key[data-key]');
    simulatedKeys.forEach(keyElement => {
        const key = keyElement.getAttribute('data-key');

        const handlePress = (e) => {
            e.preventDefault();
            keyElement.classList.add('pressed');

            if (buttonSolfegeNames[key]) {
                handlePlayKey(key);
                if (keyToDiv[key]) keyToDiv[key].classList.add('active');
            } else if (key === '=') {
                accidentalHeld.sharp = true;
                cellRefs['7d'].classList.add('active');
                reTriggerHeldKeysAccidentals();
            } else if (key === '-') {
                accidentalHeld.flat = true;
                cellRefs['8d'].classList.add('active');
                reTriggerHeldKeysAccidentals();
            }
        };

        const handleRelease = (e) => {
            e.preventDefault();
            keyElement.classList.remove('pressed');

            if (buttonSolfegeNames[key]) {
                handleStopKey(key);
                if (keyToDiv[key]) keyToDiv[key].classList.remove('active');
            } else if (key === '=') {
                accidentalHeld.sharp = false;
                cellRefs['7d'].classList.remove('active');
                reTriggerHeldKeysAccidentals();
            } else if (key === '-') {
                accidentalHeld.flat = false;
                cellRefs['8d'].classList.remove('active');
                reTriggerHeldKeysAccidentals();
            }
        };

        keyElement.addEventListener('mousedown', handlePress);
        keyElement.addEventListener('mouseup', handleRelease);
        keyElement.addEventListener('mouseleave', handleRelease);

        keyElement.addEventListener('touchstart', handlePress);
        keyElement.addEventListener('touchend', handleRelease);
        keyElement.addEventListener('touchcancel', handleRelease);
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
  setupSimulatedKeyboardEvents();
  
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
    updateControlsBarColor();
  }, 200);
  
  const mq = window.matchMedia("(max-width: 550px)");
  mq.addEventListener("change", () => { 
    resizeGrid(); 
    updateSolfegeColors(); 
    updateBoxNames(); 
  });

  updateScaleMappings();
  updateSolfegeColors();
  updateBoxNames();
  updateControlsBarColor();
}

// Start the application
initialize();


