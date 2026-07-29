const User = require('../models/User');

const setupSuperAdmin = async () => {
  try {
    const username = process.env.SUPER_ADMIN_USERNAME || 'superadmin';
    const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@example.com';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'superadmin123';

    let superAdmin = await User.findOne({ role: 'Super Admin' });
    
    if (!superAdmin) {
      superAdmin = await User.create({
        name: 'Super Admin',
        username,
        email,
        password,
        role: 'Super Admin',
        adminId: null
      });
      console.log(`Super Admin created successfully from .env: ${username}`);
    } else {
      // Check if username or email needs updating
      let updated = false;
      if (superAdmin.username !== username) {
        superAdmin.username = username;
        updated = true;
      }
      if (superAdmin.email !== email) {
        superAdmin.email = email;
        updated = true;
      }
      
      // Update password if it doesn't match
      // Note: If you want .env to override password on every restart, uncomment below.
      // But typically, we just want to create it if it doesn't exist.
      // superAdmin.password = password;
      // updated = true;
      
      if (updated) {
        await superAdmin.save();
        console.log(`Super Admin updated from .env: ${username}`);
      }
    }
  } catch (error) {
    console.error('Failed to setup Super Admin:', error.message);
  }
};

module.exports = setupSuperAdmin;
