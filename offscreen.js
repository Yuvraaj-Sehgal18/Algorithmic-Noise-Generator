
// offscreen.js - Handles synthetic browsing activity in the background

// Available personas and their everyday interests
const PERSONAS = [
  {
    name: 'Technology',
    topics: ['smartphones', 'computer tips', 'mobile apps', 'internet safety', 'new technology', 'useful websites']
  },
  {
    name: 'Food and Cooking',
    topics: ['easy recipes', 'homemade food', 'healthy breakfast', 'street food', 'cooking tips', 'popular desserts']
  },
  {
    name: 'Travel and Places',
    topics: ['beautiful beaches', 'famous cities', 'travel tips', 'mountain trips', 'places to visit', 'budget travel']
  },
  {
    name: 'Everyday Lifestyle',
    topics: ['home decoration', 'daily habits', 'fitness tips', 'shopping ideas', 'fashion trends', 'garden ideas']
  },
  {
    name: 'Sports and Games',
    topics: ['football matches', 'cricket news', 'basketball games', 'sports players', 'video games', 'outdoor games']
  },
  {
    name: 'Health and Fitness',
    topics: ['daily exercise', 'healthy food', 'morning walks', 'fitness routines', 'sleep habits', 'simple workouts']
  },
  {
    name: 'Movies and Music',
    topics: ['popular movies', 'new songs', 'movie reviews', 'music artists', 'TV shows', 'best comedy films']
  },
  {
    name: 'Education and Learning',
    topics: ['learning English', 'study tips', 'online courses', 'general knowledge', 'science facts', 'new skills']
  },
  {
    name: 'Home and Family',
    topics: ['home cleaning', 'family activities', 'easy home repairs', 'household tips', 'kids activities', 'home organisation']
  },
  {
    name: 'Nature and Animals',
    topics: ['beautiful birds', 'pet care', 'wildlife facts', 'forest animals', 'flower gardens', 'nature photography']
  }
];

// Website configuration
const WEBSITES = {
  google: 'https://www.google.com/search?q=',
  wikipedia: 'https://en.wikipedia.org/wiki/'
};

// Prevent multiple activity cycles from running together
let isRunning = false;

// Select a random item from an array
function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Select a random persona
function selectPersona() {
  return rand(PERSONAS);
}

// Generate a query using unique topics
function buildQuery(persona) {
  const topics = [...persona.topics];
  const count = Math.floor(Math.random() * 3) + 1;
  const selectedTopics = [];

  for (let i = 0; i < count && topics.length > 0; i++) {
    const index = Math.floor(Math.random() * topics.length);
    selectedTopics.push(topics.splice(index, 1)[0]);
  }

  return selectedTopics
    .map(topic => topic.replace(/\b\w/g, char => char.toUpperCase()))
    .join(' ');
}

// Create a Wikipedia URL
function createWikipediaUrl(query) {
  const topic = query.replace(/\s+/g, '_');
  return WEBSITES.wikipedia + encodeURIComponent(topic);
}

// Perform a network request
async function sendRequest(url) {
  try {
    await fetch(url, {
      method: 'GET',
      mode: 'no-cors'
    });

    console.log(`[NOISE ENGINE] Request attempted: ${url}`);

    return {
      url,
      status: 'attempted'
    };

  } catch (error) {
    console.error('[NOISE ENGINE] Request failed:', error);

    return {
      url,
      status: 'failed',
      error: error.message
    };
  }
}

// Generate one synthetic activity cycle
async function performNoise() {
  if (isRunning) {
    console.log('[NOISE ENGINE] Activity cycle already running.');
    return;
  }

  isRunning = true;

  try {
    const persona = selectPersona();
    const query = buildQuery(persona);

    const googleUrl =
      WEBSITES.google + encodeURIComponent(query);

    const wikiUrl = createWikipediaUrl(query);

    console.log(`[NOISE ENGINE] Selected persona: ${persona.name}`);
    console.log(`[NOISE ENGINE] Generated query: ${query}`);

    // Send requests sequentially
    const results = [];

    results.push(await sendRequest(googleUrl));
    results.push(await sendRequest(wikiUrl));

    // Collect attempted URLs for compatibility with background.js
    const urls = results.map(result => result.url);

    // Send activity details to the background service worker
    chrome.runtime.sendMessage({
      type: 'offscreenResult',
      persona: persona.name,
      query,
      urls
    }, () => {
      if (chrome.runtime.lastError) {
        console.error(
          '[NOISE ENGINE] Message error:',
          chrome.runtime.lastError.message
        );
      }
    });

    console.log('[NOISE ENGINE] Activity cycle completed.');

  } catch (error) {
    console.error('[NOISE ENGINE] Activity cycle error:', error);

  } finally {
    isRunning = false;
  }
}

// Listen for messages from the background service worker
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== 'runNoise') {
    return;
  }

  performNoise()
    .then(() => sendResponse({ done: true }))
    .catch(error => {
      console.error('[NOISE ENGINE] Unexpected error:', error);
      sendResponse({ done: false });
    });

  return true;
});
