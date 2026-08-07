const mongoose = require('mongoose');

const quotationItemSchema = new mongoose.Schema({
  slNo: { type: String, default: '1.' },
  item: { type: String, default: '' },
  modelName: { type: String, default: '' },
  description: { type: String, required: true },
  qty: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
  price: { type: Number, required: true, default: 0 }
});

const quotationSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  formatType: { 
    type: String, 
    enum: ['QUOTATION', 'TAX_INVOICE', 'PURCHASE_ORDER', 'RECEIPT_VOUCHER', 'PROJECT_PROPOSAL'],
    default: 'QUOTATION'
  },
  quotationNumber: { type: String, required: true },
  quotationDate: { type: String, required: true },
  
  // Business details
  companyName: { type: String, default: 'SRI MARUDHAM AGRO AGENCIES' },
  cellNo: { type: String, default: '7305083466' },
  gstNo: { type: String, default: '33AFHPE7675P1ZV' },
  addressLine1: { type: String, default: 'Kurunthanakottai, Piranjiyur, Sivaganga, Tamilnadu - 623402.' },
  addressLine2: { type: String, default: 'Vandiyur Tollgate, Anna Nagar East, Madurai, Tamilnadu - 625020.' },
  email: { type: String, default: 'srimarudham24@gmail.com' },
  
  // Customer details
  customerName: { type: String, default: '' },
  customerAddress: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  
  // Tax Invoice specific fields
  taxInvoiceDetails: {
    taxNo: { type: String, default: '' },
    dispatchBy: { type: String, default: '' },
    hypothecation: { type: String, default: '' },
    chassisNo: { type: String, default: '' },
    engineNo: { type: String, default: '' }
  },

  // Purchase Order specific fields
  purchaseOrderDetails: {
    poNo: { type: String, default: '' },
    vendorName: { type: String, default: '' },
    vendorAddress: { type: String, default: '' },
    vendorPhone: { type: String, default: '' },
    vendorEmail: { type: String, default: '' },
    gstinNo: { type: String, default: '' },
    cstNo: { type: String, default: '' },
    panNo: { type: String, default: '' },
    billToAddress: { type: String, default: '' },
    shipToAddress: { type: String, default: '' },
    tcsPercent: { type: Number, default: 0.1 },
    tcsAmount: { type: Number, default: 0 },
    paymentMode: { type: String, default: 'NEFT/RTGS/BG' },
    paymentDate: { type: String, default: '' },
    paymentRef: { type: String, default: '' },
    billingInstruction: { type: String, default: '' }
  },

  // Receipt Voucher specific fields
  receiptVoucherDetails: {
    voucherNo: { type: String, default: '' },
    particulars: { type: String, default: '' },
    through: { type: String, default: 'CASH' },
    onAccountOf: { type: String, default: 'BOOKING ADVANCE RECEIVED' },
    voucherAmount: { type: Number, default: 0 }
  },

  // Project Proposal specific fields
  proposalDetails: {
    projectTitle: { type: String, default: '' },
    projectOverview: { type: String, default: '' },
    projectTeam: { type: String, default: '' },
    additionalCharges: [{ service: String, approxCost: String }],
    thirdPartyServices: [{ service: String, freePlan: String, paidCharges: String }],
    timelinePhases: [{ phase: String, duration: String }],
    deliverables: [{ type: String }],
    featuresIncluded: [{ type: String }],
    exclusions: [{ type: String }],
    commercialSummary: {
      devCost: { type: String, default: '' },
      teamSize: { type: String, default: '' },
      duration: { type: String, default: '' },
      techStack: { type: String, default: '' }
    }
  },
  
  // Items & Amounts
  items: [quotationItemSchema],
  subtotal: { type: Number, default: 0 },
  cgstPercent: { type: Number, default: 2.5 },
  cgstAmount: { type: Number, default: 0 },
  sgstPercent: { type: Number, default: 2.5 },
  sgstAmount: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  amountInWords: { type: String, default: '' },
  
  // Bank Details
  bankDetails: {
    bankName: { type: String, default: 'CITY UNION BANK, Anna Nagar Branch, Madurai' },
    accountName: { type: String, default: 'SRI MARUDHAM AGRO AGENCIES' },
    accountNo: { type: String, default: '510909010245421' },
    ifscCode: { type: String, default: 'CIUB0000195' }
  },
  
  // Terms & Signatures
  conditionsOfSale: [{ type: String }],
  authorizedSignatoryText: { type: String, default: 'For Sri Marudham Agro Agencies' },
  status: { type: String, enum: ['Draft', 'Sent', 'Accepted', 'Rejected'], default: 'Draft' }
}, { timestamps: true });

const Quotation = mongoose.model('Quotation', quotationSchema);
module.exports = Quotation;
