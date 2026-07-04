// We define the URL of our database hosted on GitHub via jsDelivr CDN.
// Note: jsDelivr might cache this for up to 12 hours. For instant updates, raw.githubusercontent.com is better.
const DB_URL = 'https://cdn.jsdelivr.net/gh/m09l6d0ur13ii/teetube-db@main/database.json';

// This function fetches the latest database from the URL and saves it to local storage.
async function updateDatabase() {
  try {
    // We use { cache: 'no-cache' } to bypass browser caching and hit the CDN directly
    const res = await fetch(DB_URL, { cache: 'no-cache' });
    
    // Check if the request was successful
    if (res.ok) {
      // Parse the JSON response
      const db = await res.json();
      
      // If the database has a 'videos' object, save it to the browser's local storage
      if (db && db.videos) {
        chrome.storage.local.set({ videos: db.videos });
      }
    }
  } catch (e) {
    // If something goes wrong (e.g. no internet), log the error
    console.error('TeeTube: Failed to update database', e);
  }
}

// We want to fetch the database as soon as the extension starts or is installed
chrome.runtime.onStartup.addListener(updateDatabase);
chrome.runtime.onInstalled.addListener(updateDatabase);

// We also set an interval to update the database every 1 hour (60 minutes * 60 seconds * 1000 milliseconds)
setInterval(updateDatabase, 60 * 60 * 1000);

// When the user clicks the extension icon in the toolbar, open the main TeeTube website in a new tab
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'https://m09l6d0ur13ii.github.io/teetube/' });
});

// Listen for messages from our content scripts (like when a user clicks a tracker banner)
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  // If the action is 'openDashboard', open the main website
  if (req.action === 'openDashboard') {
    let url = 'https://m09l6d0ur13ii.github.io/teetube/';
    if (req.type && req.targetName) {
      url += `?${encodeURIComponent(req.type)}=${encodeURIComponent(req.targetName)}`;
    }
    chrome.tabs.create({ url });
  }
});
