const User = require('../models/User');

// @desc    Get all Employees for current Admin
// @route   GET /api/admin/employees
// @access  Private/Admin
const getEmployees = async (req, res) => {
  try {
    const employees = await User.find({ role: 'Employee', adminId: req.adminId }).select('-password');
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new Employee
// @route   POST /api/admin/employees
// @access  Private/Admin
const createEmployee = async (req, res) => {
  const { name, email, username, password } = req.body;

  try {
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'User with email or username already exists' });
    }

    const employee = await User.create({
      name,
      email,
      username,
      password,
      role: 'Employee',
      adminId: req.adminId
    });

    res.status(201).json({
      _id: employee._id,
      name: employee.name,
      username: employee.username,
      email: employee.email,
      role: employee.role,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Employee
// @route   PUT /api/admin/employees/:id
// @access  Private/Admin
const updateEmployee = async (req, res) => {
  try {
    const employee = await User.findOne({ _id: req.params.id, adminId: req.adminId });

    if (employee && employee.role === 'Employee') {
      employee.name = req.body.name || employee.name;
      employee.email = req.body.email || employee.email;
      employee.username = req.body.username || employee.username;
      
      if (req.body.password) {
        employee.password = req.body.password;
      }
      
      if (req.body.status !== undefined) {
        employee.status = req.body.status;
      }

      const updatedEmployee = await employee.save();
      res.json({
        _id: updatedEmployee._id,
        name: updatedEmployee.name,
        username: updatedEmployee.username,
        email: updatedEmployee.email,
        status: updatedEmployee.status
      });
    } else {
      res.status(404).json({ message: 'Employee not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete Employee (Soft Delete)
// @route   DELETE /api/admin/employees/:id
// @access  Private/Admin
const deleteEmployee = async (req, res) => {
  try {
    const employee = await User.findOne({ _id: req.params.id, adminId: req.adminId });
    if (employee && employee.role === 'Employee') {
      employee.status = false;
      await employee.save();
      res.json({ message: 'Employee deactivated (soft deleted)' });
    } else {
      res.status(404).json({ message: 'Employee not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getEmployees, createEmployee, updateEmployee, deleteEmployee };
