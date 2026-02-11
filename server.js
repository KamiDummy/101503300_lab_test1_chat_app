const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

const authRoutes = require('./routes/auth');
const initSocket = require('./routes/socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const MONGODB_URI = "mongodb+srv://kroshinci_db_user:byAViykYBBBsgP3m@cluster0.qbpahzc.mongodb.net/labex?appName=Cluster0";

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'view')));

// connect to mongodb
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log('MongoDB error:', err));

// routes
app.use('/', authRoutes);

// socket.io
initSocket(io);

server.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
