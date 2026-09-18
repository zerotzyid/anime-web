const express = require('express');
const router = express.Router();
const path = require('path');

// Swagger UI page
router.get('/swagger-ui', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/swagger-ui.html'));
});

// Swagger JSON spec
router.get('/swagger.json', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/swagger.json'));
});

module.exports = router;