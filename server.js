const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const db = require('./database/db');

// Load configurations
let config;
try {
  config = require('./config.json');
} catch (err) {
  console.error('Critical: Failed to load config.json. Using fallback values.');
  config = {
    site: { name: 'Software Hub', tagline: 'Windows Download Site', port: 3000 },
    paths: { database: './database/database.sqlite', storage: './storage' },
    admin: { sessionSecret: 'default_fallback_session_secret' }
  };
}

const app = express();

// Set View Engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Management for Admin Panel
app.use(session({
  secret: config.admin.sessionSecret || 'default_fallback_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Ensure local storage folders exist
const storageBase = path.resolve(__dirname, config.paths.storage || './storage');
fs.mkdirSync(path.join(storageBase, 'images'), { recursive: true });
fs.mkdirSync(path.join(storageBase, 'software'), { recursive: true });

// Static Folders serving
app.use(express.static(path.join(__dirname, 'public')));
app.use('/storage', express.static(storageBase));

// Route Files
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');
const assistantRoutes = require('./routes/assistantRoutes');

// Inject global values into views (e.g. site name in header)
app.use((req, res, next) => {
  res.locals.siteName = config.site.name;
  res.locals.siteTagline = config.site.tagline;
  res.locals.adminUser = req.session ? req.session.adminUser : null;
  res.locals.config = config;
  next();
});

// Register routes
app.use('/api/assistant', assistantRoutes);
app.use('/admin', adminRoutes);
app.use('/', publicRoutes);

// 404 Route handler
app.use(async (req, res) => {
  const categories = await db.all('SELECT * FROM categories ORDER BY name ASC');
  res.status(404).render('error', { 
    message: 'Page not found', 
    config, 
    categories 
  });
});

// Central Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).send('Internal Server Error: ' + err.message);
});

// Start Server after Database Initialization
const PORT = process.env.PORT || config.site.port || 3000;
db.initialize().then(() => {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`Windows Software Download Site is running!`);
    console.log(`Server Address: http://localhost:${PORT}`);
    console.log(`Admin Portal  : http://localhost:${PORT}/admin`);
    console.log(`====================================================`);
  });
}).catch(err => {
  console.error('Failed to initialize database. Server cannot start.', err);
});
