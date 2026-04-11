const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/recipes', require('./routes/recipes'));
app.use('/api/search', require('./routes/search'));
app.use('/api/images', require('./routes/images'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/cook-mode', require('./routes/cookmode'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));