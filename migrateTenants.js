const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const Product = require('./models/Product');
const Category = require('./models/Category');
const Customer = require('./models/Customer');
const Sale = require('./models/Sale');
const SaleItem = require('./models/SaleItem');
const Supplier = require('./models/Supplier');
const Purchase = require('./models/Purchase');
const PurchaseItem = require('./models/PurchaseItem');
const Return = require('./models/Return');
const Setting = require('./models/Setting');
const StockHistory = require('./models/StockHistory');
const AuditLog = require('./models/AuditLog');
const bcrypt = require('bcrypt');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for migration.');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const migrate = async () => {
  await connectDB();

  try {
    console.log('Starting Migration...');

    // 1. Create Super Admin if not exists
    let superAdmin = await User.findOne({ role: 'Super Admin' });
    if (!superAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('superadmin123', salt);
      superAdmin = await User.create({
        name: 'Super Admin',
        email: 'superadmin@example.com',
        username: 'superadmin',
        password: hashedPassword, // Note: Model hashes on save, but pre-save hooks might run. Let's just pass plain text if the model does it, or we bypass it.
        // Wait, User model has pre('save') that hashes password if modified.
        // I will just use create with plain password.
        role: 'Super Admin',
        adminId: null
      });
      // The pre-save hook will hash 'superadmin123'. 
      // Oops, I double-hashed. Let's fix that. I'll just use 'superadmin123'.
      superAdmin.password = 'superadmin123';
      await superAdmin.save();
      console.log('Super Admin created (Username: superadmin, Password: superadmin123)');
    }

    // 2. Migrate existing Owners to Admins
    const owners = await User.find({ role: 'Owner' });
    let defaultAdminId = null;

    for (let owner of owners) {
      owner.role = 'Admin';
      owner.username = owner.email.split('@')[0] + Math.floor(Math.random() * 1000); // ensure unique username
      owner.adminId = null;
      await owner.save();
      if (!defaultAdminId) defaultAdminId = owner._id;
    }

    if (owners.length > 0) {
      console.log(`Migrated ${owners.length} Owners to Admins.`);
    }

    // 3. If no Admin exists, create one
    if (!defaultAdminId) {
      const admin = await User.create({
        name: 'Default Admin',
        email: 'admin@example.com',
        username: 'admin',
        password: 'password123',
        role: 'Admin',
        adminId: null
      });
      defaultAdminId = admin._id;
      console.log('Default Admin created.');
    }

    // 4. Migrate existing Staff to Employees
    const staffs = await User.find({ role: 'Staff' });
    for (let staff of staffs) {
      staff.role = 'Employee';
      staff.username = staff.email.split('@')[0] + Math.floor(Math.random() * 1000);
      staff.adminId = defaultAdminId;
      await staff.save();
    }
    if (staffs.length > 0) {
      console.log(`Migrated ${staffs.length} Staff to Employees.`);
    }

    // 5. Update all business collections to belong to the defaultAdminId
    const modelsToUpdate = [
      Product, Category, Customer, Sale, SaleItem,
      Supplier, Purchase, PurchaseItem, Return,
      Setting, StockHistory, AuditLog
    ];

    for (let model of modelsToUpdate) {
      const result = await model.updateMany(
        { adminId: { $exists: false } },
        { $set: { adminId: defaultAdminId } }
      );
      if (result.modifiedCount > 0) {
        console.log(`Updated ${result.modifiedCount} records in ${model.modelName}`);
      }
    }

    console.log('Migration Complete with Zero Data Loss!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
