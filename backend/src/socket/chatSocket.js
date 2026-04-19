// backend/socket/chatSocket.js
const {Message} = require('../models/message.model');
const {Conversation} = require('../models/conversation.model');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join personal room for global notifications
    socket.on('join_user_room', (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined their personal notification room`);
    });

    // Room join karo (conversationId ke basis pe)
    socket.on('join_room', (conversationId) => {
      socket.join(conversationId);
    });

    // Message bhejo
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, senderId, senderRole, text } = data;

        const message = await Message.create({
          conversationId, senderId, senderRole, text
        });

        // Conversation ka lastMessage update karo
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: text,
          updatedAt: Date.now()
        });

        // Conversation find karo recipient nikalne ke liye
        const convo = await Conversation.findById(conversationId);
        if (convo) {
          const recipientId = senderRole === 'sponsor' ? convo.organizerId : convo.sponsorId;
          // Global notification bhejo recipient ko
          io.to(recipientId.toString()).emit('new_notification', {
            conversationId,
            eventId: convo.eventId,
            text
          });
        }

        // Dono users ko message milega (in-chat)
        io.to(conversationId).emit('receive_message', message);
      } catch (err) {
        console.error("Socket error processing send_message:", err);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};