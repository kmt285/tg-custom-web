require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path'); // 🌟 path ကို အသစ်ခေါ်ထားတယ်
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const chatRoutes = require('./src/routes/chatRoutes'); // 🌟 အသစ်ထည့်သည်

const app = express();

app.use(express.json());
app.use(cors());

connectDB();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes); // 🌟 အသစ်ထည့်သည်


// 🌟 အသစ်ထည့်ရမည့် အပိုင်း (Frontend ကို Render ကနေ တိုက်ရိုက်ပြရန်)
// သင့် project ထဲမှာ 'frontend' ဆိုတဲ့ ဖိုဒါရှိရပါမယ်
app.use(express.static(path.join(__dirname, 'frontend')));

// ဘယ်လင့်ခ်ကိုပဲ နှိပ်နှိပ် frontend ထဲက index.html ကိုပဲ ပြပေးမယ်
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
