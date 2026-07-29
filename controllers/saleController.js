const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const StockHistory = require('../models/StockHistory');
const AuditLog = require('../models/AuditLog');

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private
const getSales = async (req, res) => {
  try {
    let matchQuery = { adminId: req.adminId };
    const sales = await Sale.find(matchQuery).populate('customer').populate('createdBy', 'name');
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get sale by ID
// @route   GET /api/sales/:id
// @access  Private
const getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, adminId: req.adminId }).populate('customer').populate('createdBy', 'name');
    if (sale) {
      const items = await SaleItem.find({ sale: sale._id }).populate('product');
      res.json({ sale, items });
    } else {
      res.status(404).json({ message: 'Sale not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get sales reports with items (backward compatible)
// @route   GET /api/sales/reports
// @access  Private
const getSalesReports = async (req, res) => {
  try {
    const { paymentStatus, paymentMethod } = req.query;
    let matchQuery = { adminId: req.adminId };

    if (paymentStatus && paymentStatus !== 'All') {
      matchQuery.paymentStatus = paymentStatus;
    }

    if (paymentMethod && paymentMethod !== 'All') {
      matchQuery.$or = [
        { paymentType: paymentMethod },
        { paymentMethod: paymentMethod }
      ];
    }

    const sales = await Sale.find(matchQuery)
      .populate('customer')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    const reports = await Promise.all(sales.map(async (sale) => {
      const items = await SaleItem.find({ sale: sale._id }).populate('product', 'name hsnCode');
      const saleObj = sale.toObject();

      // Backward compatibility: if old sale has no payments array, synthesize one
      if (!saleObj.payments || saleObj.payments.length === 0) {
        saleObj.payments = [{
          method: saleObj.paymentMethod || 'Cash',
          amount: saleObj.amountPaid || saleObj.grandTotal,
          status: saleObj.paymentStatus || 'Paid'
        }];
        saleObj.paymentType = saleObj.paymentMethod || 'Cash';
        saleObj.pendingAmount = saleObj.grandTotal - (saleObj.amountPaid || saleObj.grandTotal);
      }

      // Calculate profit for the sale (excluding GST, including discount)
      let profit = 0;
      items.forEach(item => {
        profit += (item.sellingPrice * item.quantity - item.discount) - (item.purchasePrice * item.quantity);
      });
      
      // Subtract global invoice discount as well
      profit -= (saleObj.discountTotal || 0);

      return {
        ...saleObj,
        items,
        profit
      };
    }));

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get payment summary / aggregation
// @route   GET /api/sales/payment-summary
// @access  Private
const getPaymentSummary = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const matchStage = { adminId: req.adminId };

    if (dateFrom && dateTo) {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      matchStage.saleDate = { $gte: from, $lte: to };
    }

    const sales = await Sale.find(matchStage);

    const summary = {
      totalCash: 0,
      totalGPay: 0,
      totalPhonePe: 0,
      totalPaytm: 0,
      totalUPI: 0,
      totalCreditCard: 0,
      totalDebitCard: 0,
      totalBankTransfer: 0,
      totalPending: 0,
      totalSplitPayments: 0,
      totalCollection: 0
    };

    sales.forEach(sale => {
      const saleObj = sale.toObject();
      const payments = saleObj.payments && saleObj.payments.length > 0
        ? saleObj.payments
        : [{ method: saleObj.paymentMethod || 'Cash', amount: saleObj.amountPaid || saleObj.grandTotal, status: saleObj.paymentStatus || 'Paid' }];

      if (payments.length > 1) {
        summary.totalSplitPayments++;
      }

      payments.forEach(p => {
        switch (p.method) {
          case 'Cash': summary.totalCash += p.amount; break;
          case 'GPay': summary.totalGPay += p.amount; break;
          case 'PhonePe': summary.totalPhonePe += p.amount; break;
          case 'Paytm': summary.totalPaytm += p.amount; break;
          case 'UPI': summary.totalUPI += p.amount; break;
          case 'Credit Card': summary.totalCreditCard += p.amount; break;
          case 'Debit Card': summary.totalDebitCard += p.amount; break;
          case 'Bank Transfer': summary.totalBankTransfer += p.amount; break;
          case 'Pay Later':
            if (p.status === 'Pending' || p.status === 'Partially Paid') {
              summary.totalPending += p.amount;
            }
            break;
        }
        summary.totalCollection += p.amount;
      });
    });

    // Total UPI includes GPay + PhonePe + Paytm + UPI (Other)
    summary.totalUPIAll = summary.totalGPay + summary.totalPhonePe + summary.totalPaytm + summary.totalUPI;
    summary.totalCard = summary.totalCreditCard + summary.totalDebitCard;

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a sale (POS Billing) with multi-payment support
// @route   POST /api/sales
// @access  Private
const createSale = async (req, res) => {
  const { invoiceNumber, customerInfo, items, subTotal, gstTotal, discountTotal, grandTotal, payments } = req.body;

  let customer = null;
  if (customerInfo && customerInfo.mobile) {
    let existingCustomer = await Customer.findOne({ mobileNumber: customerInfo.mobile, adminId: req.adminId });
    if (!existingCustomer) {
      existingCustomer = await Customer.create({
        adminId: req.adminId,
        customerName: customerInfo.name || 'Walk-in Customer',
        mobileNumber: customerInfo.mobile,
        email: customerInfo.email || ''
      });
    } else if (customerInfo.name && existingCustomer.customerName === 'Walk-in Customer') {
      existingCustomer.customerName = customerInfo.name;
      await existingCustomer.save();
    }
    customer = existingCustomer._id;
  }

  if (items && items.length === 0) {
    res.status(400).json({ message: 'No sale items' });
    return;
  }

  // --- Payment validations ---
  if (!payments || payments.length === 0) {
    return res.status(400).json({ message: 'At least one payment method is required' });
  }

  const totalPaymentAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const hasPayLater = payments.some(p => p.method === 'Pay Later');

  // Calculate paid amount (exclude Pay Later pending entries)
  const paidAmount = payments
    .filter(p => p.method !== 'Pay Later')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const payLaterAmount = payments
    .filter(p => p.method === 'Pay Later')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // Total payments must equal grand total
  if (Math.abs(totalPaymentAmount - grandTotal) > 1) {
    return res.status(400).json({ message: `Total payment (₹${totalPaymentAmount}) does not match Grand Total (₹${grandTotal})` });
  }

  // If Pay Later is used, customer info is mandatory
  if (hasPayLater && !customer) {
    return res.status(400).json({ message: 'Customer is required when using Pay Later' });
  }

  // Validate individual payment entries
  for (const p of payments) {
    if (!p.method || p.amount <= 0) {
      return res.status(400).json({ message: 'Each payment must have a valid method and amount greater than 0' });
    }
  }

  // Determine payment type and status
  const uniqueMethods = [...new Set(payments.map(p => p.method))];
  const paymentType = payments.length > 1 ? 'Split Payment' : payments[0].method;

  let paymentStatus = 'Paid';
  const pendingAmount = payLaterAmount;
  if (pendingAmount >= grandTotal) {
    paymentStatus = 'Pending';
  } else if (pendingAmount > 0) {
    paymentStatus = 'Partially Paid';
  }

  // Mark Pay Later entries with Pending status
  const processedPayments = payments.map(p => ({
    ...p,
    amount: Number(p.amount),
    status: p.method === 'Pay Later' ? 'Pending' : 'Paid',
    receivedBy: req.user._id,
    receivedDate: new Date()
  }));

  try {
    // 1. Business Rule Validation
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.product}` });
      }

      // Stock Validation
      if (product.currentStock < item.quantity) {
        return res.status(400).json({ message: `Insufficient Stock for ${product.name}. Available: ${product.currentStock}` });
      }

      // Discount Validation (Final selling price cannot be below purchase price)
      const finalPricePerItem = (item.sellingPrice * item.quantity - item.discount) / item.quantity;
      if (finalPricePerItem < product.purchasePrice) {
        return res.status(400).json({ message: `Discount cannot reduce selling price below purchase price for ${product.name}.` });
      }
    }

    // 2. Create Sale
    const sale = new Sale({
      adminId: req.adminId,
      invoiceNumber,
      customer,
      subTotal,
      gstTotal,
      discountTotal,
      grandTotal,
      payments: processedPayments,
      paymentType,
      paymentStatus,
      pendingAmount,
      amountPaid: paidAmount,
      paymentMethod: paymentType, // backward compat
      createdBy: req.user._id
    });

    const createdSale = await sale.save();

    // 3. Process Items and Update Stock
    for (const item of items) {
      const product = await Product.findById(item.product);

      const saleItem = new SaleItem({
        adminId: req.adminId,
        sale: createdSale._id,
        product: item.product,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
        purchasePrice: product.purchasePrice,
        gst: item.gst,
        discount: item.discount,
        total: item.total
      });
      await saleItem.save();

      // Deduct Stock
      const previousStock = product.currentStock;
      product.currentStock -= item.quantity;
      await product.save();

      // Create Stock History
      await StockHistory.create({
        adminId: req.adminId,
        product: product._id,
        type: 'Sales',
        previousStock,
        newStock: product.currentStock,
        quantity: item.quantity,
        referenceId: createdSale._id,
        updatedBy: req.user._id
      });
    }

    await AuditLog.create({
      adminId: req.adminId,
      action: 'Bill Created',
      module: 'Sale',
      newValue: createdSale,
      user: req.user._id,
      ipAddress: req.ip
    });

    res.status(201).json(createdSale);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Receive payment for an existing sale
// @route   PUT /api/sales/:id/pay
// @access  Private
const receivePayment = async (req, res) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, adminId: req.adminId });

    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    const { amount, method, transactionId, bankName, cardLast4, notes } = req.body;
    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ message: 'Valid payment amount is required' });
    }

    if (paymentAmount > sale.pendingAmount) {
      return res.status(400).json({ message: `Payment amount (₹${paymentAmount}) cannot exceed pending amount (₹${sale.pendingAmount})` });
    }

    const newPayment = {
      method,
      amount: paymentAmount,
      transactionId: transactionId || '',
      bankName: bankName || '',
      cardLast4: cardLast4 || '',
      notes: notes || '',
      status: 'Paid',
      receivedBy: req.user._id,
      receivedDate: new Date()
    };

    sale.payments.push(newPayment);

    // Recalculate totals
    const totalPaid = sale.payments
      .filter(p => p.status === 'Paid')
      .reduce((sum, p) => sum + p.amount, 0);

    sale.amountPaid = totalPaid;
    sale.pendingAmount = sale.grandTotal - totalPaid;

    if (sale.pendingAmount <= 0) {
      sale.paymentStatus = 'Paid';
    } else if (sale.pendingAmount < sale.grandTotal) {
      sale.paymentStatus = 'Partially Paid';
    } else {
      sale.paymentStatus = 'Pending';
    }

    const updatedSale = await sale.save();

    await AuditLog.create({
      adminId: req.adminId,
      action: 'Payment Received',
      module: 'Sale',
      newValue: updatedSale,
      user: req.user._id,
      ipAddress: req.ip
    });

    res.json(updatedSale);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSales,
  getSaleById,
  getSalesReports,
  getPaymentSummary,
  createSale,
  receivePayment
};