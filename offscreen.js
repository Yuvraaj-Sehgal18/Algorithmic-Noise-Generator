
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

const WEBSITES = {
  google: 'https://www.google.com/search?q=',
  wikipedia: 'https://en.wikipedia.org/wiki/'
};

let isRunning = false;

const rand = arr => arr[Math.floor(Math.random() * arr.length)];

function buildQuery(persona) {
  const topics = [...persona.topics];
  const count = Math.floor(Math.random() * 3) + 1;
  const selected = [];

  while (selected.length < count && topics.length) {
    selected.push(topics.splice(Math.floor(Math.random() * topics.length), 1)[0]);
  }

  return selected
    .map(topic => topic.replace(/\b\w/g, char => char.toUpperCase()))
    .join(' ');
}

async function sendRequest(url) {
  try {
    await fetch(url, { method: 'GET', mode: 'no-cors' });
    console.log(`[NOISE ENGINE] Request attempted: ${url}`);
  } catch (error) {
    console.error('[NOISE ENGINE] Request failed:', error.message);
  }

  return url;
}

async function performNoise() {
  if (isRunning) {
    console.log('[NOISE ENGINE] Activity cycle already running.');
    return;
  }

  isRunning = true;

  try {
    const persona = rand(PERSONAS);
    const query = buildQuery(persona);

    const urls = [
      WEBSITES.google + encodeURIComponent(query),
      WEBSITES.wikipedia + encodeURIComponent(query.replace(/\s+/g, '_'))
    ];

    console.log(`[NOISE ENGINE] Persona: ${persona.name}`);
    console.log(`[NOISE ENGINE] Query: ${query}`);

    // Execute requests one after another
    for (const url of urls) {
      await sendRequest(url);
    }

    chrome.runtime.sendMessage({
      type: 'offscreenResult',
      persona: persona.name,
      query,
      urls
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('[NOISE ENGINE] Message error:', chrome.runtime.lastError.message);
      }
    });

    console.log('[NOISE ENGINE] Activity cycle completed.');

  } catch (error) {
    console.error('[NOISE ENGINE] Activity cycle error:', error.message);
  } finally {
    isRunning = false;
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== 'runNoise') return;

  performNoise().then(() => {
    sendResponse({ done: true });
  });

  return true;
});
