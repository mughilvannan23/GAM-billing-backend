const Setting = require('../models/Setting');
const AuditLog = require('../models/AuditLog');

// @desc    Get settings
// @route   GET /api/settings
// @access  Private/Admin
const getSettings = async (req, res) => {
  try {
    const filter = req.adminId ? { adminId: req.adminId } : {};
    let settings = await Setting.findOne(filter);
    if (!settings && req.adminId) {
      settings = await Setting.create({ adminId: req.adminId });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update settings
// @route   PUT /api/settings
// @access  Private/Admin
const updateSettings = async (req, res) => {
  try {
    const filter = req.adminId ? { adminId: req.adminId } : {};
    let settings = await Setting.findOne(filter);

    if (!settings) {
      settings = new Setting({ ...req.body, adminId: req.adminId });
      await settings.save();
      return res.status(201).json(settings);
    }

    const oldSettings = { ...settings.toObject() };
    Object.assign(settings, req.body);
    const updatedSettings = await settings.save();

    await AuditLog.create({
      adminId: req.adminId,
      action: 'Settings Updated',
      module: 'Settings',
      oldValue: oldSettings,
      newValue: updatedSettings,
      user: req.user._id,
      ipAddress: req.ip
    });

    res.json(updatedSettings);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getSettings,
  updateSettings
};
