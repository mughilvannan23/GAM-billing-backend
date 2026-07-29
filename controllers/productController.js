const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');

// @desc    Get all products
// @route   GET /api/products
// @access  Private/Admin
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({ adminId: req.adminId }).populate('category').populate('supplier');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Private
const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, adminId: req.adminId }).populate('category').populate('supplier');
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  try {
    const product = new Product({ ...req.body, adminId: req.adminId });
    const createdProduct = await product.save();

    await AuditLog.create({
      adminId: req.adminId,
      action: 'Product Created',
      module: 'Product',
      newValue: createdProduct,
      user: req.user._id,
      ipAddress: req.ip
    });

    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, adminId: req.adminId });

    if (product) {
      const oldProduct = { ...product.toObject() };
      
      Object.assign(product, req.body);
      const updatedProduct = await product.save();

      await AuditLog.create({
        adminId: req.adminId,
        action: 'Product Updated',
        module: 'Product',
        oldValue: oldProduct,
        newValue: updatedProduct,
        user: req.user._id,
        ipAddress: req.ip
      });

      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, adminId: req.adminId });

    if (product) {
      const oldProduct = { ...product.toObject() };
      await Product.deleteOne({ _id: req.params.id, adminId: req.adminId });

      await AuditLog.create({
        adminId: req.adminId,
        action: 'Product Status Changed',
        module: 'Product',
        oldValue: oldProduct,
        user: req.user._id,
        ipAddress: req.ip
      });

      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
