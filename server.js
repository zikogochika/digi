
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// Servir les fichiers React (Build)
// Assurez-vous d'avoir exécuté 'npm run build' avant
app.use(express.static(path.join(__dirname, 'build')));

// Route par défaut pour React (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Atlas SaaS (Mode Local/Standalone) running on port ${PORT}`);
    console.log(`Ouvrez http://localhost:${PORT} dans votre navigateur`);
});
