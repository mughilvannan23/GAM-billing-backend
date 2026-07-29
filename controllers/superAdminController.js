const User = require('../models/User');
const bcrypt = require('bcrypt');

// @desc    Get all Admins
// @route   GET /api/superadmin/admins
// @access  Private/Super Admin
const getAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: 'Admin' }).select('-password');
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new Admin
// @route   POST /api/superadmin/admins
// @access  Private/Super Admin
const createAdmin = async (req, res) => {
  const { name, email, username, password } = req.body;

  try {
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'User with email or username already exists' });
    }

    const admin = await User.create({
      name,
      email,
      username,
      password,
      role: 'Admin',
      adminId: null
    });

    res.status(201).json({
      _id: admin._id,
      name: admin.name,
      username: admin.username,
      email: admin.email,
      role: admin.role,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Admin
// @route   PUT /api/superadmin/admins/:id
// @access  Private/Super Admin
const updateAdmin = async (req, res) => {
  try {
    const admin = await User.findById(req.params.id);

    if (admin && admin.role === 'Admin') {
      admin.name = req.body.name || admin.name;
      admin.email = req.body.email || admin.email;
      admin.username = req.body.username || admin.username;
      
      if (req.body.password) {
        admin.password = req.body.password;
      }
      
      if (req.body.status !== undefined) {
        admin.status = req.body.status;
      }

      const updatedAdmin = await admin.save();
      res.json({
        _id: updatedAdmin._id,
        name: updatedAdmin.name,
        username: updatedAdmin.username,
        email: updatedAdmin.email,
        status: updatedAdmin.status
      });
    } else {
      res.status(404).json({ message: 'Admin not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete Admin (Soft Delete by setting status to false)
// @route   DELETE /api/superadmin/admins/:id
// @access  Private/Super Admin
const deleteAdmin = async (req, res) => {
  try {
    const admin = await User.findById(req.params.id);
    if (admin && admin.role === 'Admin') {
      admin.status = false;
      await admin.save();
      res.json({ message: 'Admin deactivated (soft deleted)' });
    } else {
      res.status(404).json({ message: 'Admin not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAdmins, createAdmin, updateAdmin, deleteAdmin };
