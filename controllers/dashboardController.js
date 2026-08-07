const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const SaleItem = require('../models/SaleItem');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Sales calculations
    const todaySales = await Sale.aggregate([
      { $match: { adminId: req.adminId, saleDate: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' }, paid: { $sum: '$amountPaid' }, pending: { $sum: '$pendingAmount' } } }
    ]);

    const monthlySales = await Sale.aggregate([
      { $match: { adminId: req.adminId, saleDate: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);

    const yearlySales = await Sale.aggregate([
      { $match: { adminId: req.adminId, saleDate: { $gte: startOfYear } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);

    const totalRevenue = await Sale.aggregate([
      { $match: { adminId: req.adminId } },
      { $group: { _id: null, total: { $sum: '$grandTotal' }, paid: { $sum: '$amountPaid' }, pending: { $sum: '$pendingAmount' } } }
    ]);

    // Invoice Status Counts
    const invoiceCounts = await Sale.aggregate([
      { $match: { adminId: req.adminId } },
      { $group: { _id: '$paymentStatus', count: { $sum: 1 } } }
    ]);
    const counts = {
      paid: invoiceCounts.find(c => c._id === 'Paid')?.count || 0,
      pending: invoiceCounts.find(c => c._id === 'Pending')?.count || 0,
      partial: invoiceCounts.find(c => c._id === 'Partially Paid')?.count || 0,
    };

    // Calculate Profit (Today)
    const todaySaleItems = await SaleItem.aggregate([
      { $match: { adminId: req.adminId, createdAt: { $gte: today } } },
      { $group: { _id: null, totalSelling: { $sum: { $subtract: [ { $multiply: ['$sellingPrice', '$quantity'] }, '$discount' ] } }, totalPurchase: { $sum: { $multiply: ['$purchasePrice', '$quantity'] } } } }
    ]);
    const todaySalesForDiscount = await Sale.aggregate([
      { $match: { adminId: req.adminId, saleDate: { $gte: today } } },
      { $group: { _id: null, totalDiscount: { $sum: '$discountTotal' } } }
    ]);
    const todayProfitRaw = todaySaleItems.length > 0 ? (todaySaleItems[0].totalSelling - todaySaleItems[0].totalPurchase) : 0;
    const todayProfit = todayProfitRaw - (todaySalesForDiscount.length > 0 ? todaySalesForDiscount[0].totalDiscount : 0);

    // Calculate Profit (Total)
    const totalSaleItems = await SaleItem.aggregate([
      { $match: { adminId: req.adminId } },
      { $group: { _id: null, totalSelling: { $sum: { $subtract: [ { $multiply: ['$sellingPrice', '$quantity'] }, '$discount' ] } }, totalPurchase: { $sum: { $multiply: ['$purchasePrice', '$quantity'] } } } }
    ]);
    const totalSalesForDiscount = await Sale.aggregate([
      { $match: { adminId: req.adminId } },
      { $group: { _id: null, totalDiscount: { $sum: '$discountTotal' } } }
    ]);
    const totalProfitRaw = totalSaleItems.length > 0 ? (totalSaleItems[0].totalSelling - totalSaleItems[0].totalPurchase) : 0;
    const totalProfit = totalProfitRaw - (totalSalesForDiscount.length > 0 ? totalSalesForDiscount[0].totalDiscount : 0);

    // Today's collection breakdown by payment method
    const todaySalesData = await Sale.find({ adminId: req.adminId, saleDate: { $gte: today } });
    const todayCollectionByMethod = {
      cash: 0, upi: 0, card: 0, bankTransfer: 0, payLater: 0
    };
    todaySalesData.forEach(sale => {
      const payments = sale.payments && sale.payments.length > 0
        ? sale.payments
        : [{ method: sale.paymentMethod || 'Cash', amount: sale.amountPaid || sale.grandTotal }];
      payments.forEach(p => {
        if (p.method === 'Cash') todayCollectionByMethod.cash += p.amount;
        else if (['GPay', 'PhonePe', 'Paytm', 'UPI'].includes(p.method)) todayCollectionByMethod.upi += p.amount;
        else if (['Credit Card', 'Debit Card'].includes(p.method)) todayCollectionByMethod.card += p.amount;
        else if (p.method === 'Bank Transfer') todayCollectionByMethod.bankTransfer += p.amount;
        else if (p.method === 'Pay Later') todayCollectionByMethod.payLater += p.amount;
      });
    });

    // Pending Customers
    const pendingCustomersAgg = await Sale.aggregate([
      { $match: { adminId: req.adminId, pendingAmount: { $gt: 0 }, customer: { $ne: null } } },
      { $group: { _id: '$customer', totalPending: { $sum: '$pendingAmount' } } },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customerObj' } },
      { $unwind: '$customerObj' },
      { $project: { _id: 1, name: '$customerObj.customerName', mobile: '$customerObj.mobileNumber', pending: '$totalPending' } },
      { $sort: { pending: -1 } },
      { $limit: 10 }
    ]);

    // Inventory calculations
    const products = await Product.find({ adminId: req.adminId });
    const totalProducts = products.length;
    let totalStockPurchaseValue = 0;
    let totalStockSellingValue = 0;
    let lowStockProducts = 0;
    let outOfStockProducts = 0;

    products.forEach(p => {
      const stock = Math.max(0, Number(p.currentStock || 0));
      const pPrice = Number(p.purchasePrice || 0);
      const sPrice = Number(p.sellingPrice || 0);

      totalStockPurchaseValue += (stock * pPrice);
      totalStockSellingValue += (stock * sPrice);

      if (p.currentStock === 0) outOfStockProducts++;
      else if (p.currentStock <= p.minimumStock) lowStockProducts++;
    });

    const totalStockMargin = totalStockSellingValue - totalStockPurchaseValue;

    // Recent Bills (Pending)
    const recentPendingBills = await Sale.find({ adminId: req.adminId, paymentStatus: { $ne: 'Paid' } }).sort({ createdAt: -1 }).limit(5).populate('customer', 'customerName');

    // Recent Bills (All)
    const recentBills = await Sale.find({ adminId: req.adminId }).sort({ createdAt: -1 }).limit(5).populate('customer', 'customerName');

    res.json({
      todaySales: todaySales[0]?.total || 0,
      todayPaid: todaySales[0]?.paid || 0,
      todayPending: todaySales[0]?.pending || 0,
      monthlySales: monthlySales[0]?.total || 0,
      yearlySales: yearlySales[0]?.total || 0,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalPaidCollection: totalRevenue[0]?.paid || 0,
      totalPending: totalRevenue[0]?.pending || 0,
      todayProfit,
      totalProfit,
      invoiceCounts: counts,
      pendingCustomers: pendingCustomersAgg,
      todayCollectionByMethod,
      totalProducts,
      inventoryValue: totalStockPurchaseValue,
      totalStockPurchaseValue,
      totalStockSellingValue,
      totalStockMargin,
      totalSoldPurchaseCost: totalSaleItems[0]?.totalPurchase || 0,
      totalSoldSellingValue: totalSaleItems[0]?.totalSelling || 0,
      lowStockProducts,
      outOfStockProducts,
      recentBills,
      recentPendingBills
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get inventory analytics
// @route   GET /api/dashboard/analytics
// @access  Private
const getInventoryAnalytics = async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 1. Out of stock products
    const outOfStock = await Product.find({ adminId: req.adminId, currentStock: 0 })
      .select('name productCode currentStock minimumStock')
      .populate('category', 'name');

    // 2. Low stock products
    const lowStock = await Product.find({
      adminId: req.adminId,
      $expr: { $lte: ['$currentStock', '$minimumStock'] },
      currentStock: { $gt: 0 }
    })
      .select('name productCode currentStock minimumStock')
      .populate('category', 'name');

    // 3. Top selling products this month
    const topSellingProducts = await SaleItem.aggregate([
      { $match: { adminId: req.adminId, createdAt: { $gte: startOfMonth } } },
      {
        $group: {
          _id: '$product',
          totalQuantity: { $sum: '$quantity' },
          totalRevenue: { $sum: '$total' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },
      {
        $project: {
          _id: 1,
          totalQuantity: 1,
          totalRevenue: 1,
          name: '$productDetails.name',
          productCode: '$productDetails.productCode',
          currentStock: '$productDetails.currentStock'
        }
      }
    ]);

    res.json({
      outOfStock,
      lowStock,
      topSellingProducts
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getInventoryAnalytics
};
