// This object defines all the possible categories and tags a video can have.
// For example, under "game", it could be ddnet or teeworlds.
const CATEGORIES = {
  game: ["ddnet", "teeworlds", "ddper"],
  video: ["moment", "montage", "playthrough", "speedrun", "t0speedrun", "tutorial", "trailer", "skips", "animation", "gameplay", "tournament", "match", "podcast", "fun", "meme", "other"],
  mode: ["DDRace", "Gores", "fng", "F-DDrace", "Race", "Block", "BOMB", "CTF", "TB", "TeeWare", "InfClass", "Monster", "zCatch", "Foot", "DM", "Soup", "AXRace", "Sheep", "Battle", "Training", "other mods"],
  gameplayer: ["real", "tas", "dummy"],
  lang: ["ru", "en", "zh", "other"]
};

// We keep track of the current YouTube video ID here.
let currentVideoId = null;
// This will hold the data (tags, players, maps) for the current video, if it exists in our database.
let currentData = null; // Will only hold data if video is in DB

// A simple helper function to get the video ID from the YouTube URL.
// It looks for the "?v=" part in the address bar.
function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

// Helper to prevent XSS
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}



// We listen for changes in the browser's local storage.
// If the background script updates the database, we want to know!
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.videos) {
    // If we are currently watching a video and the database just updated, 
    // re-run the init() function to refresh the panel.
    if (currentVideoId) init();

    if (typeof allVideosCache !== 'undefined') {
      allVideosCache = changes.videos.newValue || {};
      if (typeof injectThumbnails === 'function') injectThumbnails();
    }
  }
});

// --- Render Read-Only Panel ---
// This big function creates the UI panel under the YouTube video title.
function renderPanel() {
  // If the admin extension is running, it will inject 'ddnettube-panel'.
  // We should not render the read-only panel if the admin is active!
  if (document.getElementById('ddnettube-panel')) return;

  // First, let's see if our panel already exists on the page.
  let panel = document.getElementById('ddnettube-readonly-panel');
  
  if (!panel) {
    // If it doesn't exist, we create a new div for it.
    panel = document.createElement('div');
    panel.id = 'ddnettube-readonly-panel';

    // We try to find the video title container on YouTube to insert our panel right below it.
    const titleContainer = document.querySelector('ytd-watch-metadata #title') || document.querySelector('h1.title')?.parentElement;
    if (titleContainer) {
      // Insert the panel exactly after the title.
      titleContainer.parentElement.insertBefore(panel, titleContainer.nextSibling);
    } else {
      // If we can't find the title (maybe YouTube changed their layout), we just stop.
      return; 
    }
  }

  // Clear out any old content from the panel before we redraw it.
  panel.innerHTML = '';
  
  // If we don't have any data for this video, just hide the panel and stop.
  if (!currentData) {
    panel.style.display = 'none';
    return;
  }
  
  // Otherwise, show the panel!
  panel.style.display = 'block';

  // Render categories
  for (const [category, tags] of Object.entries(CATEGORIES)) {
    if (!currentData.tags || !currentData.tags[category] || currentData.tags[category].length === 0) continue;
    
    const row = document.createElement('div');
    row.className = 'ddnettube-row';

    const label = document.createElement('div');
    label.className = 'ddnettube-label';
    label.innerText = category.charAt(0).toUpperCase() + category.slice(1) + ':';
    row.appendChild(label);

    currentData.tags[category].forEach(tag => {
      const tagEl = document.createElement('div');
      tagEl.className = 'ddnettube-tag active'; // Always active since it's read-only
      tagEl.innerText = tag;
      tagEl.style.cursor = 'default';
      row.appendChild(tagEl);
    });
    panel.appendChild(row);
  }

  // Render Players
  if (currentData.players && currentData.players.length > 0) {
    const nickRow = document.createElement('div');
    nickRow.className = 'ddnettube-row';
    const nickLabel = document.createElement('div');
    nickLabel.className = 'ddnettube-label';
    nickLabel.innerText = 'Players:';
    nickRow.appendChild(nickLabel);

    currentData.players.forEach(nick => {
      const nickEl = document.createElement('div');
      nickEl.className = 'ddnettube-nickname';
      nickEl.innerText = nick; // InnerText is safe, but we'll use esc just to be consistent if it was innerHTML, but wait innerText is already safe!
      nickRow.appendChild(nickEl);
    });
    panel.appendChild(nickRow);
  }

  // Render Maps
  if (currentData.maps && currentData.maps.length > 0) {
    const mapRow = document.createElement('div');
    mapRow.className = 'ddnettube-row';
    const mapLabel = document.createElement('div');
    mapLabel.className = 'ddnettube-label';
    mapLabel.innerText = 'Maps:';
    mapRow.appendChild(mapLabel);

    currentData.maps.forEach(mapName => {
      const mapEl = document.createElement('div');
      mapEl.className = 'ddnettube-map';
      mapEl.innerText = mapName;
      mapRow.appendChild(mapEl);
    });
    panel.appendChild(mapRow);
  }

  // Render Clans
  if (currentData.clans && currentData.clans.length > 0) {
    const clanRow = document.createElement('div');
    clanRow.className = 'ddnettube-row';
    const clanLabel = document.createElement('div');
    clanLabel.className = 'ddnettube-label';
    clanLabel.innerText = 'Clans:';
    clanRow.appendChild(clanLabel);

    currentData.clans.forEach(clanName => {
      const clanEl = document.createElement('div');
      clanEl.className = 'ddnettube-clan ddnettube-map';
      clanEl.innerText = clanName;
      clanRow.appendChild(clanEl);
    });
    panel.appendChild(clanRow);
  }
}

// This is the main setup function for YouTube videos.
// It checks what video we are on, loads data from storage, and triggers the panel render.
function init() {
  const vid = getVideoId();
  // If there's no video ID, hide the panel and stop.
  if (!vid) {
    const panel = document.getElementById('ddnettube-readonly-panel');
    if (panel) panel.remove();
    currentVideoId = null;
    return;
  }

  currentVideoId = vid;
  currentData = null;

  // Ask Chrome's local storage for the database of videos
  chrome.storage.local.get(['videos'], (res) => {
    const videos = res.videos || {};
    
    // If our current video is in the database, grab its data!
    if (videos[vid]) {
      currentData = videos[vid];
      // Make sure players list exists (handling older database formats)
      currentData.players = currentData.players || currentData.nicknames || [];
    }

    // YouTube is a Single Page Application (SPA), which means the page doesn't always fully reload.
    // The title element might take a second to appear.
    // So we check every 500ms (half a second) until we find the title, then we render the panel.
    let retries = 0;
    const checkInterval = setInterval(() => {
      const titleContainer = document.querySelector('ytd-watch-metadata #title') || document.querySelector('h1.title')?.parentElement;
      if (titleContainer) {
        clearInterval(checkInterval); // Stop checking! We found it.
        if (currentData) {
          renderPanel();
        } else {
          // If the video isn't in our DB, make sure the panel is hidden.
          const panel = document.getElementById('ddnettube-readonly-panel');
          if (panel) panel.style.display = 'none';
        }
      }
      retries++;
      // Give up after 10 seconds (20 retries)
      if (retries > 20) clearInterval(checkInterval);
    }, 500);
  });
}

// --- YouTube SPA Integration ---
// This part handles the fact that clicking a new video on YouTube doesn't reload the page.
let lastUrl = location.href;
if (window.location.hostname.includes('youtube.com')) {
  // We set up a MutationObserver to watch the whole document for changes.
  // When the URL changes, we know the user clicked a new video!
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      // Wait 1 second before initializing to let YouTube's own scripts run first.
      setTimeout(init, 1000);
    }
  }).observe(document, { subtree: true, childList: true });

  // Run the init function 1.5 seconds after the first load.
  setTimeout(init, 1500);
}

// --- Third-Party Tracker Integrations ---
// This part adds banners to DDNet, DDStats, and TeeRank websites!
const hostname = window.location.hostname;
if (hostname.includes('ddnet.org') || hostname.includes('ddstats.tw') || hostname.includes('teerank.io')) {
  let currentTrackerUrl = location.href;
  
  // Just like on YouTube, we watch for URL changes (since DDStats is also a Single Page App).
  new MutationObserver(() => {
    if (location.href !== currentTrackerUrl) {
      currentTrackerUrl = location.href;
      setTimeout(() => initTrackerIntegration(hostname), 500);
    }
  }).observe(document, { subtree: true, childList: true });

  setTimeout(() => initTrackerIntegration(hostname), 500);
}

// This function figures out what player, map, or clan page we are looking at.
function initTrackerIntegration(hostname) {
  // Remove any old banner first.
  const existing = document.getElementById('teetube-tracker-banner');
  if (existing) existing.remove();

  const path = window.location.pathname;
  let type = null;
  let targetName = null;

  // Let's guess what page the user is on based on the URL!
  if (hostname.includes('ddnet.org') || hostname.includes('ddstats.tw')) {
    if (path.startsWith('/players/') || path.startsWith('/player/')) {
      type = 'player';
      targetName = decodeURIComponent(path.split('/')[2]);
    } else if (path.startsWith('/maps/') || path.startsWith('/map/')) {
      type = 'map';
      targetName = decodeURIComponent(path.split('/')[2]);
    }
  } else if (hostname.includes('teerank.io')) {
    if (path.startsWith('/player/')) {
      type = 'player';
      targetName = decodeURIComponent(path.split('/')[2]);
    } else if (path.startsWith('/clan/')) {
      type = 'clan';
      targetName = decodeURIComponent(path.split('/')[2]);
    } else if (path.includes('/map/')) {
      type = 'map';
      const parts = path.split('/');
      const mapIdx = parts.indexOf('map');
      if (mapIdx !== -1 && parts.length > mapIdx + 1) {
        targetName = decodeURIComponent(parts[mapIdx + 1]);
      }
    }
  }

  // If we couldn't figure it out, stop here.
  if (!type || !targetName) return;

  // Look through our local database to count how many videos match this player/map/clan.
  chrome.storage.local.get(['videos'], (res) => {
    const allVideos = res.videos || {};
    let matchCount = 0;

    Object.values(allVideos).forEach(v => {
      const pList = v.players || v.nicknames || [];
      if (type === 'player' && pList.includes(targetName)) matchCount++;
      if (type === 'map' && v.maps && v.maps.includes(targetName)) matchCount++;
      if (type === 'clan' && v.clans && v.clans.includes(targetName)) matchCount++;
    });

    // Finally, inject the banner onto the page with the result!
    injectTrackerBanner(type, targetName, matchCount);
  });
}

// This function creates the actual HTML element for the tracker banner and inserts it.
function injectTrackerBanner(type, targetName, matchCount) {
  const banner = document.createElement('div');
  banner.id = 'teetube-tracker-banner';
  // Add some nice styling so it looks good!
  banner.style.padding = '12px 20px';
  banner.style.textAlign = 'center';
  banner.style.fontWeight = 'bold';
  banner.style.fontSize = '16px';
  banner.style.fontFamily = 'sans-serif';
  banner.style.margin = '20px auto';
  banner.style.maxWidth = '800px';
  banner.style.borderRadius = '8px';
  banner.style.cursor = 'pointer';
  banner.style.transition = 'opacity 0.2s';
  banner.style.position = 'relative';
  banner.style.zIndex = '9999';

  // Translate the type into Russian for the user interface
  const typeText = type === 'player' ? 'этим игроком' : (type === 'clan' ? 'этим кланом' : 'этой картой');

  if (matchCount > 0) {
    // If we found videos, make the banner green!
    banner.style.backgroundColor = 'rgba(46, 204, 113, 0.2)';
    banner.style.border = '2px solid #2ecc71';
    banner.style.color = '#2ecc71';
    banner.innerHTML = `📺 Найдено ${matchCount} видео на TeeTube! Нажмите, чтобы открыть базу.`;
    
    // When clicked, tell the background script to open the dashboard with these filters.
    banner.onclick = () => {
      chrome.runtime.sendMessage({ action: 'openDashboard', type, targetName });
    };
  } else {
    // If no videos were found, make it red.
    banner.style.backgroundColor = 'rgba(255, 50, 50, 0.2)';
    banner.style.border = '2px solid #ff3232';
    banner.style.color = '#ff8282';
    banner.innerHTML = `🚫 На TeeTube пока нет видео с ${typeText}.`;
    
    // Clicking still opens the dashboard, just without filters.
    banner.onclick = () => {
      chrome.runtime.sendMessage({ action: 'openDashboard' });
    };
  }

  // Find a good place on the page to insert the banner.
  // We check a few common container IDs used by DDNet and DDStats.
  let container = document.querySelector('#content > .block') || document.querySelector('main') || document.querySelector('#app') || document.body;
  if (container) {
    // Put it right at the top!
    container.insertBefore(banner, container.firstChild);
  }
}

// --- Thumbnail Badges ---
let allVideosCache = {};
let authorCounts = {};

function updateAuthorCounts() {
  authorCounts = {};
  Object.values(allVideosCache).forEach(v => {
    if (v.author) {
      const author = v.author.trim().toLowerCase();
      authorCounts[author] = (authorCounts[author] || 0) + 1;
    }
  });
}

chrome.storage.local.get(['videos'], (res) => {
  allVideosCache = res.videos || {};
  updateAuthorCounts();
  if (window.location.hostname.includes('youtube.com')) {
    injectThumbnails();
    injectChannelBadges();
  }
});

function injectThumbnails() {
  if (document.getElementById('ddnettube-admin-active')) return;
  
  const links = document.querySelectorAll('a[href*="/watch?v="]');
  links.forEach(link => {
    try {
      const url = new URL(link.href);
      const vid = url.searchParams.get('v');
      if (!vid) return;

      // Check if it's a thumbnail link (contains an image or has a thumbnail-related class/id)
      const hasImage = link.querySelector('img, yt-image, yt-thumbnail-view-model');
      const isThumbnail = link.id === 'thumbnail' || (typeof link.className === 'string' && (link.className.includes('thumbnail') || link.className.includes('ytLockupViewModelContentImage')));
      
      if (!hasImage && !isThumbnail) {
        // If it's a title link, we might have accidentally added a badge to it previously. Remove it.
        const wrongBadge = link.querySelector('.teetube-saved-badge');
        if (wrongBadge) wrongBadge.remove();
        return;
      }

      const existingBadge = link.querySelector('.teetube-saved-badge');
      
      if (allVideosCache[vid]) {
         if (!existingBadge) {
             const badge = document.createElement('div');
             badge.className = 'teetube-saved-badge';
             badge.innerHTML = '✔ teetube';
             const thumb = link.querySelector('yt-thumbnail-view-model') || link.querySelector('ytd-thumbnail') || link;
             thumb.appendChild(badge);
         }
      } else {
         if (existingBadge) existingBadge.remove();
      }
    } catch (e) {}
  });
}

function injectChannelBadges() {
  if (document.getElementById('ddnettube-admin-active')) return;

  const channelEls = document.querySelectorAll(`
    ytd-channel-name yt-formatted-string#text,
    #channel-name yt-formatted-string#text,
    yt-page-header-view-model h1.dynamicTextViewModelH1 span,
    ytd-video-meta-block .ytContentMetadataViewModelMetadataText,
    ytd-channel-name .ytContentMetadataViewModelMetadataText,
    #channel-name .ytContentMetadataViewModelMetadataText
  `);
  
  channelEls.forEach(el => {
    try {
      const author = el.innerText.trim();
      if (!author) return;
      const lowerAuthor = author.toLowerCase();
      
      const count = authorCounts[lowerAuthor];
      if (!count) {
        const wrongBadge = el.querySelector('.teetube-channel-badge');
        if (wrongBadge) wrongBadge.remove();
        return;
      }

      let badge = el.querySelector('.teetube-channel-badge');
      
      let badgeText = `✔ teetube (${count} saved)`;

      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'teetube-channel-badge';
        el.appendChild(badge);
      }
      badge.innerHTML = badgeText;
    } catch (e) {}
  });
}

if (window.location.hostname.includes('youtube.com')) {
  setInterval(() => {
    injectThumbnails();
    injectChannelBadges();
  }, 1500);
}
