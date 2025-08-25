const app = require('./app');
const mongoose = require('mongoose'); // Import mongoose
const env = require('./config/env'); // Import env for MONGODB_URI
require('dotenv').config();

const PORT = process.env.PORT || 5000; // Use 5000 as default if PORT is not set

// Connect to MongoDB
mongoose.connect(env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ MongoDB Connected...');
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});
