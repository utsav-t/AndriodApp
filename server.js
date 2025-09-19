const path = require('path');
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, methods: ['GET','POST'] } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

const onlineUsers = new Map();
const recentMessages = [];
const MAX_RECENT_MESSAGES = 100;

function sanitizeUsername(raw){
  return String(raw||'').trim().replace(/\s+/g,' ').slice(0,32);
}
function generateMessageId(){
  return (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8)).toUpperCase();
}

io.on('connection', function(socket){
  let currentUsername = '';
  socket.emit('system_message','Connected. Set a username to start chatting.');

  socket.on('set_username', function(proposedName){
    const name = sanitizeUsername(proposedName);
    if(!name){ socket.emit('system_message','Username cannot be empty.'); return; }
    currentUsername = name;
    onlineUsers.set(socket.id,{ username:name });
    socket.emit('chat_history', recentMessages);
    io.emit('users_update', Array.from(onlineUsers.values()).map(function(u){ return u.username; }));
    socket.emit('system_message','Welcome, '+name+'!');
    socket.broadcast.emit('system_message', name+' joined the chat.');
  });

  socket.on('chat_message', function(rawText){
    const text = String(rawText||'').slice(0,1000);
    if(!currentUsername || !text.trim()) return;
    const message = { id: generateMessageId(), username: currentUsername, text: text, timestamp: Date.now() };
    recentMessages.push(message);
    if(recentMessages.length > MAX_RECENT_MESSAGES) recentMessages.shift();
    io.emit('chat_message', message);
  });

  socket.on('typing', function(){ if(!currentUsername) return; socket.broadcast.emit('typing', { username: currentUsername }); });
  socket.on('stop_typing', function(){ if(!currentUsername) return; socket.broadcast.emit('stop_typing', { username: currentUsername }); });

  socket.on('disconnect', function(){
    const user = onlineUsers.get(socket.id);
    onlineUsers.delete(socket.id);
    io.emit('users_update', Array.from(onlineUsers.values()).map(function(u){ return u.username; }));
    if(user && user.username){ socket.broadcast.emit('system_message', user.username+' left the chat.'); }
  });
});

server.listen(PORT, function(){ console.log('Realtime chat server listening on http://localhost:'+PORT); });
