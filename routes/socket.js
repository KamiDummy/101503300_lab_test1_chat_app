const GroupMessage = require('../models/GroupMessage');
const PrivateMessage = require('../models/PrivateMessage');

// keep track of online users
const onlineUsers = new Map();

function getUsersInRoom(room) {
  const users = [];
  for (const [id, data] of onlineUsers) {
    if (data.room === room) {
      users.push(data.username);
    }
  }
  return users;
}

function initSocket(io) {

  function findSocketByUsername(username) {
    for (const [id, data] of onlineUsers) {
      if (data.username === username) {
        return io.sockets.sockets.get(id);
      }
    }
    return null;
  }

  io.on('connection', (socket) => {
    console.log('User connected: ' + socket.id);

    // join room
    socket.on('joinRoom', async ({ username, room }) => {
      const currentUser = onlineUsers.get(socket.id);
      if (currentUser && currentUser.room) {
        socket.leave(currentUser.room);
        io.to(currentUser.room).emit('userLeft', { username, room: currentUser.room });
        io.to(currentUser.room).emit('updateUsers', getUsersInRoom(currentUser.room));
      }

      socket.join(room);
      onlineUsers.set(socket.id, { username, room });
      socket.to(room).emit('userJoined', { username, room });

      // load last 50 messages
      const history = await GroupMessage.find({ room }).sort({ date_sent: -1 }).limit(50).lean();
      socket.emit('chatHistory', history.reverse());

      io.to(room).emit('updateUsers', getUsersInRoom(room));
    });

    // leave room
    socket.on('leaveRoom', ({ username, room }) => {
      socket.leave(room);
      const user = onlineUsers.get(socket.id);
      if (user) user.room = null;
      io.to(room).emit('userLeft', { username, room });
      io.to(room).emit('updateUsers', getUsersInRoom(room));
    });

    // group message
    socket.on('groupMessage', async ({ from_user, room, message }) => {
      const msg = new GroupMessage({ from_user, room, message, date_sent: new Date() });
      await msg.save();
      io.to(room).emit('newGroupMessage', { from_user, room, message, date_sent: msg.date_sent });
    });

    // private message
    socket.on('privateMessage', async ({ from_user, to_user, message }) => {
      const msg = new PrivateMessage({ from_user, to_user, message, date_sent: new Date() });
      await msg.save();

      const targetSocket = findSocketByUsername(to_user);
      if (targetSocket) {
        targetSocket.emit('newPrivateMessage', { from_user, to_user, message, date_sent: msg.date_sent });
      }
      socket.emit('newPrivateMessage', { from_user, to_user, message, date_sent: msg.date_sent });
    });

    // typing
    socket.on('typing', ({ username, room }) => {
      socket.to(room).emit('userTyping', { username });
    });

    socket.on('stopTyping', ({ username, room }) => {
      socket.to(room).emit('userStopTyping', { username });
    });

    // disconnect
    socket.on('disconnect', () => {
      const user = onlineUsers.get(socket.id);
      if (user && user.room) {
        io.to(user.room).emit('userLeft', { username: user.username, room: user.room });
        io.to(user.room).emit('updateUsers', getUsersInRoom(user.room));
      }
      onlineUsers.delete(socket.id);
    });
  });
}

module.exports = initSocket;
