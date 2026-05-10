const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true, unique: true },
    role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
    telegramSession: { type: String, default: null }, // GramJS Session သိမ်းရန်
    name: { type: String, default: 'Staff' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
