const { createUpload, getPublicUrl } = require('./upload.config');

const upload = createUpload('avatar');
const attendanceUpload = createUpload('attendance');
const resumeUpload = createUpload('resume');
const productUpload = createUpload('product');

module.exports = { 
    upload, 
    attendanceUpload, 
    resumeUpload,
    productUpload,
    getPublicUrl
};