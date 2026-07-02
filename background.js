const DB_URL = 'https://cdn.jsdelivr.net/gh/m09l6d0ur13ii/teetube-db@main/database.json';

// Fetch DB and store in local storage
async function updateDatabase() {
  try {
    const res = await fetch(DB_URL + '?_=' + Date.now());
    if (res.ok) {
      const db = await res.json();
      if (db && db.videos) {
        chrome.storage.local.set({ videos: db.videos });
      }
    }
  } catch (e) {
    console.error('TeeTube: Failed to update database', e);
  }
}

// Update DB on startup and every hour
chrome.runtime.onStartup.addListener(updateDatabase);
chrome.runtime.onInstalled.addListener(updateDatabase);
setInterval(updateDatabase, 60 * 60 * 1000);

// Open main website when clicking the extension icon or banner
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'https://m09l6d0ur13ii.github.io/teetube/' });
});

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === 'openDashboard') {
    chrome.tabs.create({ url: 'https://m09l6d0ur13ii.github.io/teetube/' });
  }
});
