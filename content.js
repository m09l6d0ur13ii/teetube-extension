const CATEGORIES = {
  game: ["ddnet", "teeworlds", "ddper"],
  video: ["moment", "montage", "прохождение", "speedrun", "t0speedrun", "tutorial", "trailer", "skips", "fun", "meme", "other"],
  mode: ["ddrace", "ctf", "dm", "race", "fng", "gores", "block", "other mods"],
  gameplayer: ["real", "tas"]
};

let currentVideoId = null;
let currentData = null; // Will only hold data if video is in DB

function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

// --- Thumbnail Badge Logic ---
let savedVideoIds = new Set();

function fetchSavedVideos(callback) {
  chrome.storage.local.get(['videos'], (res) => {
    const vids = res.videos || {};
    savedVideoIds = new Set(Object.keys(vids));
    if (callback) callback();
  });
}

function markThumbnails() {
  const links = document.querySelectorAll('a#thumbnail, a[href*="/watch?v="]:has(yt-image), a[href*="/watch?v="]:has(.ytCoreImageHost)');
  links.forEach(link => {
    if (!link.href) return;
    try {
      const url = new URL(link.href, window.location.href);
      const vid = url.searchParams.get('v');
      if (!vid) return;

      const wrapper = link.closest('ytd-thumbnail') || link;
      const hasBadge = wrapper.querySelector('.teetube-saved-badge');
      
      if (savedVideoIds.has(vid)) {
        if (!hasBadge) {
          const badge = document.createElement('div');
          badge.className = 'teetube-saved-badge';
          badge.innerText = '✓ TeeTube';
          wrapper.style.position = 'relative'; 
          
          // Append as first child or inside the link so it sits on top of the image
          const thumbnailLink = wrapper.querySelector('a#thumbnail') || wrapper;
          thumbnailLink.style.position = 'relative';
          thumbnailLink.appendChild(badge);
        }
      } else {
        if (hasBadge) hasBadge.remove();
      }
    } catch (e) {}
  });
}

let markTimeout = null;
function debouncedMarkThumbnails() {
  if (markTimeout) clearTimeout(markTimeout);
  markTimeout = setTimeout(markThumbnails, 500);
}

fetchSavedVideos(() => {
  markThumbnails();
  const observer = new MutationObserver(debouncedMarkThumbnails);
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.videos) {
    savedVideoIds = new Set(Object.keys(changes.videos.newValue || {}));
    markThumbnails();
    // Update panel if video data changed
    if (currentVideoId) init();
  }
});

// --- Render Read-Only Panel ---
function renderPanel() {
  let panel = document.getElementById('ddnettube-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'ddnettube-panel';

    const titleContainer = document.querySelector('ytd-watch-metadata #title') || document.querySelector('h1.title')?.parentElement;
    if (titleContainer) {
      titleContainer.parentElement.insertBefore(panel, titleContainer.nextSibling);
    } else {
      return; 
    }
  }

  panel.innerHTML = '';
  
  if (!currentData) {
    panel.style.display = 'none';
    return;
  }
  
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
      nickEl.innerText = nick;
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

function init() {
  const vid = getVideoId();
  if (!vid) {
    const panel = document.getElementById('ddnettube-panel');
    if (panel) panel.remove();
    currentVideoId = null;
    return;
  }

  currentVideoId = vid;
  currentData = null;

  chrome.storage.local.get(['videos'], (res) => {
    const videos = res.videos || {};
    if (videos[vid]) {
      currentData = videos[vid];
      // Normalize players field
      currentData.players = currentData.players || currentData.nicknames || [];
    }

    let retries = 0;
    const checkInterval = setInterval(() => {
      const titleContainer = document.querySelector('ytd-watch-metadata #title') || document.querySelector('h1.title')?.parentElement;
      if (titleContainer) {
        clearInterval(checkInterval);
        if (currentData) {
          renderPanel();
        } else {
          const panel = document.getElementById('ddnettube-panel');
          if (panel) panel.style.display = 'none';
        }
      }
      retries++;
      if (retries > 20) clearInterval(checkInterval);
    }, 500);
  });
}

// --- YouTube SPA Integration ---
let lastUrl = location.href;
if (window.location.hostname.includes('youtube.com')) {
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(init, 1000);
    }
  }).observe(document, { subtree: true, childList: true });

  setTimeout(init, 1500);
}

// --- Third-Party Tracker Integrations ---
const hostname = window.location.hostname;
if (hostname.includes('ddnet.org') || hostname.includes('ddstats.tw') || hostname.includes('teerank.io')) {
  let currentTrackerUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== currentTrackerUrl) {
      currentTrackerUrl = location.href;
      setTimeout(() => initTrackerIntegration(hostname), 500);
    }
  }).observe(document, { subtree: true, childList: true });

  setTimeout(() => initTrackerIntegration(hostname), 500);
}

function initTrackerIntegration(hostname) {
  const existing = document.getElementById('teetube-tracker-banner');
  if (existing) existing.remove();

  const path = window.location.pathname;
  let type = null;
  let targetName = null;

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

  if (!type || !targetName) return;

  chrome.storage.local.get(['videos'], (res) => {
    const allVideos = res.videos || {};
    let matchCount = 0;

    Object.values(allVideos).forEach(v => {
      const pList = v.players || v.nicknames || [];
      if (type === 'player' && pList.includes(targetName)) matchCount++;
      if (type === 'map' && v.maps && v.maps.includes(targetName)) matchCount++;
      if (type === 'clan' && v.clans && v.clans.includes(targetName)) matchCount++;
    });

    injectTrackerBanner(type, targetName, matchCount);
  });
}

function injectTrackerBanner(type, targetName, matchCount) {
  const banner = document.createElement('div');
  banner.id = 'teetube-tracker-banner';
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

  const typeText = type === 'player' ? 'этим игроком' : (type === 'clan' ? 'этим кланом' : 'этой картой');

  if (matchCount > 0) {
    banner.style.backgroundColor = 'rgba(46, 204, 113, 0.2)';
    banner.style.border = '2px solid #2ecc71';
    banner.style.color = '#2ecc71';
    banner.innerHTML = `📺 Найдено ${matchCount} видео на TeeTube! Нажмите, чтобы открыть базу.`;
    banner.onclick = () => {
      chrome.runtime.sendMessage({ action: 'openDashboard', type, targetName });
    };
  } else {
    banner.style.backgroundColor = 'rgba(255, 50, 50, 0.2)';
    banner.style.border = '2px solid #ff3232';
    banner.style.color = '#ff8282';
    banner.innerHTML = `🚫 На TeeTube пока нет видео с ${typeText}.`;
    banner.onclick = () => {
      chrome.runtime.sendMessage({ action: 'openDashboard' });
    };
  }

  let container = document.querySelector('#content > .block') || document.querySelector('main') || document.querySelector('#app') || document.body;
  if (container) {
    container.insertBefore(banner, container.firstChild);
  }
}
