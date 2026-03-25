require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors());
app.use(express.json());

app.use('/db-test', require('./routes/dbTest'));
app.use('/auth', require('./routes/auth'));
app.use('/events', require('./routes/events'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
