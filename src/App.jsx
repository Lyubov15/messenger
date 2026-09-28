import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  // Состояния для данных авторизации
  const [idInstance, setIdInstance] = useState(() => localStorage.getItem('idInstance') || '');
  const [apiTokenInstance, setApiTokenInstance] = useState(() => localStorage.getItem('apiTokenInstance') || '');
  const [isConnected, setIsConnected] = useState(() => {
  return !!(localStorage.getItem('idInstance') && localStorage.getItem('apiTokenInstance'));
});
  
  // Состояния для чата
  const [phoneNumber, setPhoneNumber] = useState('');
  const [chatId, setChatId] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState([]); // Массив объектов { id, text, sender }
  
  // Ссылка на конец списка сообщений для автоскролла
  const messagesEndRef = useRef(null);

  // Эффект для автоматической прокрутки вниз при новом сообщении
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Функция подключения (вход)
  const handleConnect = (e) => {
    e.preventDefault();
    if (!idInstance || !apiTokenInstance) {
      alert('Пожалуйста, заполните все поля');
      return;
    }
    localStorage.setItem('idInstance', idInstance);
    localStorage.setItem('apiTokenInstance', apiTokenInstance);
    setIsConnected(true);
  };

  // Функция выхода
  const handleLogout = () => {
  localStorage.removeItem('idInstance');
  localStorage.removeItem('apiTokenInstance');
  setIdInstance('');
  setApiTokenInstance('');
  setChatId('');
  setMessages([]);
  setIsConnected(false);
};

  // Функция создания нового чата
  const handleCreateChat = (e) => {
    e.preventDefault();
    if (!phoneNumber) {
      alert('Введите номер телефона');
      return;
    }
    // Формируем chatId по стандарту API
    // Для личных чатов: номер + @c.us
    const newChatId = `${phoneNumber.replace(/[^0-9]/g, '')}@c.us`;
    setChatId(newChatId);
    setMessages([]); // Очищаем сообщения при смене чата
  };

  // Функция отправки сообщения
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!chatId) {
  alert('Сначала создайте чат: введите номер телефона слева и нажмите «Создать чат».');
  return;
}
if (!messageText.trim()) return;

    const textToSend = messageText;
    setMessageText(''); // Очищаем поле ввода сразу

    // 1. Добавляем сообщение в UI сразу (оптимистичное обновление)
    const localMessage = {
      id: Date.now().toString(),
      text: textToSend,
      sender: 'me',
    };
    setMessages((prev) => [...prev, localMessage]);

    // 2. Отправляем запрос в GREEN-API
    const url = `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: chatId,
          message: textToSend,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Если ошибка, можно удалить сообщение или пометить его как неотправленное
        console.error('Ошибка отправки:', data);
        alert('Не удалось отправить сообщение: ' + (data.message || 'Ошибка сервера'));
        // Удаляем оптимистичное сообщение при ошибке
        setMessages((prev) => prev.filter(msg => msg.id !== localMessage.id));
      } else {
        console.log('Сообщение отправлено, id:', data.idMessage);
      }
    } catch (error) {
      console.error('Сетевая ошибка:', error);
      alert('Ошибка сети. Проверьте подключение.');
      setMessages((prev) => prev.filter(msg => msg.id !== localMessage.id));
    }
  };

  // Функция для получения входящих сообщений (уведомлений)
  useEffect(() => {
    if (!isConnected || !idInstance || !apiTokenInstance) return;

    let isPolling = true;
    let abortController = new AbortController();

    const receiveMessages = async () => {
      while (isPolling) {
        try {
          // 1. Получаем уведомление
          const receiveUrl = `https://api.green-api.com/waInstance${idInstance}/receiveNotification/${apiTokenInstance}`;
          const response = await fetch(receiveUrl, { signal: abortController.signal });
          
          if (response.status === 200) {
            const notification = await response.json();
            
            // Если пришло уведомление, обрабатываем его
            if (notification && notification.receiptId) {
              console.log('Получено уведомление:', notification);
              
              // Проверяем, является ли это входящим сообщением
              if (notification.body && notification.body.typeWebhook === 'incomingMessageReceived') {
                const incomingMessage = notification.body.messageData.textMessageData?.textMessage;
                const senderChatId = notification.body.senderData?.chatId;
                
                if (incomingMessage && senderChatId === chatId) {
                  // Добавляем входящее сообщение в список
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: notification.body.idMessage || Date.now().toString(),
                      text: incomingMessage,
                      sender: 'them',
                    },
                  ]);
                }
              }
              
              // 2. Обязательно удаляем уведомление после обработки
              const deleteUrl = `https://api.green-api.com/waInstance${idInstance}/deleteNotification/${apiTokenInstance}/${notification.receiptId}`;
              await fetch(deleteUrl, { method: 'DELETE' });
            }
          }
          
          // Небольшая задержка, чтобы не перегружать сервер
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          if (error.name === 'AbortError') {
            console.log('Polling остановлен');
            break;
          }
          console.error('Ошибка при получении сообщений:', error);
          // Ждем перед повторной попыткой
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    };

    receiveMessages();

    // Очистка при размонтировании компонента или отключении
    return () => {
      isPolling = false;
      abortController.abort();
    };
  }, [isConnected, idInstance, apiTokenInstance, chatId]);

  // Если пользователь не подключен, показываем форму входа
  if (!isConnected) {
    return (
      <div className="container login-container">
        <h1>Вход в GREEN-API</h1>
        <form onSubmit={handleConnect} className="login-form">
          <div className="form-group">
            <label>ID Instance:</label>
            <input
              type="text"
              value={idInstance}
              onChange={(e) => setIdInstance(e.target.value)}
              placeholder="Например: 1101000001"
              required
            />
          </div>
          <div className="form-group">
            <label>API Token Instance:</label>
            <input
              type="password"
              value={apiTokenInstance}
              onChange={(e) => setApiTokenInstance(e.target.value)}
              placeholder="Ваш токен"
              required
            />
          </div>
          <button type="submit">Подключиться</button>
        </form>
      </div>
    );
  }

  // Если подключены, показываем чат
  return (
    <div className="container chat-container">
            <div className="sidebar">
        <div className="sidebar-header">
          <h2>Чаты</h2>
          <button onClick={handleLogout} className="logout-btn">Выйти</button>
        </div>
        <form onSubmit={handleCreateChat} className="new-chat-form">
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Номер телефона"
          />
          <button type="submit">Создать чат</button>
        </form>
        {chatId && (
          <div className="active-chat">
            <p>Активный чат:</p>
            <strong>{chatId}</strong>
          </div>
        )}
      </div>

            <div className="chat-area">
        {!chatId ? (
          <div className="empty-state">Выберите или создайте чат для начала общения</div>
        ) : (
          <>
            <div className="chat-header">
              <div className="chat-avatar">
                {chatId.replace('@c.us', '').slice(-2)}
              </div>
              <div className="chat-info">
                <div className="chat-name">+{chatId.replace('@c.us', '')}</div>
                <div className="chat-status">в сети</div>
              </div>
            </div>
            <div className="messages-list">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message ${msg.sender === 'me' ? 'my-message' : 'their-message'}`}
                >
                  <div className="message-text">{msg.text}</div>
                  <div className="message-time">
                    {new Date(parseInt(msg.id) || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="message-input-form">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Введите сообщение..."
                maxLength={4000}
              />
              <button type="submit">➤</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default App;