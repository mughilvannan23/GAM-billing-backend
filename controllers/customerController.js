const Customer = require('../models/Customer');

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({ adminId: req.adminId });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a customer
// @route   POST /api/customers
// @access  Private
const createCustomer = async (req, res) => {
  try {
    const customer = new Customer({ ...req.body, adminId: req.adminId });
    const createdCustomer = await customer.save();
    res.status(201).json(createdCustomer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a customer
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, adminId: req.adminId });

    if (customer) {
      Object.assign(customer, req.body);
      const updatedCustomer = await customer.save();
      res.json(updatedCustomer);
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a customer
// @route   DELETE /api/customers/:id
// @access  Private/Admin
const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, adminId: req.adminId });

    if (customer) {
      await Customer.deleteOne({ _id: req.params.id, adminId: req.adminId });
      res.json({ message: 'Customer removed' });
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get customer profile with analytics
// @route   GET /api/customers/:id
// @access  Private
const getCustomerProfile = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, adminId: req.adminId });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const Sale = require('../models/Sale');
    const sales = await Sale.find({ customer: req.params.id, adminId: req.adminId }).sort({ saleDate: -1 });

    let totalPurchases = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let pendingBills = 0;

    sales.forEach(sale => {
      totalPurchases += sale.grandTotal;
      totalPaid += sale.amountPaid;
      totalPending += sale.pendingAmount;
      if (sale.pendingAmount > 0) pendingBills++;
    });

    res.json({
      customer,
      analytics: {
        totalPurchases,
        totalPaid,
        totalPending,
        pendingBills
      },
      sales
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerProfile
};
