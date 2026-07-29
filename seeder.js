const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Product = require('./models/Product');
const Category = require('./models/Category');
const Setting = require('./models/Setting');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const importData = async () => {
  try {
    await User.deleteMany();
    await Product.deleteMany();
    await Category.deleteMany();
    await Setting.deleteMany();

    const createdUsers = await User.create([
      {
        name: 'Admin Owner',
        email: 'admin@example.com',
        password: 'password123',
        role: 'Owner'
      },
      {
        name: 'Staff Member',
        email: 'staff@example.com',
        password: 'password123',
        role: 'Staff'
      }
    ]);

    const createdCategory = await Category.create({ name: 'Engine Oil' });

    await Product.create({
      name: 'Castrol Magnatec 10W-40',
      productCode: 'OIL-001',
      category: createdCategory._id,
      purchasePrice: 1200,
      sellingPrice: 1500,
      currentStock: 20,
      minimumStock: 5,
      unit: 'Liters'
    });

    await Setting.create({ companyName: 'AutoParts Pro', phone: '9876543210' });

    console.log('Data Imported!');
    process.exit();
  } catch (error) {
    console.error(`${error}`);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await User.deleteMany();
    await Product.deleteMany();
    await Category.deleteMany();
    await Setting.deleteMany();

    console.log('Data Destroyed!');
    process.exit();
  } catch (error) {
    console.error(`${error}`);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}
