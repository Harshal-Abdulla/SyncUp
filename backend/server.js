/**
 * Local development only.
 *
 * On Vercel the entrypoint is app.js, which exports the app and never listens.
 * This file exists so `npm start` and `npm run dev` still work on a laptop.
 */
require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
