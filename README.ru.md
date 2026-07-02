[🇷🇺 Русский](README.ru.md) | [🇬🇧 English](README.md)

# TeeTube Extension

Это браузерное расширение для обычных пользователей **TeeTube**. Оно помогает вам видеть, какие видео уже есть в нашей базе, пока вы листаете YouTube и сайты статистики DDNet.

## 🔗 Связанные проекты

TeeTube разделен на 4 репозитория:
- 👁️ [TeeTube Extension (Для пользователей)](https://github.com/m09l6d0ur13ii/teetube-extension) - Это расширение.
- 🌐 [TeeTube (Сайт)](https://github.com/m09l6d0ur13ii/teetube) - Главный сайт.
- 💾 [TeeTube Database (База)](https://github.com/m09l6d0ur13ii/teetube-db) - JSON база всех видео.
- 🛠️ [TeeTube Admin (Админка)](https://github.com/m09l6d0ur13ii/teetube-admin) - Расширение для модераторов.

## 🛠️ Как скачать и запустить этот репозиторий

Чтобы скачать только это расширение:

```bash
git clone https://github.com/m09l6d0ur13ii/teetube-extension.git
cd teetube-extension
```
Чтобы установить в Chrome:
1. Откройте `chrome://extensions/`
2. Включите "Режим разработчика" (справа вверху)
3. Нажмите "Загрузить распакованное расширение" и выберите папку `teetube-extension`.

## 📦 Как скачать ВЕСЬ проект TeeTube

Если вы хотите работать со всеми частями TeeTube сразу:

```bash
mkdir teetube-workspace
cd teetube-workspace
git clone https://github.com/m09l6d0ur13ii/teetube.git
git clone https://github.com/m09l6d0ur13ii/teetube-extension.git
git clone https://github.com/m09l6d0ur13ii/teetube-admin.git
git clone https://github.com/m09l6d0ur13ii/teetube-db.git
```

### Особенности
- Показывает панель на YouTube с картами, игроками и тегами видео.
- Интегрируется с DDNet, DDStats и TeeRank: показывает баннеры, если у игрока/карты есть видео в базе.
