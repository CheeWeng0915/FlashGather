const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const requireDatabase = require('../middleware/requireDatabase');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.use(requireDatabase);
router.use(requireAuth);

const createValidators = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 1000 })
    .withMessage('Description must be at most 1000 characters'),
  body('time')
    .optional({ values: 'falsy' })
    .custom((value) => !Number.isNaN(Date.parse(value)))
    .withMessage('Time must be a valid date'),
  body('location')
    .optional()
    .isString()
    .withMessage('Location must be a string')
    .isLength({ max: 200 })
    .withMessage('Location must be at most 200 characters'),
  body('lat')
    .optional({ values: 'falsy' })
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('lng')
    .optional({ values: 'falsy' })
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('capacity')
    .optional({ values: 'falsy' })
    .custom((value) => Number.isInteger(Number(value)) && Number(value) > 0)
    .withMessage('Capacity must be a positive integer')
];

const updateValidators = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 1000 })
    .withMessage('Description must be at most 1000 characters'),
  body('time')
    .optional({ values: 'falsy' })
    .custom((value) => !Number.isNaN(Date.parse(value)))
    .withMessage('Time must be a valid date'),
  body('location')
    .optional()
    .isString()
    .withMessage('Location must be a string')
    .isLength({ max: 200 })
    .withMessage('Location must be at most 200 characters'),
  body('lat')
    .optional({ values: 'falsy' })
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('lng')
    .optional({ values: 'falsy' })
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('capacity')
    .optional({ values: 'falsy' })
    .custom((value) => Number.isInteger(Number(value)) && Number(value) > 0)
    .withMessage('Capacity must be a positive integer')
];

const sendValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return false;
  }

  res.status(400).json({ errors: errors.array() });
  return true;
};

const normalizePayload = (input) => {
  const payload = {};

  if (Object.prototype.hasOwnProperty.call(input, 'title')) {
    payload.title = input.title.trim();
  }
  if (Object.prototype.hasOwnProperty.call(input, 'description')) {
    payload.description = (input.description || '').trim();
  }
  if (Object.prototype.hasOwnProperty.call(input, 'time')) {
    payload.time = input.time ? new Date(input.time) : null;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'location')) {
    payload.location = (input.location || '').trim();
  }
  if (Object.prototype.hasOwnProperty.call(input, 'lat')) {
    payload.lat = input.lat === null || input.lat === '' ? null : Number(input.lat);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'lng')) {
    payload.lng = input.lng === null || input.lng === '' ? null : Number(input.lng);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'capacity')) {
    payload.capacity = input.capacity ? Number(input.capacity) : null;
  }

  return payload;
};

router.get('/', async (req, res) => {
  try {
    const events = await Event.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid event id' });
  }

  try {
    const event = await Event.findOne({ _id: req.params.id, userId: req.user.id });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    return res.json(event);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/', createValidators, async (req, res) => {
  if (sendValidationErrors(req, res)) {
    return;
  }

  try {
    const payload = normalizePayload(req.body);
    payload.userId = req.user.id;
    payload.createdBy = req.user.id;
    const created = await Event.create(payload);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.put('/:id', updateValidators, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid event id' });
  }
  if (sendValidationErrors(req, res)) {
    return;
  }

  try {
    const payload = normalizePayload(req.body);
    const updated = await Event.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, payload, {
      new: true,
      runValidators: true
    });
    if (!updated) {
      return res.status(404).json({ error: 'Event not found' });
    }
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid event id' });
  }

  try {
    const deleted = await Event.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!deleted) {
      return res.status(404).json({ error: 'Event not found' });
    }
    return res.json({ message: 'Event deleted' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
