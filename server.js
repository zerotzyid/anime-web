const config = require('../config');
const express = require('express');
const path = require('path');
const fs = require('fs');
const apiRoutes = require('./src/routes/api');
const swaggerRoutes = require('./src/routes/swagger');
const dashboardRoutes = require('./src/routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3474;

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '0');
  next();
});

// JSON body parser
app.use(express.json());

// API routes
app.use('/api', apiRoutes);

// Swagger routes
app.use('/docs', swaggerRoutes);

// Dashboard routes
app.use('/dashboard', dashboardRoutes);

// Static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Make API_BASE_URL available client-side
app.get('*.html', (req, res, next) => {
  const filePath = path.join(__dirname, 'public', req.path);
  res.sendFile(filePath, (err) => {
    if (err) return next(err);
    if (req.path === '/swagger-ui.html' || req.path === '/dashboard.html') {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const modifiedContent = fileContent.replace(
        '</head>',
        `<script>window.API_BASE_URL = \'${config.API_BASE_URL}\';</script></head>`
      );
      res.send(modifiedContent);
    } else {
      res.sendFile(filePath);
    }
  });
});


// SPA fallback — serve index.html for unknown routes (search, genre detail, etc.)
app.get('*', (req, res) => {
  // Watch page needs special handling
  if (req.path.startsWith('/watch/')) {
    return res.sendFile(path.join(__dirname, 'public', 'watch.html'));
  }
  // Anime detail page
  if (req.path.startsWith('/anime/')) {
    return res.sendFile(path.join(__dirname, 'public', 'anime.html'));
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[server]', err);
  if (!res.headersSent) res.status(500).json({ success: false, message: 'Internal error' });
});

// Start server only if not in Vercel (serverless)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Anime web server running on http://0.0.0.0:${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;
if (typeof module !== 'undefined' && module.exports) {
  module.exports.default = app;
}