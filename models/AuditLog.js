const mongoose = require('mongoose');

const auditLogSchema = mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // e.g., 'Product Created', 'Bill Cancelled'
  module: { type: String, required: true }, // e.g., 'Product', 'Purchase', 'Sale'
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ipAddress: { type: String },
}, { timestamps: true });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;
