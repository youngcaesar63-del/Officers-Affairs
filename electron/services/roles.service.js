
const db = require('../lib/db');

const getAllRoles = () => {
    let rolesFromDb = db.prepare('SELECT * FROM roles').all();

    if (rolesFromDb.length === 0) {
        const defaultManagerRole = {
            name: 'مدير',
            description: 'يمتلك جميع صلاحيات الوصول للنظام.',
            permissions: [
                { id: 'p1', name: 'عرض لوحة التحكم', enabled: true },
                { id: 'p2', name: 'إدارة الضباط', enabled: true },
                { id: 'p3', name: 'إنشاء التقارير', enabled: true },
                { id: 'p4', name: 'إدارة المستخدمين والصلاحيات', enabled: true },
                { id: 'p5', name: 'الوصول للإعدادات المتقدمة', enabled: true },
            ],
        };
        const stmt = db.prepare('INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)');
        stmt.run(defaultManagerRole.name, defaultManagerRole.description, JSON.stringify(defaultManagerRole.permissions));
        rolesFromDb = [defaultManagerRole];
    }

    const parsedRoles = rolesFromDb.map(role => ({
        ...role,
        permissions: typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions
    }));

    return parsedRoles;
};

const saveRole = (role) => {
    const { isEditing, name, description, permissions } = role;
    const permissionsJson = JSON.stringify(permissions);

    if (isEditing) {
        const stmt = db.prepare('UPDATE roles SET description = ?, permissions = ? WHERE name = ?');
        stmt.run(description, permissionsJson, name);
    } else {
        const existingRole = db.prepare('SELECT * FROM roles WHERE name = ?').get(name);
        if (existingRole) {
            throw new Error('Role already exists');
        }
        const stmt = db.prepare('INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)');
        stmt.run(name, description, permissionsJson);
    }
    return getAllRoles();
};

const updatePermission = (roleName, permissionId, enabled) => {
    const roleToUpdate = db.prepare('SELECT * FROM roles WHERE name = ?').get(roleName);
    if (!roleToUpdate) {
        throw new Error('Role not found');
    }

    const permissions = JSON.parse(roleToUpdate.permissions);
    const updatedPermissions = permissions.map(p =>
        p.id === permissionId ? { ...p, enabled } : p
    );

    const stmt = db.prepare('UPDATE roles SET permissions = ? WHERE name = ?');
    stmt.run(JSON.stringify(updatedPermissions), roleName);
    return getAllRoles();
};

module.exports = {
    getAllRoles,
    saveRole,
    updatePermission,
};
