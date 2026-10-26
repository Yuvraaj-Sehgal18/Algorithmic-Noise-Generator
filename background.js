// background.js – Service Worker for Algorithmic Noise Generator
// Handles alarm scheduling, state management, and communication with the offscreen document.

const DEFAULT_STATE = {
  enabled: false,
  frequency: 30, // seconds
  counter: 0,
  log: [] // array of {timestamp, persona, query, urls: []}
};

// Initialize storage with defaults if not present
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(null, (items) => {
    if (!items || Object.keys(items).length === 0) {
      chrome.storage.local.set(DEFAULT_STATE);
    }
  });
});

// Helper: (re)create alarm based on state
function resetAlarm(state) {
  chrome.alarms.clearAll(() => {
    if (state.enabled) {
      // Chrome alarms minimum period is 0.5 minutes (30 seconds) in unpacked developer mode
      chrome.alarms.create('noiseAlarm', { periodInMinutes: Math.max(0.5, state.frequency / 60) });
    }
  });
}

// Safely ensure offscreen document exists before sending messages
async function ensureOffscreenDocument() {
  if ('hasDocument' in chrome.offscreen) {
    const hasDoc = await chrome.offscreen.hasDocument();
    if (hasDoc) return;
  }
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['BLOBS'],
      justification: 'Perform background privacy obfuscation requests without active tab UI.'
    });
  } catch (err) {
    // If document already exists, ignore the error
    if (!err.message?.includes('single offscreen')) {
      console.warn('Offscreen document creation:', err);
    }
  }
}

// Trigger a single noise request cycle via offscreen document
async function triggerNoiseCycle() {
  console.log('%c[NOISE-SHIELD SERVICE WORKER] ⚡ Alarm/Pulse triggered. Dispatching to offscreen engine...', 'color: #10b981; font-weight: bold;');
  await ensureOffscreenDocument();
  chrome.runtime.sendMessage({ type: 'runNoise' }, () => {
    if (chrome.runtime.lastError) {
      // Ignored if document is currently initializing
    }
  });
}

// Listen for storage changes to adjust alarms dynamically
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  const newState = {};
  if (changes.enabled) newState.enabled = changes.enabled.newValue;
  if (changes.frequency) newState.frequency = changes.frequency.newValue;
  if (Object.keys(newState).length > 0) {
    chrome.storage.local.get(['enabled', 'frequency'], (state) => {
      resetAlarm(state);
    });
  }
});

// Message listener from popup or offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'setEnabled') {
    chrome.storage.local.set({ enabled: message.enabled }, () => {
      resetAlarm({ enabled: message.enabled, frequency: message.frequency || DEFAULT_STATE.frequency });
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'setFrequency') {
    chrome.storage.local.set({ frequency: message.frequency }, () => {
      chrome.storage.local.get(['enabled'], (state) => {
        resetAlarm({ enabled: state.enabled, frequency: message.frequency });
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (message.type === 'triggerNow') {
    // Instant manual noise trigger requested by user in popup
    triggerNoiseCycle().then(() => {
      sendResponse({ success: true });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  if (message.type === 'clearLogs') {
    chrome.storage.local.set({ log: [], counter: 0 }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'requestState') {
    chrome.storage.local.get(null, (state) => sendResponse(state));
    return true;
  }

  if (message.type === 'offscreenResult') {
    // Received report from offscreen document
    console.log(`%c[NOISE-SHIELD SERVICE WORKER] ✅ Injected Noise! Persona: %c${message.persona}%c | Query: "${message.query}"`, 'color: #10b981; font-weight: bold;', 'color: #f59e0b; font-weight: bold;', 'color: #38bdf8;');
    console.log(`%c[NOISE-SHIELD SERVICE WORKER] 🌐 Background traffic fetched:`, 'color: #94a3b8;', message.urls);

    const timestamp = new Date().toISOString();
    const newLogEntry = {
      timestamp,
      persona: message.persona,
      query: message.query,
      urls: message.urls || []
    };

    chrome.storage.local.get(['counter', 'log'], (data) => {
      const currentLog = Array.isArray(data.log) ? data.log : [];
      const updatedLog = [newLogEntry, ...currentLog].slice(0, 50);
      chrome.storage.local.set({
        counter: (data.counter || 0) + 1,
        log: updatedLog
      });
    });
    sendResponse({ received: true });
    return true;
  }
});

// Alarm handler
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== 'noiseAlarm') return;
  triggerNoiseCycle();
});

chrome.runtime.onSuspend.addListener(() => {
  chrome.alarms.clearAll();
});
