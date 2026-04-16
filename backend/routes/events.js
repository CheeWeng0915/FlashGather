const express = require('express');
const { body, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventParticipant = require('../models/EventParticipant');
const ItineraryItem = require('../models/ItineraryItem');
const Notification = require('../models/Notification');
const User = require('../models/User');
const requireDatabase = require('../middleware/requireDatabase');
const requireAuth = require('../middleware/auth');
const loadCurrentUser = require('../middleware/loadCurrentUser');

const router = express.Router();

router.use(requireDatabase);
router.use(requireAuth);
router.use(loadCurrentUser);

const EVENT_SCOPE_VALUES = ['joined', 'created', 'all'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const participantEmailValidators = [
  body('participantEmails')
    .optional()
    .isArray()
    .withMessage('participantEmails must be an array'),
  body('participantEmails.*')
    .optional()
    .isEmail()
    .withMessage('Participant email must be a valid email address')
];

const eventValidators = [
  body('title').optional().trim().notEmpty().withMessage('Title is required'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 1000 })
    .withMessage('Description must be at most 1000 characters'),
  body('startDate')
    .optional({ values: 'falsy' })
    .matches(DATE_PATTERN)
    .withMessage('Start date must be in YYYY-MM-DD format'),
  body('endDate')
    .optional({ values: 'falsy' })
    .matches(DATE_PATTERN)
    .withMessage('End date must be in YYYY-MM-DD format'),
  ...participantEmailValidators
];

const createValidators = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('startDate')
    .matches(DATE_PATTERN)
    .withMessage('Start date must be in YYYY-MM-DD format'),
  body('endDate')
    .matches(DATE_PATTERN)
    .withMessage('End date must be in YYYY-MM-DD format'),
  ...eventValidators
];

const listValidators = [
  query('scope')
    .optional()
    .isIn(EVENT_SCOPE_VALUES)
    .withMessage(`Scope must be one of: ${EVENT_SCOPE_VALUES.join(', ')}`)
];

const itineraryValidators = [
  body('date')
    .optional()
    .matches(DATE_PATTERN)
    .withMessage('Date must be in YYYY-MM-DD format'),
  body('time')
    .optional()
    .matches(TIME_PATTERN)
    .withMessage('Time must be in HH:mm format'),
  body('location')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Location is required')
    .isLength({ max: 200 })
    .withMessage('Location must be at most 200 characters'),
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .isLength({ max: 1000 })
    .withMessage('Notes must be at most 1000 characters'),
  body('lat')
    .optional({ values: 'falsy' })
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('lng')
    .optional({ values: 'falsy' })
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180')
];

const itineraryCreateValidators = [
  body('date')
    .matches(DATE_PATTERN)
    .withMessage('Date must be in YYYY-MM-DD format'),
  body('time')
    .matches(TIME_PATTERN)
    .withMessage('Time must be in HH:mm format'),
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required'),
  ...itineraryValidators
];

const itineraryUpdateValidators = [
  ...itineraryValidators
];

const sendValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return false;
  }

  res.status(400).json({ errors: errors.array() });
  return true;
};

const normalizeDateString = (value) => {
  const normalized = String(value || '').trim();
  return DATE_PATTERN.test(normalized) ? normalized : null;
};

const normalizeTimeString = (value) => {
  const normalized = String(value || '').trim();
  return TIME_PATTERN.test(normalized) ? normalized : null;
};

const padDatePart = (value) => String(value).padStart(2, '0');

const toLocalDateString = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate())
  ].join('-');
};

const getTodayDateString = () => toLocalDateString(new Date());

const getEventStartDate = (eventDoc) =>
  normalizeDateString(eventDoc?.startDate) ||
  toLocalDateString(eventDoc?.time) ||
  toLocalDateString(eventDoc?.createdAt);

const getEventEndDate = (eventDoc) =>
  normalizeDateString(eventDoc?.endDate) ||
  toLocalDateString(eventDoc?.time) ||
  toLocalDateString(eventDoc?.createdAt);

const isValidDateRange = (startDate, endDate) =>
  Boolean(startDate && endDate && startDate <= endDate);

const isPastEvent = (eventDoc) => {
  const endDate = getEventEndDate(eventDoc);
  if (!endDate) {
    return false;
  }

  return endDate < getTodayDateString();
};

const compareAscendingDate = (left, right) => {
  if (!left && !right) {
    return 0;
  }

  if (!left) {
    return 1;
  }

  if (!right) {
    return -1;
  }

  return left.localeCompare(right);
};

const getDaysFromToday = (dateValue) => {
  if (!dateValue) {
    return null;
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return Math.floor((parsed.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));
};

const getRecommendationScore = (eventDoc) => {
  const eventStartDate = getEventStartDate(eventDoc);
  const daysFromToday = getDaysFromToday(eventStartDate);
  const participantCount = Number(eventDoc?.participantCount) || 0;
  let score = participantCount;

  if (daysFromToday === null) {
    score += 6;
  } else if (daysFromToday < 0) {
    score -= 1000;
  } else {
    score += Math.max(0, 45 - daysFromToday);
    if (daysFromToday <= 7) {
      score += 12;
    }
  }

  return score;
};

const sortRecommendedEvents = (events) =>
  [...events].sort((left, right) => {
    const scoreComparison = getRecommendationScore(right) - getRecommendationScore(left);
    if (scoreComparison !== 0) {
      return scoreComparison;
    }

    const startDateComparison = compareAscendingDate(
      getEventStartDate(left),
      getEventStartDate(right)
    );
    if (startDateComparison !== 0) {
      return startDateComparison;
    }

    return String(left?.title || '').localeCompare(String(right?.title || ''));
  });

const ALREADY_JOINED_ERROR = 'You have already joined this event.';
const ADMIN_JOIN_FORBIDDEN_ERROR = 'Admins cannot join events.';
const NOT_JOINED_ERROR = 'You have not joined this event.';
const OWNER_LEAVE_FORBIDDEN_ERROR = 'Event owners cannot leave their own events.';

const normalizeParticipantEmails = (input) => {
  if (!Array.isArray(input)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];

  for (const value of input) {
    const email = String(value || '').trim().toLowerCase();
    if (!email || seen.has(email)) {
      continue;
    }

    seen.add(email);
    normalized.push(email);
  }

  return normalized;
};

const normalizeEventPayload = (input) => {
  const payload = {};

  if (Object.prototype.hasOwnProperty.call(input, 'title')) {
    payload.title = input.title.trim();
  }
  if (Object.prototype.hasOwnProperty.call(input, 'description')) {
    payload.description = String(input.description || '').trim();
  }
  if (Object.prototype.hasOwnProperty.call(input, 'startDate')) {
    payload.startDate = normalizeDateString(input.startDate);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'endDate')) {
    payload.endDate = normalizeDateString(input.endDate);
  }

  return payload;
};

const normalizeItineraryPayload = (input) => {
  const payload = {};

  if (Object.prototype.hasOwnProperty.call(input, 'date')) {
    payload.date = normalizeDateString(input.date);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'time')) {
    payload.time = normalizeTimeString(input.time);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'location')) {
    payload.location = String(input.location || '').trim();
  }
  if (Object.prototype.hasOwnProperty.call(input, 'notes')) {
    payload.notes = String(input.notes || '').trim();
  }
  if (Object.prototype.hasOwnProperty.call(input, 'lat')) {
    payload.lat = input.lat === null || input.lat === '' ? null : Number(input.lat);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'lng')) {
    payload.lng = input.lng === null || input.lng === '' ? null : Number(input.lng);
  }

  return payload;
};

const serializeUserSummary = (userDoc) => {
  if (!userDoc) {
    return null;
  }

  return {
    id: String(userDoc._id || userDoc.id),
    username: userDoc.username,
    email: userDoc.email,
    role: userDoc.role === 'admin' ? 'admin' : 'member'
  };
};

const serializeEvent = (eventDoc, options = {}) => {
  const serialized =
    typeof eventDoc?.toJSON === 'function'
      ? eventDoc.toJSON()
      : {
          ...eventDoc,
          id: String(eventDoc._id)
        };

  serialized.startDate = getEventStartDate(serialized);
  serialized.endDate = getEventEndDate(serialized);
  serialized.isLocked = isPastEvent(serialized);

  if (options.owner) {
    serialized.owner = options.owner;
  }

  delete serialized.capacity;
  return serialized;
};

const serializeItineraryItem = (itemDoc) => {
  const serialized =
    typeof itemDoc?.toJSON === 'function'
      ? itemDoc.toJSON()
      : {
          ...itemDoc,
          id: String(itemDoc._id)
        };

  const authorSource =
    itemDoc?.createdBy && typeof itemDoc.createdBy === 'object' && itemDoc.createdBy !== null
      ? itemDoc.createdBy
      : itemDoc?.author && typeof itemDoc.author === 'object'
        ? itemDoc.author
        : null;

  serialized.author = serializeUserSummary(authorSource);
  if (itemDoc.createdBy && typeof itemDoc.createdBy === 'object') {
    serialized.createdBy = String(itemDoc.createdBy._id || itemDoc.createdBy.id);
  } else {
    serialized.createdBy = String(serialized.createdBy);
  }

  return serialized;
};

const getParticipantCountMap = async (eventIds) => {
  if (!Array.isArray(eventIds) || eventIds.length === 0) {
    return new Map();
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
  ]);

  return new Map(rows.map((row) => [String(row._id), row.count]));
};

const getOwnersById = async (events) => {
  const ownerIds = Array.from(
    new Set(
      events
        .map((eventDoc) => String(eventDoc.userId || ''))
        .filter(Boolean)
    )
  );

  if (ownerIds.length === 0) {
    return new Map();
  }

  const owners = await User.find({ _id: { $in: ownerIds } })
    .select('_id username email role')
    .lean();

  return new Map(owners.map((owner) => [String(owner._id), serializeUserSummary(owner)]));
};

const decorateEvents = async (events) => {
  const countMap = await getParticipantCountMap(events.map((eventDoc) => eventDoc._id));
  const ownerMap = await getOwnersById(events);

  return events.map((eventDoc) => {
    const owner = ownerMap.get(String(eventDoc.userId)) || null;
    const serialized = serializeEvent(eventDoc, { owner });

    return {
      ...serialized,
      participantCount: countMap.get(serialized.id) || 0
    };
  });
};

const getParticipantDetailsForEvent = async (eventId) => {
  const rows = await EventParticipant.find({ eventId })
    .populate('userId', 'username email role')
    .sort({ createdAt: 1 });

  const participants = rows
    .filter((row) => row.userId)
    .map((row) => serializeUserSummary(row.userId));

  return {
    participantCount: participants.length,
    participantEmails: participants.map((participant) => participant.email),
    participants
  };
};

const resolveParticipantUsers = async (participantEmails) => {
  const normalizedEmails = normalizeParticipantEmails(participantEmails);

  if (normalizedEmails.length === 0) {
    return {
      users: [],
      missingEmails: [],
      normalizedEmails
    };
  }

  const users = await User.find({ email: { $in: normalizedEmails } }).select(
    '_id username email role'
  );

  const usersByEmail = new Map(
    users.map((userDoc) => [String(userDoc.email).trim().toLowerCase(), userDoc])
  );

  return {
    users,
    normalizedEmails,
    missingEmails: normalizedEmails.filter((email) => !usersByEmail.has(email))
  };
};

const replaceEventParticipants = async (eventId, users, addedBy) => {
  await EventParticipant.deleteMany({ eventId });

  if (!Array.isArray(users) || users.length === 0) {
    return;
  }

  await EventParticipant.insertMany(
    users.map((userDoc) => ({
      eventId,
      userId: userDoc._id,
      addedBy
    }))
  );
};

const buildParticipantEmailError = (missingEmails) =>
  `These participant emails are not registered: ${missingEmails.join(', ')}`;

const getParticipantUserIds = async (eventId) => {
  const rows = await EventParticipant.find({ eventId }).select('userId').lean();
  return Array.from(
    new Set(rows.map((row) => String(row.userId)).filter(Boolean))
  );
};

const createEventNotifications = async ({
  userIds,
  eventId,
  type,
  title,
  message
}) => {
  const uniqueUserIds = Array.from(new Set((userIds || []).map(String))).filter(Boolean);

  if (uniqueUserIds.length === 0) {
    return;
  }

  await Notification.insertMany(
    uniqueUserIds.map((userId) => ({
      userId,
      eventId,
      type,
      title,
      message
    }))
  );
};

const ensureOwnerIncluded = (participantEmails, ownerEmail) => {
  const normalizedOwnerEmail = String(ownerEmail || '').trim().toLowerCase();
  const emails = normalizeParticipantEmails(participantEmails);

  if (!normalizedOwnerEmail) {
    return emails;
  }

  return emails.includes(normalizedOwnerEmail)
    ? emails
    : [normalizedOwnerEmail, ...emails];
};

const requireValidObjectId = (value, label) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    const error = new Error(`Invalid ${label}`);
    error.status = 400;
    throw error;
  }
};

const findEventOrThrow = async (eventId) => {
  requireValidObjectId(eventId, 'event id');

  const eventDoc = await Event.findById(eventId);
  if (!eventDoc) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }

  return eventDoc;
};

const findItineraryItemOrThrow = async (itemId) => {
  requireValidObjectId(itemId, 'itinerary item id');

  const itemDoc = await ItineraryItem.findById(itemId).populate(
    'createdBy',
    'username email role'
  );

  if (!itemDoc) {
    const error = new Error('Itinerary item not found');
    error.status = 404;
    throw error;
  }

  return itemDoc;
};

const userOwnsEvent = (userId, eventDoc) => String(eventDoc.userId) === String(userId);

const userOwnsItineraryItem = (userId, itemDoc) =>
  String(itemDoc.createdBy?._id || itemDoc.createdBy) === String(userId);

const isAdminUser = (req) => req.user.role === 'admin';

const isParticipantForEvent = async (eventId, userId) =>
  Boolean(
    await EventParticipant.exists({
      eventId,
      userId
    })
  );

const canAccessEvent = async (req, eventDoc) => {
  if (isAdminUser(req) || userOwnsEvent(req.user.id, eventDoc)) {
    return true;
  }

  return isParticipantForEvent(eventDoc._id, req.user.id);
};

const canManageEvent = (req, eventDoc) =>
  isAdminUser(req) || userOwnsEvent(req.user.id, eventDoc);

const canCreateItineraryForEvent = async (req, eventDoc) => {
  if (canManageEvent(req, eventDoc)) {
    return true;
  }

  return isParticipantForEvent(eventDoc._id, req.user.id);
};

const canManageItineraryItem = (req, itemDoc) =>
  isAdminUser(req) || userOwnsItineraryItem(req.user.id, itemDoc);

const buildEventPermissions = async (req, eventDoc) => {
  const canEditEvent = canManageEvent(req, eventDoc);
  const canCreateItinerary = await canCreateItineraryForEvent(req, eventDoc);

  return {
    canEditEvent,
    canManageParticipants: canEditEvent,
    canCreateItinerary,
    canManageAllItinerary: isAdminUser(req) || userOwnsEvent(req.user.id, eventDoc)
  };
};

const assertUnlockedEvent = (eventDoc) => {
  if (!isPastEvent(eventDoc)) {
    return;
  }

  const error = new Error('Past events are locked and can no longer be edited or deleted.');
  error.status = 403;
  throw error;
};

const assertEventDateWithinRange = (eventDoc, dateValue) => {
  const startDate = getEventStartDate(eventDoc);
  const endDate = getEventEndDate(eventDoc);

  if (!dateValue || !startDate || !endDate) {
    return;
  }

  if (dateValue < startDate || dateValue > endDate) {
    const error = new Error('Itinerary date must be within the event date range.');
    error.status = 400;
    throw error;
  }
};

const handleRouteError = (error, res) => {
  if (error?.status) {
    return res.status(error.status).json({ error: error.message });
  }

  return res.status(500).json({ error: error.message });
};

router.get('/', listValidators, async (req, res) => {
  if (sendValidationErrors(req, res)) {
    return;
  }

  const scope = typeof req.query.scope === 'string' ? req.query.scope : null;
  const normalizedScope = scope || (isAdminUser(req) ? 'all' : 'joined');

  try {
    let events = [];

    if (isAdminUser(req) && normalizedScope === 'all') {
      events = await Event.find({}).sort({ startDate: 1, endDate: 1, createdAt: -1 });
      return res.json(await decorateEvents(events));
    }

    if (normalizedScope === 'created') {
      events = await Event.find({ userId: req.user.id }).sort({
        startDate: 1,
        endDate: 1,
        createdAt: -1
      });
      return res.json(await decorateEvents(events));
    }

    const relationships = await EventParticipant.find({ userId: req.user.id }).select('eventId');
    const joinedEventIds = relationships.map((item) => item.eventId);

    if (normalizedScope === 'joined') {
      if (joinedEventIds.length === 0) {
        return res.json([]);
      }

      const match = isAdminUser(req)
        ? { _id: { $in: joinedEventIds } }
        : { _id: { $in: joinedEventIds }, userId: { $ne: req.user.id } };

      events = await Event.find(match).sort({ startDate: 1, endDate: 1, createdAt: -1 });
      return res.json(await decorateEvents(events));
    }

    const filters = [
      { userId: req.user.id }
    ];

    if (joinedEventIds.length > 0) {
      filters.push({ _id: { $in: joinedEventIds } });
    }

    events = await Event.find({ $or: filters }).sort({
      startDate: 1,
      endDate: 1,
      createdAt: -1
    });

    return res.json(await decorateEvents(events));
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.get('/recommended', async (req, res) => {
  if (isAdminUser(req)) {
    return res.json([]);
  }

  try {
    const relationships = await EventParticipant.find({ userId: req.user.id }).select('eventId');
    const joinedEventIds = relationships.map((item) => item.eventId);
    const events = await Event.find({
      _id: { $nin: joinedEventIds },
      userId: { $ne: req.user.id }
    }).sort({ startDate: 1, endDate: 1, createdAt: -1 });

    const upcomingEvents = events.filter((eventDoc) => !isPastEvent(eventDoc));
    const decorated = await decorateEvents(upcomingEvents);
    return res.json(sortRecommendedEvents(decorated));
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const eventDoc = await findEventOrThrow(req.params.id);
    const hasAccess = await canAccessEvent(req, eventDoc);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const [participantDetails, itineraryItems, owner, permissions] = await Promise.all([
      getParticipantDetailsForEvent(eventDoc._id),
      ItineraryItem.find({ eventId: eventDoc._id })
        .populate('createdBy', 'username email role')
        .sort({ date: 1, time: 1, createdAt: 1 }),
      User.findById(eventDoc.userId).select('_id username email role'),
      buildEventPermissions(req, eventDoc)
    ]);

    return res.json({
      ...serializeEvent(eventDoc, { owner: serializeUserSummary(owner) }),
      ...participantDetails,
      permissions,
      itineraryItems: itineraryItems.map(serializeItineraryItem)
    });
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.post('/', createValidators, async (req, res) => {
  if (sendValidationErrors(req, res)) {
    return;
  }

  try {
    const payload = normalizeEventPayload(req.body);
    if (!isValidDateRange(payload.startDate, payload.endDate)) {
      return res.status(400).json({
        error: 'Start date must be earlier than or equal to end date.'
      });
    }

    const owner = await User.findById(req.user.id).select('_id username email role');
    const desiredParticipantEmails = ensureOwnerIncluded(
      req.body.participantEmails,
      owner?.email
    );
    const participantResolution = await resolveParticipantUsers(desiredParticipantEmails);

    if (participantResolution.missingEmails.length > 0) {
      return res.status(400).json({
        error: buildParticipantEmailError(participantResolution.missingEmails)
      });
    }

    payload.userId = req.user.id;
    const created = await Event.create(payload);

    try {
      await replaceEventParticipants(created._id, participantResolution.users, req.user.id);
    } catch (error) {
      await Event.findByIdAndDelete(created._id);
      throw error;
    }

    return res.status(201).json({
      ...serializeEvent(created, { owner: serializeUserSummary(owner) }),
      participantCount: participantResolution.users.length,
      participantEmails: participantResolution.normalizedEmails,
      participants: participantResolution.users.map(serializeUserSummary),
      permissions: {
        canEditEvent: true,
        canManageParticipants: true,
        canCreateItinerary: true,
        canManageAllItinerary: true
      },
      itineraryItems: []
    });
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.put('/:id', eventValidators, async (req, res) => {
  if (sendValidationErrors(req, res)) {
    return;
  }

  try {
    const existing = await findEventOrThrow(req.params.id);
    if (!canManageEvent(req, existing)) {
      return res.status(403).json({ error: 'You do not have permission to edit this event.' });
    }

    assertUnlockedEvent(existing);
    const previousParticipantUserIds = await getParticipantUserIds(existing._id);

    const payload = normalizeEventPayload(req.body);
    const nextStartDate = payload.startDate || getEventStartDate(existing);
    const nextEndDate = payload.endDate || getEventEndDate(existing);

    if (!isValidDateRange(nextStartDate, nextEndDate)) {
      return res.status(400).json({
        error: 'Start date must be earlier than or equal to end date.'
      });
    }

    const owner = await User.findById(existing.userId).select('_id username email role');
    const participantDetails = await getParticipantDetailsForEvent(existing._id);
    const requestedParticipantEmails = Object.prototype.hasOwnProperty.call(
      req.body,
      'participantEmails'
    )
      ? req.body.participantEmails
      : participantDetails.participantEmails;
    const desiredParticipantEmails = ensureOwnerIncluded(
      requestedParticipantEmails,
      owner?.email
    );

    const participantResolution = await resolveParticipantUsers(desiredParticipantEmails);
    if (participantResolution.missingEmails.length > 0) {
      return res.status(400).json({
        error: buildParticipantEmailError(participantResolution.missingEmails)
      });
    }

    existing.set(payload);
    const updated = await existing.save();

    await replaceEventParticipants(updated._id, participantResolution.users, req.user.id);
    const nextParticipantUserIds = participantResolution.users.map((userDoc) => String(userDoc._id));
    const notificationUserIds = Array.from(
      new Set([...previousParticipantUserIds, ...nextParticipantUserIds])
    ).filter((userId) => userId !== String(req.user.id));

    await createEventNotifications({
      userIds: notificationUserIds,
      eventId: updated._id,
      type: 'event-updated',
      title: 'Event updated',
      message: `"${updated.title}" has been updated. Open the event to review the latest details.`
    });

    const itineraryItems = await ItineraryItem.find({ eventId: updated._id })
      .populate('createdBy', 'username email role')
      .sort({ date: 1, time: 1, createdAt: 1 });

    return res.json({
      ...serializeEvent(updated, { owner: serializeUserSummary(owner) }),
      participantCount: participantResolution.users.length,
      participantEmails: participantResolution.normalizedEmails,
      participants: participantResolution.users.map(serializeUserSummary),
      permissions: {
        canEditEvent: true,
        canManageParticipants: true,
        canCreateItinerary: true,
        canManageAllItinerary: true
      },
      itineraryItems: itineraryItems.map(serializeItineraryItem)
    });
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.post('/:id/join', async (req, res) => {
  if (isAdminUser(req)) {
    return res.status(403).json({ error: ADMIN_JOIN_FORBIDDEN_ERROR });
  }

  try {
    const eventDoc = await findEventOrThrow(req.params.id);
    assertUnlockedEvent(eventDoc);

    const existingParticipant = await EventParticipant.exists({
      eventId: eventDoc._id,
      userId: req.user.id
    });
    if (existingParticipant) {
      return res.status(409).json({ error: ALREADY_JOINED_ERROR });
    }

    await EventParticipant.create({
      eventId: eventDoc._id,
      userId: req.user.id,
      addedBy: req.user.id
    });

    const participantCount = await EventParticipant.countDocuments({ eventId: eventDoc._id });
    return res.status(201).json({
      message: 'Joined event successfully.',
      participantCount
    });
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.delete('/:id/join', async (req, res) => {
  if (isAdminUser(req)) {
    return res.status(403).json({ error: ADMIN_JOIN_FORBIDDEN_ERROR });
  }

  try {
    const eventDoc = await findEventOrThrow(req.params.id);
    assertUnlockedEvent(eventDoc);

    if (userOwnsEvent(req.user.id, eventDoc)) {
      return res.status(400).json({ error: OWNER_LEAVE_FORBIDDEN_ERROR });
    }

    const relationship = await EventParticipant.findOne({
      eventId: eventDoc._id,
      userId: req.user.id
    });

    if (!relationship) {
      return res.status(404).json({ error: NOT_JOINED_ERROR });
    }

    await relationship.deleteOne();

    const participantCount = await EventParticipant.countDocuments({ eventId: eventDoc._id });
    return res.json({
      message: 'Left event successfully.',
      participantCount
    });
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await findEventOrThrow(req.params.id);
    if (!canManageEvent(req, existing)) {
      return res.status(403).json({ error: 'You do not have permission to delete this event.' });
    }

    assertUnlockedEvent(existing);
    const participantUserIds = await getParticipantUserIds(existing._id);

    await Promise.all([
      EventParticipant.deleteMany({ eventId: existing._id }),
      ItineraryItem.deleteMany({ eventId: existing._id })
    ]);

    await existing.deleteOne();
    await createEventNotifications({
      userIds: participantUserIds.filter((userId) => userId !== String(req.user.id)),
      eventId: existing._id,
      type: 'event-cancelled',
      title: 'Event cancelled',
      message: `"${existing.title}" has been cancelled by the organizer.`
    });

    return res.json({ message: 'Event deleted' });
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.post('/:id/itinerary-items', itineraryCreateValidators, async (req, res) => {
  if (sendValidationErrors(req, res)) {
    return;
  }

  try {
    const eventDoc = await findEventOrThrow(req.params.id);
    const canCreate = await canCreateItineraryForEvent(req, eventDoc);
    if (!canCreate) {
      return res.status(403).json({ error: 'You do not have permission to add itinerary items.' });
    }

    assertUnlockedEvent(eventDoc);

    const payload = normalizeItineraryPayload(req.body);
    assertEventDateWithinRange(eventDoc, payload.date);

    const created = await ItineraryItem.create({
      ...payload,
      eventId: eventDoc._id,
      createdBy: req.user.id
    });

    const populated = await ItineraryItem.findById(created._id).populate(
      'createdBy',
      'username email role'
    );

    return res.status(201).json(serializeItineraryItem(populated));
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.put('/:id/itinerary-items/:itemId', itineraryUpdateValidators, async (req, res) => {
  if (sendValidationErrors(req, res)) {
    return;
  }

  try {
    const eventDoc = await findEventOrThrow(req.params.id);
    const itemDoc = await findItineraryItemOrThrow(req.params.itemId);

    if (String(itemDoc.eventId) !== String(eventDoc._id)) {
      return res.status(404).json({ error: 'Itinerary item not found' });
    }

    if (!canManageItineraryItem(req, itemDoc)) {
      return res.status(403).json({ error: 'You do not have permission to edit this itinerary item.' });
    }

    assertUnlockedEvent(eventDoc);

    const payload = normalizeItineraryPayload(req.body);
    const nextDate = payload.date || itemDoc.date;
    assertEventDateWithinRange(eventDoc, nextDate);

    itemDoc.set(payload);
    await itemDoc.save();
    await itemDoc.populate('createdBy', 'username email role');

    return res.json(serializeItineraryItem(itemDoc));
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.delete('/:id/itinerary-items/:itemId', async (req, res) => {
  try {
    const eventDoc = await findEventOrThrow(req.params.id);
    const itemDoc = await findItineraryItemOrThrow(req.params.itemId);

    if (String(itemDoc.eventId) !== String(eventDoc._id)) {
      return res.status(404).json({ error: 'Itinerary item not found' });
    }

    if (!canManageItineraryItem(req, itemDoc)) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to delete this itinerary item.' });
    }

    assertUnlockedEvent(eventDoc);

    await itemDoc.deleteOne();
    return res.json({ message: 'Itinerary item deleted' });
  } catch (error) {
    return handleRouteError(error, res);
  }
});

module.exports = router;
