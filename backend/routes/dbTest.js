const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    mongoState: mongoose.connection.readyState
  });
});

module.exports = router;
