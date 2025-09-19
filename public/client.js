const socket = io();

const usersEl = document.getElementById('users');
const messagesEl = document.getElementById('messages');
const typingEl = document.getElementById('typing');
const statusEl = document.getElementById('status');
const formEl = document.getElementById('form');
const inputEl = document.getElementById('input');
const usernameEl = document.getElementById('username');
const saveUsernameEl = document.getElementById('save-username');

let username = '';
let typingTimeout;

function appendMessage({ username: user, text, timestamp, system }) {
  const li = document.createElement('li');
  li.className = system ? 'msg system' : 'msg';
  const time = new Date(timestamp || Date.now()).toLocaleTimeString();
  li.innerHTML = system ? '<em>' + text + '</em>' : '<strong>' + user + '</strong> <span class="time">' + time + '</span><br>' + text;
  messagesEl.appendChild(li);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

saveUsernameEl.addEventListener('click', () => {
  const name = usernameEl.value.trim();
  if (!name) return;
  username = name;
  socket.emit('set_username', name);
});

usernameEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    saveUsernameEl.click();
  }
});

formEl.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text || !username) return;
  socket.emit('chat_message', text);
  inputEl.value = '';
  socket.emit('stop_typing');
});

inputEl.addEventListener('input', () => {
  if (!username) return;
  socket.emit('typing');
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit('stop_typing'), 800);
});

socket.on('system_message', (text) => {
  appendMessage({ text, system: true });
  statusEl.textContent = text;
  setTimeout(() => (statusEl.textContent = ''), 2000);
});

socket.on('chat_history', (messages) => {
  messages.forEach(appendMessage);
});

socket.on('chat_message', (msg) => {
  appendMessage(msg);
});

socket.on('users_update', (users) => {
  usersEl.innerHTML = '';
  users.forEach((u) => {
    const li = document.createElement('li');
    li.textContent = u;
    usersEl.appendChild(li);
  });
});

socket.on('typing', ({ username: u }) => {
  typingEl.hidden = false;
  typingEl.textContent = u + ' is typing...';
});

socket.on('stop_typing', () => {
  typingEl.hidden = true;
  typingEl.textContent = '';
});
