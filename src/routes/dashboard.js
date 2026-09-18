const express = require('express');
const router = express.Router();
const path = require('path');

// Dashboard page
router.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/dashboard.html'));
});

module.exports = router;