// popup.js – Controller for NoiseShield Chrome Extension

// DOM Elements
const enableToggle = document.getElementById('enableToggle');
const statusBadge = document.getElementById('statusBadge');
const stateDescription = document.getElementById('stateDescription');
const frequencySelect = document.getElementById('frequencySelect');
const activeCadenceDisplay = document.getElementById('activeCadenceDisplay');
const counterSpan = document.getElementById('counter');
const lastRunDisplay = document.getElementById('lastRunDisplay');
const nextRunDisplay = document.getElementById('nextRunDisplay');
const logCountBadge = document.getElementById('logCountBadge');
const logList = document.getElementById('logList');
const emptyState = document.getElementById('emptyState');
const pulseNowBtn = document.getElementById('pulseNowBtn');
const clearBtn = document.getElementById('clearBtn');

let currentState = {};
let nextRunTimer = null;

const isExtensionEnv = typeof chrome !== 'undefined' && chrome.runtime && Boolean(chrome.runtime.id);

function sendExtensionMessage(msg, callback) {
  if (isExtensionEnv && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage(msg, callback);
  } else if (typeof callback === 'function') {
    callback({ success: true });
  }
}

// Helper to format frequency for display
function formatFrequency(seconds) {
  const s = Number(seconds) || 30;
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m`;
}

// Format timestamp into clean local time string (e.g., "09:21:45 PM")
function formatTimestamp(isoString) {
  if (!isoString) return 'Never';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Never';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (e) {
    return 'Never';
  }
}

// Update Next Run time indicator
function updateNextRunDisplay() {
  if (!currentState.enabled) {
    nextRunDisplay.textContent = 'Paused';
    return;
  }

  if (isExtensionEnv && chrome.alarms && chrome.alarms.get) {
    chrome.alarms.get('noiseAlarm', (alarm) => {
      if (!currentState.enabled) {
        nextRunDisplay.textContent = 'Paused';
        return;
      }

      if (alarm && alarm.scheduledTime) {
        const diffMs = alarm.scheduledTime - Date.now();
        const diffSec = Math.max(0, Math.round(diffMs / 1000));
        if (diffSec <= 1) {
          nextRunDisplay.textContent = 'Now';
        } else if (diffSec < 60) {
          nextRunDisplay.textContent = `in ${diffSec}s`;
        } else {
          const mins = Math.ceil(diffSec / 60);
          nextRunDisplay.textContent = `in ~${mins}m`;
        }
      } else {
        const freq = currentState.frequency || 30;
        nextRunDisplay.textContent = `in ~${formatFrequency(freq)}`;
      }
    });
  } else {
    const freq = currentState.frequency || 30;
    nextRunDisplay.textContent = `in ~${formatFrequency(freq)}`;
  }
}

// Render the recent activity feed
function renderLog(logArray = []) {
  const count = Array.isArray(logArray) ? logArray.length : 0;
  logCountBadge.textContent = count;

  if (count === 0) {
    emptyState.style.display = 'flex';
    logList.innerHTML = '';
    lastRunDisplay.textContent = 'Never';
    return;
  }

  emptyState.style.display = 'none';
  logList.innerHTML = '';

  // Update Last Run from most recent entry
  if (logArray[0] && logArray[0].timestamp) {
    lastRunDisplay.textContent = formatTimestamp(logArray[0].timestamp);
  } else {
    lastRunDisplay.textContent = 'Never';
  }

  // Show up to 30 most recent actions
  logArray.slice(0, 30).forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'log-item';

    const topRow = document.createElement('div');
    topRow.className = 'log-top-row';

    const tag = document.createElement('span');
    tag.className = 'persona-tag';
    tag.textContent = entry.persona || 'Noise';

    const time = document.createElement('span');
    time.className = 'log-time';
    time.textContent = formatTimestamp(entry.timestamp);

    topRow.appendChild(tag);
    topRow.appendChild(time);

    const query = document.createElement('div');
    query.className = 'log-query';
    query.textContent = entry.query ? `“${entry.query}”` : '';

    li.appendChild(topRow);
    li.appendChild(query);
    logList.appendChild(li);
  });
}

// Refresh entire UI state
function refreshUI(state = {}) {
  currentState = state;
  const isEnabled = Boolean(state.enabled);
  const freq = state.frequency || 30;

  // Master switch state
  enableToggle.checked = isEnabled;

  // Status Badge and text
  if (isEnabled) {
    statusBadge.className = 'status-badge status-active';
    statusBadge.innerHTML = '<span class="status-dot"></span><span class="status-text">Active</span>';
    stateDescription.textContent = 'Running automatically in the background.';
  } else {
    statusBadge.className = 'status-badge status-idle';
    statusBadge.innerHTML = '<span class="status-dot"></span><span class="status-text">Inactive</span>';
    stateDescription.textContent = 'Paused. Turn on to send background requests.';
  }

  // Frequency Dropdown and metric display
  frequencySelect.value = String(freq);
  activeCadenceDisplay.textContent = formatFrequency(freq);

  // Counter
  counterSpan.textContent = state.counter ?? 0;

  // Render logs (which also sets lastRunDisplay)
  renderLog(state.log || []);

  // Update Next Run time
  updateNextRunDisplay();
}

// User Actions
enableToggle.addEventListener('change', () => {
  const isEnabled = enableToggle.checked;
  const freq = Number(frequencySelect.value);
  currentState.enabled = isEnabled;
  refreshUI(currentState);
  sendExtensionMessage({ type: 'setEnabled', enabled: isEnabled, frequency: freq });
});

frequencySelect.addEventListener('change', () => {
  const freq = Number(frequencySelect.value);
  currentState.frequency = freq;
  activeCadenceDisplay.textContent = formatFrequency(freq);
  updateNextRunDisplay();
  sendExtensionMessage({ type: 'setFrequency', frequency: freq });
});

// "Run Now" instant manual trigger
pulseNowBtn.addEventListener('click', () => {
  pulseNowBtn.classList.add('pulsing');
  pulseNowBtn.textContent = 'Running...';
  pulseNowBtn.disabled = true;

  sendExtensionMessage({ type: 'triggerNow' }, () => {
    setTimeout(() => {
      pulseNowBtn.classList.remove('pulsing');
      pulseNowBtn.textContent = 'Run Now';
      pulseNowBtn.disabled = false;
      if (!isExtensionEnv) {
        // Mock a run for visual testing outside Chrome
        currentState.counter = (currentState.counter || 0) + 1;
        const mockEntry = {
          timestamp: new Date().toISOString(),
          persona: 'Astrophysics',
          query: 'Gravitational Waves Black Holes'
        };
        currentState.log = [mockEntry, ...(currentState.log || [])];
        refreshUI(currentState);
      }
      updateNextRunDisplay();
    }, 450);
  });
});

// "Clear Activity" logs & reset
clearBtn.addEventListener('click', () => {
  if (confirm('Clear recent activity and reset request counter?')) {
    if (!isExtensionEnv) {
      currentState.counter = 0;
      currentState.log = [];
      refreshUI(currentState);
    }
    sendExtensionMessage({ type: 'clearLogs' });
  }
});

// React live to background storage updates
if (isExtensionEnv && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    chrome.storage.local.get(null, (state) => {
      refreshUI(state || {});
    });
  });
}

// Initial boot
if (isExtensionEnv && chrome.storage && chrome.storage.local) {
  chrome.storage.local.get(null, (state) => {
    refreshUI(state || {});
  });
} else {
  // Standalone browser preview state
  refreshUI({
    enabled: true,
    frequency: 30,
    counter: 18,
    log: [
      { timestamp: new Date(Date.now() - 15000).toISOString(), persona: 'Astrophysics', query: 'Cosmic Microwave Background' },
      { timestamp: new Date(Date.now() - 48000).toISOString(), persona: 'Gardening', query: 'Heirloom Tomatoes Permaculture' },
      { timestamp: new Date(Date.now() - 85000).toISOString(), persona: 'Sailing', query: 'Navigation Electronics Tide Charts' }
    ]
  });
}

// Update Next Run countdown periodically while popup is open
nextRunTimer = setInterval(updateNextRunDisplay, 2000);
window.addEventListener('unload', () => {
  if (nextRunTimer) clearInterval(nextRunTimer);
});
