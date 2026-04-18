const mongoose = require('mongoose');
const { User } = require('./backend/src/models/user.model.js');
const bcrypt = require('bcryptjs');

async function fix() {
  await mongoose.connect('mongodb://localhost:27017/eventSight');
  const hashed = await bcrypt.hash('123', 10);
  await User.updateOne({ username: 'rishabh' }, { $set: { password: hashed, role: 'organizer' } });
  console.log('Fixed rishabh password to 123');
  process.exit(0);
}
fix();
