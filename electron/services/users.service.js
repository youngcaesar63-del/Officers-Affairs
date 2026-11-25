
const db = require('../lib/db');

async function getAllUsers() {
  const stmt = db.prepare('SELECT id, name, role, lastLogin, status FROM users');
  const users = stmt.all();
  return users;
}

async function login(username, password) {
    const stmt = db.prepare('SELECT * FROM users WHERE name = ?');
    const user = stmt.get(username);
    
    if (!user || user.password !== password) {
      throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة.");
    }

    // Update last login
    const updateStmt = db.prepare("UPDATE users SET lastLogin = ? WHERE id = ?");
    updateStmt.run(new Date().toISOString(), user.id);
    
    // Return user object without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

async function updateUser(id, updates) {
    const setClause = Object.keys(updates).map(key => `${key} = @${key}`).join(', ');
    const stmt = db.prepare(`UPDATE users SET ${setClause} WHERE id = @id`);
    
    const result = stmt.run({ ...updates, id });

    if (result.changes === 0) {
        throw new Error("User not found");
    }
    
    const getStmt = db.prepare('SELECT id, name, role, lastLogin, status FROM users WHERE id = ?');
    return getStmt.get(id);
}

async function deleteUser(userId) {
    if (userId === 1) {
        throw new Error("لا يمكن حذف حساب مدير النظام الافتراضي.");
    }
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(userId);
    if (result.changes === 0) {
        throw new Error("User not found to delete.");
    }
}

async function addUser(userData) {
    const { name, password, role } = userData;
    const stmt = db.prepare('INSERT INTO users (name, password, role, status, lastLogin) VALUES (?, ?, ?, ?, ?)');
    try {
        const result = stmt.run(name, password, role, 'نشط', 'لم يسجل دخول بعد');
        return { id: result.lastInsertRowid, ...userData };
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            throw new Error('اسم المستخدم هذا موجود بالفعل.');
        }
        throw error;
    }
}

module.exports = {
  getAllUsers,
  login,
  updateUser,
  deleteUser,
  addUser,
};
