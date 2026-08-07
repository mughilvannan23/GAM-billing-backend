const Quotation = require('../models/Quotation');

// @desc    Get all quotations
// @route   GET /api/quotations
// @access  Private
const getQuotations = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'Super Admin') {
      query.adminId = req.adminId;
    }
    const quotations = await Quotation.find(query).sort({ createdAt: -1 });
    res.json(quotations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get quotation by ID
// @route   GET /api/quotations/:id
// @access  Private
const getQuotationById = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (quotation) {
      res.json(quotation);
    } else {
      res.status(404).json({ message: 'Quotation not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new quotation
// @route   POST /api/quotations
// @access  Private
const createQuotation = async (req, res) => {
  try {
    const quotationData = {
      ...req.body,
      adminId: req.adminId || req.user._id
    };
    
    // Auto-generate quotation/document number if not provided
    if (!quotationData.quotationNumber) {
      const format = quotationData.formatType || 'QUOTATION';
      const count = await Quotation.countDocuments({ adminId: quotationData.adminId, formatType: format });
      const year = new Date().getFullYear();
      const numStr = (count + 1).toString().padStart(3, '0');

      if (format === 'TAX_INVOICE') {
        quotationData.quotationNumber = `SMAA/INV/${numStr}/${year.toString().slice(-2)}-${(year + 1).toString().slice(-2)}`;
      } else if (format === 'PURCHASE_ORDER') {
        quotationData.quotationNumber = `SMAA/PO/${numStr}`;
      } else if (format === 'RECEIPT_VOUCHER') {
        quotationData.quotationNumber = `GCR${numStr}`;
      } else if (format === 'PROJECT_PROPOSAL') {
        quotationData.quotationNumber = `SMAA/PROP/${year}/${numStr}`;
      } else {
        quotationData.quotationNumber = `SMAA/QUOT/${year}/${numStr}`;
      }
    }

    const quotation = new Quotation(quotationData);
    const savedQuotation = await quotation.save();
    res.status(201).json(savedQuotation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update quotation
// @route   PUT /api/quotations/:id
// @access  Private
const updateQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);

    if (quotation) {
      Object.assign(quotation, req.body);
      const updatedQuotation = await quotation.save();
      res.json(updatedQuotation);
    } else {
      res.status(404).json({ message: 'Quotation not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete quotation
// @route   DELETE /api/quotations/:id
// @access  Private
const deleteQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);

    if (quotation) {
      await quotation.deleteOne();
      res.json({ message: 'Quotation removed successfully' });
    } else {
      res.status(404).json({ message: 'Quotation not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation
};
