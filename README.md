[🇷🇺 Русский](README.ru.md) | [🇬🇧 English](README.md)

# TeeTube Extension

This is the browser extension for everyday users of **TeeTube**. It helps you see which videos are already in our database while you browse YouTube and DDNet tracker websites.

## 🔗 Related Projects

TeeTube is divided into 4 repositories:
- 👁️ [TeeTube Extension (User Extension)](https://github.com/m09l6d0ur13ii/teetube-extension) - The extension you are looking at now.
- 🌐 [TeeTube (Frontend)](https://github.com/m09l6d0ur13ii/teetube) - The main website.
- 💾 [TeeTube Database](https://github.com/m09l6d0ur13ii/teetube-db) - The JSON database.
- 🛠️ [TeeTube Admin](https://github.com/m09l6d0ur13ii/teetube-admin) - Extension for moderators.

## 🛠️ How to download and run this repository

To download just this extension and edit it:

```bash
git clone https://github.com/m09l6d0ur13ii/teetube-extension.git
cd teetube-extension
```
To test it in Chrome:
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `teetube-extension` folder.

## 📦 How to download the ENTIRE TeeTube Project

If you want to work on all parts of TeeTube at once:

```bash
mkdir teetube-workspace
cd teetube-workspace
git clone https://github.com/m09l6d0ur13ii/teetube.git
git clone https://github.com/m09l6d0ur13ii/teetube-extension.git
git clone https://github.com/m09l6d0ur13ii/teetube-admin.git
git clone https://github.com/m09l6d0ur13ii/teetube-db.git
```

### Features
- Shows a read-only panel on YouTube video pages with the map, players, and tags.
- Integrates with DDNet, DDStats, and TeeRank to show banners when a player, map, or clan has videos in our database.
