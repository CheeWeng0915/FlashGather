const express = require('express')
const { body, validationResult } = require('express-validator')
const mongoose = require('mongoose')
const Event = require('../models/Event')
const EventParticipant = require('../models/EventParticipant')
const User = require('../models/User')
const requireDatabase = require('../middleware/requireDatabase')
const requireAuth = require('../middleware/auth')
const loadCurrentUser = require('../middleware/loadCurrentUser')
const requireAdmin = require('../middleware/requireAdmin')

const router = express.Router()

router.use(requireDatabase)
router.use(requireAuth)
router.use(loadCurrentUser)

const participantEmailValidators = [
  body('participantEmails')
    .optional()
    .isArray()
    .withMessage('participantEmails must be an array'),
  body('participantEmails.*')
    .optional()
    .isEmail()
    .withMessage('Participant email must be a valid email address')
]

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
  ...participantEmailValidators
]

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
  ...participantEmailValidators
]

const sendValidationErrors = (req, res) => {
  const errors = validationResult(req)
  if (errors.isEmpty()) {
    return false
  }

  res.status(400).json({ errors: errors.array() })
  return true
}

const normalizeParticipantEmails = (input) => {
  if (!Array.isArray(input)) {
    return []
  }

  const seen = new Set()
  const normalized = []

  for (const value of input) {
    const email = String(value || '').trim().toLowerCase()
    if (!email || seen.has(email)) {
      continue
    }

    seen.add(email)
    normalized.push(email)
  }

  return normalized
}

const normalizePayload = (input) => {
  const payload = {}

  if (Object.prototype.hasOwnProperty.call(input, 'title')) {
    payload.title = input.title.trim()
  }
  if (Object.prototype.hasOwnProperty.call(input, 'description')) {
    payload.description = (input.description || '').trim()
  }
  if (Object.prototype.hasOwnProperty.call(input, 'time')) {
    payload.time = input.time ? new Date(input.time) : null
  }
  if (Object.prototype.hasOwnProperty.call(input, 'location')) {
    payload.location = (input.location || '').trim()
  }
  if (Object.prototype.hasOwnProperty.call(input, 'lat')) {
    payload.lat = input.lat === null || input.lat === '' ? null : Number(input.lat)
  }
  if (Object.prototype.hasOwnProperty.call(input, 'lng')) {
    payload.lng = input.lng === null || input.lng === '' ? null : Number(input.lng)
  }

  return payload
}

const serializeEvent = (eventDoc) => {
  if (typeof eventDoc?.toJSON === 'function') {
    const serialized = eventDoc.toJSON()
    delete serialized.capacity
    return serialized
  }

  const serialized = {
    ...eventDoc,
    id: String(eventDoc._id)
  }

  delete serialized.capacity
  return serialized
}

const getParticipantCountMap = async (eventIds) => {
  if (!Array.isArray(eventIds) || eventIds.length === 0) {
    return new Map()
  }

  const rows = await EventParticipant.aggregate([
    {
      $match: {
        eventId: { $in: eventIds }
      }
    },
    {
      $group: {
        _id: '$eventId',
        count: { $sum: 1 }
      }
    }
  ])

  return new Map(rows.map((row) => [String(row._id), row.count]))
}

const decorateEventsWithParticipantCounts = async (events) => {
  const countMap = await getParticipantCountMap(events.map((eventDoc) => eventDoc._id))

  return events.map((eventDoc) => {
    const serialized = serializeEvent(eventDoc)

    return {
      ...serialized,
      participantCount: countMap.get(serialized.id) || 0
    }
  })
}

const getParticipantDetailsForEvent = async (eventId) => {
  const rows = await EventParticipant.find({ eventId })
    .populate('userId', 'username email')
    .sort({ createdAt: 1 })

  const participants = rows
    .filter((row) => row.userId)
    .map((row) => ({
      id: String(row.userId._id),
      username: row.userId.username,
      email: row.userId.email
    }))

  return {
    participantCount: participants.length,
    participantEmails: participants.map((participant) => participant.email),
    participants
  }
}

const resolveParticipantUsers = async (participantEmails) => {
  const normalizedEmails = normalizeParticipantEmails(participantEmails)

  if (normalizedEmails.length === 0) {
    return {
      users: [],
      missingEmails: [],
      normalizedEmails
    }
  }

  const users = await User.find({ email: { $in: normalizedEmails } }).select('_id username email')
  const usersByEmail = new Map(
    users.map((userDoc) => [String(userDoc.email).trim().toLowerCase(), userDoc])
  )

  return {
    users,
    normalizedEmails,
    missingEmails: normalizedEmails.filter((email) => !usersByEmail.has(email))
  }
}

const replaceEventParticipants = async (eventId, users, addedBy) => {
  await EventParticipant.deleteMany({ eventId })

  if (!Array.isArray(users) || users.length === 0) {
    return
  }

  await EventParticipant.insertMany(
    users.map((userDoc) => ({
      eventId,
      userId: userDoc._id,
      addedBy
    }))
  )
}

const buildParticipantEmailError = (missingEmails) =>
  `These participant emails are not registered: ${missingEmails.join(', ')}`

const isPastEvent = (value) => {
  if (!value) {
    return false
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return false
  }

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  return date < startOfToday
}

const PAST_EVENT_LOCKED_ERROR =
  'Past events are locked and can no longer be edited or deleted.'

router.get('/', async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const events = await Event.find({ userId: req.user.id }).sort({ createdAt: -1 })
      return res.json(await decorateEventsWithParticipantCounts(events))
    }

    const relationships = await EventParticipant.find({ userId: req.user.id }).select('eventId')
    const eventIds = relationships.map((item) => item.eventId)

    if (eventIds.length === 0) {
      return res.json([])
    }

    const events = await Event.find({ _id: { $in: eventIds } }).sort({ createdAt: -1 })
    return res.json(await decorateEventsWithParticipantCounts(events))
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

router.get('/:id', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid event id' })
  }

  try {
    if (req.user.role === 'admin') {
      const event = await Event.findOne({ _id: req.params.id, userId: req.user.id })
      if (!event) {
        return res.status(404).json({ error: 'Event not found' })
      }

      const participantDetails = await getParticipantDetailsForEvent(event._id)
      return res.json({
        ...serializeEvent(event),
        ...participantDetails
      })
    }

    const isParticipant = await EventParticipant.exists({
      eventId: req.params.id,
      userId: req.user.id
    })

    if (!isParticipant) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const event = await Event.findById(req.params.id)
    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const participantCount = await EventParticipant.countDocuments({ eventId: event._id })
    return res.json({
      ...serializeEvent(event),
      participantCount
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

router.post('/', requireAdmin, createValidators, async (req, res) => {
  if (sendValidationErrors(req, res)) {
    return
  }

  try {
    const participantResolution = await resolveParticipantUsers(req.body.participantEmails)
    if (participantResolution.missingEmails.length > 0) {
      return res.status(400).json({
        error: buildParticipantEmailError(participantResolution.missingEmails)
      })
    }

    const payload = normalizePayload(req.body)
    payload.userId = req.user.id
    payload.createdBy = req.user.id

    const created = await Event.create(payload)

    try {
      await replaceEventParticipants(created._id, participantResolution.users, req.user.id)
    } catch (error) {
      await Event.findByIdAndDelete(created._id)
      throw error
    }

    return res.status(201).json({
      ...serializeEvent(created),
      participantCount: participantResolution.users.length,
      participantEmails: participantResolution.normalizedEmails,
      participants: participantResolution.users.map((userDoc) => ({
        id: String(userDoc._id),
        username: userDoc.username,
        email: userDoc.email
      }))
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

router.put('/:id', requireAdmin, updateValidators, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid event id' })
  }
  if (sendValidationErrors(req, res)) {
    return
  }

  try {
    const existing = await Event.findOne({ _id: req.params.id, userId: req.user.id })
    if (!existing) {
      return res.status(404).json({ error: 'Event not found' })
    }

    if (isPastEvent(existing.time)) {
      return res.status(403).json({ error: PAST_EVENT_LOCKED_ERROR })
    }

    const participantResolution = await resolveParticipantUsers(req.body.participantEmails)
    if (participantResolution.missingEmails.length > 0) {
      return res.status(400).json({
        error: buildParticipantEmailError(participantResolution.missingEmails)
      })
    }

    const payload = normalizePayload(req.body)
    existing.set(payload)
    const updated = await existing.save()

    await replaceEventParticipants(updated._id, participantResolution.users, req.user.id)

    return res.json({
      ...serializeEvent(updated),
      participantCount: participantResolution.users.length,
      participantEmails: participantResolution.normalizedEmails,
      participants: participantResolution.users.map((userDoc) => ({
        id: String(userDoc._id),
        username: userDoc.username,
        email: userDoc.email
      }))
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', requireAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid event id' })
  }

  try {
    const existing = await Event.findOne({ _id: req.params.id, userId: req.user.id })
    if (!existing) {
      return res.status(404).json({ error: 'Event not found' })
    }

    if (isPastEvent(existing.time)) {
      return res.status(403).json({ error: PAST_EVENT_LOCKED_ERROR })
    }

    await EventParticipant.deleteMany({ eventId: existing._id })
    await existing.deleteOne()
    return res.json({ message: 'Event deleted' })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

module.exports = router
