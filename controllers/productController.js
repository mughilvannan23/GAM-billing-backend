const Product = require('../models/Product');
const Category = require('../models/Category');
const AuditLog = require('../models/AuditLog');
const XLSX = require('xlsx');

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

// @desc    Bulk delete products
// @route   POST /api/products/bulk-delete
// @access  Private/Admin
const bulkDeleteProducts = async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: 'No product IDs provided for deletion' });
    }

    const result = await Product.deleteMany({
      _id: { $in: productIds },
      adminId: req.adminId
    });

    if (result.deletedCount > 0) {
      await AuditLog.create({
        adminId: req.adminId,
        action: 'Bulk Products Deleted',
        module: 'Product',
        newValue: { count: result.deletedCount, productIds },
        user: req.user._id,
        ipAddress: req.ip
      });
    }

    res.json({
      success: true,
      count: result.deletedCount,
      message: `${result.deletedCount} product(s) deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to delete products' });
  }
};

// @desc    Bulk update Margin % and GST % for selected products
// @route   POST /api/products/bulk-update-margin-gst
// @access  Private/Admin
const bulkUpdateMarginGst = async (req, res) => {
  try {
    const { productIds, margin, gst, updateMargin, updateGst } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: 'No product IDs provided' });
    }

    if (!updateMargin && !updateGst) {
      return res.status(400).json({ message: 'Please select Margin or GST to update' });
    }

    const products = await Product.find({
      _id: { $in: productIds },
      adminId: req.adminId
    });

    if (!products || products.length === 0) {
      return res.status(404).json({ message: 'No matching products found' });
    }

    let updatedCount = 0;

    for (const product of products) {
      let modified = false;

      if (updateGst && gst !== undefined && gst !== '' && !isNaN(Number(gst))) {
        const newGst = Number(gst);
        if (newGst >= 0) {
          product.gst = newGst;
          modified = true;
        }
      }

      if (updateMargin && margin !== undefined && margin !== '' && !isNaN(Number(margin))) {
        const newMargin = Number(margin);
        if (newMargin >= 0 && product.purchasePrice > 0) {
          const newSellingPrice = Number((product.purchasePrice + (product.purchasePrice * newMargin / 100)).toFixed(2));
          product.sellingPrice = newSellingPrice;
          modified = true;
        }
      }

      if (modified) {
        await product.save();
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      await AuditLog.create({
        adminId: req.adminId,
        action: 'Bulk Products Margin/GST Updated',
        module: 'Product',
        newValue: { count: updatedCount, margin: updateMargin ? margin : undefined, gst: updateGst ? gst : undefined, productIds },
        user: req.user._id,
        ipAddress: req.ip
      });
    }

    res.json({
      success: true,
      count: updatedCount,
      message: `${updatedCount} product(s) updated successfully`
    });
  } catch (error) {
    console.error('Error in bulkUpdateMarginGst:', error);
    res.status(500).json({ message: error.message || 'Failed to bulk update products' });
  }
};

// @desc    Bulk import products from Excel (.xlsx / .xls)
// @route   POST /api/products/import
// @access  Private/Admin
const importProducts = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an Excel file' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return res.status(400).json({ message: 'Excel file is empty' });
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return res.status(400).json({ message: 'No data rows found in Excel sheet' });
    }

    // Fetch existing categories for admin
    const existingCategories = await Category.find({ adminId: req.adminId });
    const categoryMap = new Map();
    existingCategories.forEach(cat => {
      categoryMap.set(cat.name.trim().toLowerCase(), cat._id);
    });

    // Fetch existing product codes for admin to verify uniqueness
    const existingProducts = await Product.find({ adminId: req.adminId }).select('productCode');
    const existingCodes = new Set(existingProducts.map(p => String(p.productCode).trim().toLowerCase()));
    const batchCodes = new Set();

    const productsToInsert = [];
    const errors = [];
    let importedCount = 0;
    let skippedCount = 0;

    // Helper to get value from row regardless of exact key casing or spacing
    const getVal = (rowObj, possibleKeys) => {
      for (const k of Object.keys(rowObj)) {
        const cleanK = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const target of possibleKeys) {
          const cleanTarget = target.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanK === cleanTarget) {
            return rowObj[k];
          }
        }
      }
      return undefined;
    };

    // Helper to check if a row is completely empty
    const isRowEmpty = (rowObj) => {
      return Object.values(rowObj).every(v => v === null || v === undefined || String(v).trim() === '');
    };

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNum = i + 2; // Row 1 is header, so row 2 is first data row

      if (isRowEmpty(row)) {
        continue; // Skip completely empty rows
      }

      const nameVal = getVal(row, ['product name', 'name', 'productname']);
      const codeVal = getVal(row, ['product code', 'productcode', 'code']);
      const categoryVal = getVal(row, ['category', 'category name', 'categoryname']);
      const purchasePriceVal = getVal(row, ['purchase price', 'purchaseprice', 'buy price']);
      const sellingPriceVal = getVal(row, ['selling price', 'sellingprice', 'sell price']);
      const brandVal = getVal(row, ['brand']);
      const gstVal = getVal(row, ['gst (%)', 'gst%', 'gst']);
      const unitVal = getVal(row, ['unit']);
      const currentStockVal = getVal(row, ['current stock', 'currentstock', 'stock']);
      const minimumStockVal = getVal(row, ['minimum stock', 'minimumstock', 'min stock']);
      const rackNumberVal = getVal(row, ['rack number', 'racknumber', 'rack']);
      const descriptionVal = getVal(row, ['description']);

      const pName = nameVal !== undefined ? String(nameVal).trim() : '';
      const pCode = codeVal !== undefined ? String(codeVal).trim() : '';
      const pCatName = categoryVal !== undefined ? String(categoryVal).trim() : '';

      // Validation 1: Product Name
      if (!pName) {
        skippedCount++;
        errors.push({ row: rowNum, productCode: pCode || 'N/A', productName: 'N/A', reason: 'Product Name is required' });
        continue;
      }

      // Validation 2: Product Code
      if (!pCode) {
        skippedCount++;
        errors.push({ row: rowNum, productCode: 'N/A', productName: pName, reason: 'Product Code is required' });
        continue;
      }

      // Validation 3: Category
      if (!pCatName) {
        skippedCount++;
        errors.push({ row: rowNum, productCode: pCode, productName: pName, reason: 'Category is required' });
        continue;
      }

      // Validation 4: Purchase Price
      if (purchasePriceVal === undefined || purchasePriceVal === '' || isNaN(Number(purchasePriceVal))) {
        skippedCount++;
        errors.push({ row: rowNum, productCode: pCode, productName: pName, reason: 'Valid Purchase Price is required' });
        continue;
      }

      const purchasePrice = Number(purchasePriceVal);
      if (purchasePrice < 0) {
        skippedCount++;
        errors.push({ row: rowNum, productCode: pCode, productName: pName, reason: 'Purchase Price cannot be negative' });
        continue;
      }

      // Validation 5: Selling Price & Margin calculation
      let sellingPrice;
      if (sellingPriceVal !== undefined && sellingPriceVal !== '' && !isNaN(Number(sellingPriceVal))) {
        sellingPrice = Number(sellingPriceVal);
      } else {
        // Calculate Selling Price using default 32% margin
        sellingPrice = Number((purchasePrice + (purchasePrice * 0.32)).toFixed(2));
      }

      if (sellingPrice < 0) {
        skippedCount++;
        errors.push({ row: rowNum, productCode: pCode, productName: pName, reason: 'Selling Price cannot be negative' });
        continue;
      }

      if (sellingPrice < purchasePrice) {
        skippedCount++;
        errors.push({ row: rowNum, productCode: pCode, productName: pName, reason: 'Selling price is less than purchase price' });
        continue;
      }

      // Validation 6: Product Code Uniqueness
      const cleanCodeLower = pCode.toLowerCase();
      if (existingCodes.has(cleanCodeLower) || batchCodes.has(cleanCodeLower)) {
        skippedCount++;
        errors.push({ row: rowNum, productCode: pCode, productName: pName, reason: `Product Code "${pCode}" already exists` });
        continue;
      }
      batchCodes.add(cleanCodeLower);

      // Defaults for optional fields
      const gst = (gstVal !== undefined && gstVal !== '' && !isNaN(Number(gstVal))) ? Number(gstVal) : 18;
      if (gst < 0) {
        skippedCount++;
        errors.push({ row: rowNum, productCode: pCode, productName: pName, reason: 'GST percentage cannot be negative' });
        continue;
      }

      const currentStock = (currentStockVal !== undefined && currentStockVal !== '' && !isNaN(Number(currentStockVal))) ? Number(currentStockVal) : 0;
      if (currentStock < 0) {
        skippedCount++;
        errors.push({ row: rowNum, productCode: pCode, productName: pName, reason: 'Current Stock cannot be negative' });
        continue;
      }

      const minimumStock = (minimumStockVal !== undefined && minimumStockVal !== '' && !isNaN(Number(minimumStockVal))) ? Number(minimumStockVal) : 1;
      if (minimumStock < 0) {
        skippedCount++;
        errors.push({ row: rowNum, productCode: pCode, productName: pName, reason: 'Minimum Stock cannot be negative' });
        continue;
      }

      const unit = (unitVal !== undefined && String(unitVal).trim()) ? String(unitVal).trim() : 'Piece';
      const rackNumber = (rackNumberVal !== undefined && String(rackNumberVal).trim() !== '') ? String(rackNumberVal).trim() : '0';
      const brand = (brandVal !== undefined) ? String(brandVal).trim() : '';
      const description = (descriptionVal !== undefined) ? String(descriptionVal).trim() : '';

      // Category Resolution: Find existing or auto-create new Category
      const cleanCatLower = pCatName.toLowerCase();
      let categoryId = categoryMap.get(cleanCatLower);

      if (!categoryId) {
        try {
          const newCat = await Category.create({
            name: pCatName,
            adminId: req.adminId
          });
          categoryId = newCat._id;
          categoryMap.set(cleanCatLower, categoryId);
        } catch (catErr) {
          const retryCat = await Category.findOne({ adminId: req.adminId, name: { $regex: new RegExp(`^${pCatName}$`, 'i') } });
          if (retryCat) {
            categoryId = retryCat._id;
            categoryMap.set(cleanCatLower, categoryId);
          } else {
            skippedCount++;
            errors.push({ row: rowNum, productCode: pCode, productName: pName, reason: `Failed to create Category "${pCatName}"` });
            continue;
          }
        }
      }

      productsToInsert.push({
        adminId: req.adminId,
        name: pName,
        productCode: pCode,
        category: categoryId,
        brand: brand,
        purchasePrice: purchasePrice,
        sellingPrice: sellingPrice,
        gst: gst,
        currentStock: currentStock,
        minimumStock: minimumStock,
        unit: unit,
        rackNumber: rackNumber,
        description: description,
        status: true
      });
    }

    if (productsToInsert.length > 0) {
      const createdProducts = await Product.insertMany(productsToInsert);
      importedCount = createdProducts.length;

      await AuditLog.create({
        adminId: req.adminId,
        action: 'Bulk Products Imported',
        module: 'Product',
        newValue: { count: importedCount, file: req.file.originalname },
        user: req.user._id,
        ipAddress: req.ip
      });
    }

    res.status(200).json({
      success: true,
      imported: importedCount,
      skipped: skippedCount,
      errors: errors
    });
  } catch (error) {
    console.error('Error during product excel import:', error);
    res.status(500).json({ message: error.message || 'Failed to import products from Excel' });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkDeleteProducts,
  bulkUpdateMarginGst,
  importProducts
};
