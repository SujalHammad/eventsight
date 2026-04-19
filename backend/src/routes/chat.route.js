// backend/routes/chat.route.js
const router = require('express').Router();
const {Message} = require('../models/message.model');
const {Conversation} = require('../models/conversation.model');

// Conversation start karo ya dhundo
router.post('/conversation', async (req, res) => {
  try {
    const { organizerId, sponsorId, eventId } = req.body;
    if (!organizerId || !sponsorId || !eventId) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    let convo = await Conversation.findOne({ organizerId, sponsorId, eventId });
    if (!convo) {
      convo = await Conversation.create({ organizerId, sponsorId, eventId });
    }
    res.json(convo);
  } catch (err) {
    res.status(500).json({ error: "Failed to initialize conversation" });
  }
});

// Purane messages load karo
router.get('/messages/:conversationId', async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to load messages" });
  }
});

// Get conversations for an event
router.get('/event/:eventId', async (req, res) => {
  try {
    const convos = await Conversation.find({ eventId: req.params.eventId }).populate('sponsorId', 'username email').sort({ updatedAt: -1 });
    res.json(convos);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

const chatRoute = router;
module.exports = {chatRoute};