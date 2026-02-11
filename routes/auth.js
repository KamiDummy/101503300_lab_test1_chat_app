const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

// redirect to login
router.get('/', (req, res) => {
  res.redirect('/login.html');
});

// signup route
router.post('/signup', async (req, res) => {
  try {
    const { username, firstname, lastname, password } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      firstname,
      lastname,
      password: hashedPassword,
      createon: new Date()
    });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.json({ username: user.username, firstname: user.firstname, lastname: user.lastname });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
