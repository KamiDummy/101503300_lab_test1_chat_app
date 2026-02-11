// check if user is logged in
var username = localStorage.getItem('chat_username');
if (!username) {
  window.location.href = '/login.html';
}
$('#display-username').text(username);

var socket = io();
var currentRoom = null;
var typingTimeout = null;
var pmTargetUser = null;

// join room when clicked
$('#room-list').on('click', '.list-group-item', function() {
  var room = $(this).data('room');
  if (room === currentRoom) return;

  currentRoom = room;
  $('#room-list .list-group-item').removeClass('active');
  $(this).addClass('active');
  $('#message-input').prop('disabled', false);
  $('#send-btn').prop('disabled', false);
  $('#leave-room-btn').removeClass('d-none');
  $('#room-header h5').text('Room: ' + room);
  $('#messages-area').empty();

  socket.emit('joinRoom', { username: username, room: room });
});

// leave room
$('#leave-room-btn').on('click', function() {
  if (!currentRoom) return;
  socket.emit('leaveRoom', { username: username, room: currentRoom });

  $('#room-list .list-group-item').removeClass('active');
  $('#messages-area').empty();
  $('#users-list').empty();
  $('#message-input').prop('disabled', true);
  $('#send-btn').prop('disabled', true);
  $('#leave-room-btn').addClass('d-none');
  $('#room-header h5').text('Select a room to start chatting');
  $('#typing-indicator').text('');
  currentRoom = null;
});

// send message
$('#message-form').on('submit', function(e) {
  e.preventDefault();
  var message = $('#message-input').val().trim();
  if (!message || !currentRoom) return;

  socket.emit('groupMessage', { from_user: username, room: currentRoom, message: message });
  socket.emit('stopTyping', { username: username, room: currentRoom });
  $('#message-input').val('');
});

// typing indicator
$('#message-input').on('input', function() {
  if (!currentRoom) return;
  socket.emit('typing', { username: username, room: currentRoom });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(function() {
    socket.emit('stopTyping', { username: username, room: currentRoom });
  }, 2000);
});

// receive chat history
socket.on('chatHistory', function(messages) {
  $('#messages-area').empty();
  messages.forEach(function(msg) {
    appendMessage(msg);
  });
  scrollToBottom();
});

// new group message
socket.on('newGroupMessage', function(msg) {
  appendMessage(msg);
  scrollToBottom();
});

// user joined
socket.on('userJoined', function(data) {
  $('#messages-area').append('<div class="text-center text-muted small my-2"><em>' + data.username + ' joined ' + data.room + '</em></div>');
  scrollToBottom();
});

// user left
socket.on('userLeft', function(data) {
  $('#messages-area').append('<div class="text-center text-muted small my-2"><em>' + data.username + ' left ' + data.room + '</em></div>');
  scrollToBottom();
});

// update online users list
socket.on('updateUsers', function(users) {
  $('#users-list').empty();
  users.forEach(function(user) {
    var pmBtn = '';
    if (user !== username) {
      pmBtn = '<button class="btn btn-sm btn-outline-primary pm-btn" data-user="' + user + '">PM</button>';
    }
    $('#users-list').append('<li class="list-group-item d-flex justify-content-between align-items-center">' + user + ' ' + pmBtn + '</li>');
  });
});

// typing indicators
socket.on('userTyping', function(data) {
  $('#typing-indicator').text(data.username + ' is typing...');
});

socket.on('userStopTyping', function() {
  $('#typing-indicator').text('');
});

// private message received
socket.on('newPrivateMessage', function(msg) {
  var pmTarget = $('#pm-target-user').text();
  if (pmTarget === msg.from_user || pmTarget === msg.to_user) {
    var time = new Date(msg.date_sent).toLocaleTimeString();
    var isSelf = msg.from_user === username;
    $('#pm-messages').append('<div class="mb-1 ' + (isSelf ? 'text-end' : '') + '"><strong>' + msg.from_user + ':</strong> ' + msg.message + ' <small class="text-muted">' + time + '</small></div>');
  }
  if (msg.from_user !== username) {
    alert('Private message from ' + msg.from_user + ': ' + msg.message);
  }
});

// open PM modal
$(document).on('click', '.pm-btn', function() {
  pmTargetUser = $(this).data('user');
  $('#pm-target-user').text(pmTargetUser);
  $('#pm-messages').empty();
  var pmModal = new bootstrap.Modal($('#pmModal'));
  pmModal.show();
});

// send PM
$('#pm-send-btn').on('click', sendPM);
$('#pm-input').on('keypress', function(e) {
  if (e.which === 13) sendPM();
});

function sendPM() {
  var message = $('#pm-input').val().trim();
  if (!message || !pmTargetUser) return;
  socket.emit('privateMessage', { from_user: username, to_user: pmTargetUser, message: message });
  $('#pm-input').val('');
}

// logout
$('#logout-btn').on('click', function() {
  if (currentRoom) {
    socket.emit('leaveRoom', { username: username, room: currentRoom });
  }
  localStorage.clear();
  window.location.href = '/login.html';
});

// helper functions
function appendMessage(msg) {
  var time = new Date(msg.date_sent).toLocaleTimeString();
  var isSelf = msg.from_user === username;
  var html = '<div class="mb-2 ' + (isSelf ? 'text-end' : '') + '">' +
    '<div class="d-inline-block p-2 rounded ' + (isSelf ? 'bg-primary text-white' : 'bg-light border') + '" style="max-width:70%">' +
    '<strong>' + msg.from_user + '</strong><br>' +
    msg.message + '<br>' +
    '<small>' + time + '</small>' +
    '</div></div>';
  $('#messages-area').append(html);
}

function scrollToBottom() {
  var area = document.getElementById('messages-area');
  area.scrollTop = area.scrollHeight;
}
