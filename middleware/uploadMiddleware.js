const multer = require('multer');
const path = require('path');

// Store uploaded Excel files in memory buffer
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const filetypes = /xlsx|xls/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = 
    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.mimetype === 'application/vnd.ms-excel' ||
    file.mimetype === 'application/octet-stream';

  if (extname || mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only Excel files (.xlsx, .xls) are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

module.exports = upload;
