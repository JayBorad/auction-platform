const connectDB = require('../lib/db');
const SystemSettings = require('../models/SystemSettings');

const seedSystemSettings = async () => {
  try {
    await connectDB();

    // Check if settings already exist
    const existingSettings = await SystemSettings.findOne();

    if (existingSettings) {
      console.log('System settings already exist, skipping seed');
      return { success: true, message: 'System settings already exist' };
    }

    // Create default settings
    const defaultSettings = new SystemSettings({
      supportEmail: "support@cricketauction.com",
      supportPhone: "+91-9876543210",
      website: "https://cricketauction.com",
      address: "Mumbai, Maharashtra, India",
    });

    await defaultSettings.save();

    console.log('System settings seeded successfully');
    return { success: true, message: 'System settings seeded successfully' };

  } catch (error) {
    console.error('Error seeding system settings:', error);
    return { success: false, message: error.message };
  }
};

module.exports = { seedSystemSettings };
