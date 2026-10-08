# Messenger 

Веб-приложение для отправки и получения текстовых сообщений в WhatsApp через сервис [GREEN-API](https://green-api.com/).

**Демо:** [https://messenger-sigma-bay.vercel.app](https://messenger-sigma-bay.vercel.app)

---

## Возможности

- Авторизация по `idInstance` и `apiTokenInstance` (данные сохраняются в `localStorage`).
- Создание чата по номеру телефона.
- Отправка текстовых сообщений.
- Получение входящих сообщений в реальном времени (через long-polling `receiveNotification`).
- Оптимистичное обновление UI при отправке.
- Интерфейс в стиле WhatsApp.

---

## Стек

| Технология     | Описание                  |
|----------------|---------------------------|
| **React 19**   | UI-библиотека             |
| **Vite 8**     | Сборка и dev-сервер       |
| **JavaScript** | Без TypeScript            |
| **CSS**        | Кастомные стили           |
| **GREEN-API**  | WhatsApp API              |

---

## Требования

- Node.js 18+
- Аккаунт в [GREEN-API](https://green-api.com/) 

---

## Локальный запуск

```bash
# 1. Клонировать репозиторий
git clone https://github.com/Lyubov15/messenger.git
cd messenger

# 2. Установить зависимости
npm install

# 3. Запустить в режиме разработки
npm run dev

После запуска откройте в браузере адрес, который покажет Vite (http://localhost:5173).

