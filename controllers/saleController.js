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

      // Ensure CGST and SGST totals exist for older sales
      if (saleObj.cgstTotal === undefined) {
        saleObj.cgstTotal = Number(((saleObj.gstTotal || 0) / 2).toFixed(2));
      }
      if (saleObj.sgstTotal === undefined) {
        saleObj.sgstTotal = Number(((saleObj.gstTotal || 0) / 2).toFixed(2));
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
    const sales = await Sale.find({ adminId: req.adminId });

    let totalCash = 0;
    let totalGPay = 0;
    let totalPhonePe = 0;
    let totalPaytm = 0;
    let totalUPI = 0;
    let totalCreditCard = 0;
    let totalDebitCard = 0;
    let totalBankTransfer = 0;
    let totalPending = 0;
    let totalSplitPayments = 0;
    let totalCollection = 0;

    sales.forEach(sale => {
      let isSplit = false;

      if (sale.payments && sale.payments.length > 0) {
        if (sale.payments.length > 1) totalSplitPayments++;

        sale.payments.forEach(p => {
          const amt = Number(p.amount) || 0;
          switch (p.method) {
            case 'Cash': totalCash += amt; totalCollection += amt; break;
            case 'GPay': totalGPay += amt; totalCollection += amt; break;
            case 'PhonePe': totalPhonePe += amt; totalCollection += amt; break;
            case 'Paytm': totalPaytm += amt; totalCollection += amt; break;
            case 'UPI': totalUPI += amt; totalCollection += amt; break;
            case 'Credit Card': totalCreditCard += amt; totalCollection += amt; break;
            case 'Debit Card': totalDebitCard += amt; totalCollection += amt; break;
            case 'Bank Transfer': totalBankTransfer += amt; totalCollection += amt; break;
            case 'Pay Later': totalPending += amt; break;
            default: break;
          }
        });
      } else {
        const amt = sale.amountPaid || sale.grandTotal;
        const method = sale.paymentMethod || sale.paymentType || 'Cash';

        if (sale.paymentStatus === 'Pending') {
          totalPending += sale.grandTotal;
        } else {
          totalCollection += amt;
          if (method === 'Cash') totalCash += amt;
          else if (['GPay', 'PhonePe', 'Paytm', 'UPI'].includes(method)) totalUPI += amt;
          else if (['Credit Card', 'Debit Card'].includes(method)) totalCreditCard += amt;
          else if (method === 'Bank Transfer') totalBankTransfer += amt;
        }
      }
    });

    const totalUPIAll = totalGPay + totalPhonePe + totalPaytm + totalUPI;
    const totalCard = totalCreditCard + totalDebitCard;

    res.json({
      totalCash,
      totalGPay,
      totalPhonePe,
      totalPaytm,
      totalUPI,
      totalUPIAll,
      totalCreditCard,
      totalDebitCard,
      totalCard,
      totalBankTransfer,
      totalPending,
      totalSplitPayments,
      totalCollection
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new sale with multi-payment & stock validation
// @route   POST /api/sales
// @access  Private
const createSale = async (req, res) => {
  const { customerInfo, items, subTotal, gstTotal, discountTotal, grandTotal, payments } = req.body;

  let customer = null;

  // Resolve or Create Customer if mobile is provided
  if (customerInfo && customerInfo.mobile) {
    let existingCustomer = await Customer.findOne({ adminId: req.adminId, mobileNumber: customerInfo.mobile });
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

  const invoiceNumber = req.body.invoiceNumber || `INV-${Date.now()}`;
  const cgstTotal = req.body.cgstTotal !== undefined ? Number(req.body.cgstTotal) : Number(((gstTotal || 0) / 2).toFixed(2));
  const sgstTotal = req.body.sgstTotal !== undefined ? Number(req.body.sgstTotal) : Number(((gstTotal || 0) / 2).toFixed(2));

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
      cgstTotal,
      sgstTotal,
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

      // Deduct stock
      product.currentStock -= item.quantity;
      await product.save();

      // Record Stock History
      await StockHistory.create({
        adminId: req.adminId,
        product: product._id,
        changeType: 'SALE',
        quantity: item.quantity,
        balanceStock: product.currentStock,
        referenceId: createdSale._id,
        notes: `Sold via Invoice ${invoiceNumber}`,
        createdBy: req.user._id
      });
    }

    // 4. Audit Log
    await AuditLog.create({
      adminId: req.adminId,
      action: 'Sale Completed',
      module: 'Sale',
      newValue: { invoiceNumber, grandTotal, paymentType, paymentStatus },
      user: req.user._id,
      ipAddress: req.ip
    });

    res.status(201).json(createdSale);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Receive payment for pending sale
// @route   PUT /api/sales/:id/pay
// @access  Private
const receivePayment = async (req, res) => {
  try {
    const { amount, method, transactionId, cardLast4, bankName, notes } = req.body;
    const sale = await Sale.findOne({ _id: req.params.id, adminId: req.adminId });

    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ message: 'Payment amount must be greater than 0' });
    }

    if (sale.pendingAmount <= 0) {
      return res.status(400).json({ message: 'This sale has no pending amount' });
    }

    const newPayment = {
      method: method || 'Cash',
      amount: paymentAmount,
      transactionId: transactionId || '',
      cardLast4: cardLast4 || '',
      bankName: bankName || '',
      notes: notes || '',
      receivedBy: req.user._id,
      receivedDate: new Date(),
      status: 'Paid'
    };

    sale.payments.push(newPayment);
    sale.amountPaid = (sale.amountPaid || 0) + paymentAmount;
    sale.pendingAmount = Math.max(0, sale.pendingAmount - paymentAmount);

    if (sale.pendingAmount === 0) {
      sale.paymentStatus = 'Paid';
    } else {
      sale.paymentStatus = 'Partially Paid';
    }

    const updatedSale = await sale.save();

    await AuditLog.create({
      adminId: req.adminId,
      action: 'Payment Received for Sale',
      module: 'Sale',
      newValue: { invoiceNumber: sale.invoiceNumber, amount: paymentAmount, pendingAmount: sale.pendingAmount },
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