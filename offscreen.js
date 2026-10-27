// offscreen.js – runs in the hidden offscreen document and performs fake traffic

// Personas with keyword pools
const PERSONAS = [
  {
    name: 'Astrophysics',
    topics: ['black holes', 'dark matter', 'exoplanet', 'cosmic microwave background', 'nebula', 'gravitational waves']
  },
  {
    name: 'Vintage Gardening',
    topics: ['heirloom tomatoes', 'permaculture', 'composting', 'seed saving', "old-fashioned gardening tools", 'rose pruning']
  },
  {
    name: 'Luxury Sailing',
    topics: ['yacht charter', 'sail trim', 'maritime law', 'tide charts', 'navigation electronics', 'luxury marinas']
  },
  {
    name: 'Medieval History',
    topics: ['crusades', 'feudalism', 'knight armor', 'manuscript illumination', 'castle architecture', 'renaissance art']
  }
];

// Utility: pick a random element
function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Build a plausible query string from a persona
function buildQuery(persona) {
  const words = [];
  const count = Math.floor(Math.random() * 3) + 1; // 1-3 keywords
  for (let i = 0; i < count; i++) {
    words.push(rand(persona.topics));
  }
  // Simple title‑case and join
  return words.map(w => w.replace(/(^|\s)\w/g, c => c.toUpperCase())).join(' ');
}

// Perform hidden fetches – Google search + Wikipedia page (best‑effort, ignore CORS)
async function performNoise() {
  const persona = rand(PERSONAS);
  const query = buildQuery(persona);

  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  const wikiBase = 'https://en.wikipedia.org/wiki/';
  const wikiTopic = query.replace(/\s+/g, '_');
  const wikiUrl = wikiBase + encodeURIComponent(wikiTopic);

  console.log(`%c[NOISE ENGINE] Generating noise profile: %c${persona.name}`, 'color: #38bdf8; font-weight: bold;', 'color: #f59e0b; font-weight: bold;');
  console.log(`%c[QUERY GENERATED] "${query}"`, 'color: #a855f7; font-weight: bold;');

  const urls = [];
  try {
    console.log(`%c[NETWORK GET] Fetching: ${googleUrl}`, 'color: #94a3b8;');
    await fetch(googleUrl, { method: 'GET', mode: 'no-cors' });
    urls.push(googleUrl);
  } catch (e) { /* ignore errors – purpose is only to create network traffic */ }
  try {
    console.log(`%c[NETWORK GET] Fetching: ${wikiUrl}`, 'color: #94a3b8;');
    await fetch(wikiUrl, { method: 'GET', mode: 'no-cors' });
    urls.push(wikiUrl);
  } catch (e) { }

  // Report back to background service worker
  chrome.runtime.sendMessage({
    type: 'offscreenResult',
    persona: persona.name,
    query,
    urls
  }, () => {
    // No‑op; background will handle storage
  });
}

// Listen for messages from background to trigger a noise cycle
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'runNoise') {
    performNoise().then(() => sendResponse({ done: true }));
    return true; // async
  }
});

// Keep the offscreen page alive while work is pending
self.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    // No action needed – page stays alive until Chrome discards it
  }
});
