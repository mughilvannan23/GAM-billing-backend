const Supplier = require('../models/Supplier');

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private
const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ adminId: req.adminId });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a supplier
// @route   POST /api/suppliers
// @access  Private/Admin
const createSupplier = async (req, res) => {
  try {
    const supplier = new Supplier({ ...req.body, adminId: req.adminId });
    const createdSupplier = await supplier.save();
    res.status(201).json(createdSupplier);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a supplier
// @route   PUT /api/suppliers/:id
// @access  Private/Admin
const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, adminId: req.adminId });

    if (supplier) {
      Object.assign(supplier, req.body);
      const updatedSupplier = await supplier.save();
      res.json(updatedSupplier);
    } else {
      res.status(404).json({ message: 'Supplier not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a supplier
// @route   DELETE /api/suppliers/:id
// @access  Private/Admin
const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, adminId: req.adminId });

    if (supplier) {
      await Supplier.deleteOne({ _id: req.params.id, adminId: req.adminId });
      res.json({ message: 'Supplier removed' });
    } else {
      res.status(404).json({ message: 'Supplier not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
