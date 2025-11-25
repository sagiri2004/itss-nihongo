const bcrypt = require('bcryptjs');

// Định nghĩa số vòng salt cho bcrypt
const SALT_ROUNDS = 10;

/**
 * Hàm băm mật khẩu
 * @param {string} password - Mật khẩu gốc cần băm
 * @returns {Promise<string>} - Trả về một Promise chứa mật khẩu đã được băm
 */
async function hashPassword(password) {
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return hash;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Error hashing password');
  }
}

/**
 * Hàm so sánh mật khẩu với hash đã lưu
 * @param {string} password - Mật khẩu gốc người dùng nhập vào
 * @param {string} hashedPassword - Hash đã lưu trong cơ sở dữ liệu
 * @returns {Promise<boolean>} - Trả về một Promise chứa kết quả true nếu mật khẩu đúng, ngược lại false
 */
async function comparePasswords(password, hashedPassword) {
  try {
    const match = await bcrypt.compare(password, hashedPassword);
    return match;
  } catch (error) {
    console.error('Error comparing passwords:', error);
    throw new Error('Error comparing passwords');
  }
}

// Xuất các hàm để sử dụng ở các file khác
module.exports = {
  hashPassword,
  comparePasswords
};