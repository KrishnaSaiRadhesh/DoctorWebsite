require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const authMiddleware = require('./middleware/auth');
const connectDB = require('./config/db');

const app = express();


app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(fileUpload());

app.use('/auth', require('./routes/authRoute'));
app.use('/submissions', authMiddleware, require('./routes/submissionsRoute')); 
app.use('/admin', authMiddleware, require('./routes/adminRoute'));

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));