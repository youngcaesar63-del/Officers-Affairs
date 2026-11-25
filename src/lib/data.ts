'use server';

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { Personnel, User, Role, Attachment, Activity, Backup, AutoBackupSettings, ActivityType } from './types';

// Ensure the directory exists
const dbDirectory = path.join(process.cwd(), 'db');
if (!fs.existsSync(dbDirectory)) {
    fs.mkdirSync(dbDirectory, { recursive: true });
}
const dbPath = path.join(dbDirectory, 'farad.db');

let db: Database.Database;
try {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
} catch (error) {
    console.error("Failed to connect to the database:", error);
    throw new Error("Could not initialize the database connection.");
}

// --- Schema Definition and Initialization ---
const schema = `
  -- Main Tables
  CREATE TABLE IF NOT EXISTS personnel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, cardId TEXT NOT NULL UNIQUE, rank TEXT NOT NULL, jobTitle TEXT, specialization TEXT,
      academicQualification TEXT, major TEXT, batch TEXT, administration TEXT, status TEXT NOT NULL,
      statusDetail TEXT, statusDate TEXT, appointmentDate TEXT, certificateType TEXT, lastReturnDate TEXT,
      transferDate TEXT, reportingDate TEXT, bloodType TEXT, maritalStatus TEXT, religion TEXT, notes TEXT,
      photo TEXT, dateOfBirth TEXT, nationalId TEXT, phoneNumbers TEXT, state TEXT, city TEXT, locality TEXT,
      address TEXT, nextOfKinName TEXT, nextOfKinPhone TEXT, nextOfKinAddress TEXT, fatherName TEXT,
      fatherAddress TEXT, motherName TEXT, wifeName TEXT
  );
  CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, password TEXT NOT NULL, role TEXT NOT NULL,
      lastLogin TEXT, status TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS roles ( name TEXT PRIMARY KEY, description TEXT, permissions TEXT NOT NULL );
  CREATE TABLE IF NOT EXISTS activity_log ( id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, timestamp TEXT NOT NULL );
  CREATE TABLE IF NOT EXISTS settings ( key TEXT PRIMARY KEY, value TEXT NOT NULL );
  CREATE TABLE IF NOT EXISTS attachments ( id TEXT PRIMARY KEY, personnel_id INTEGER NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL, size TEXT NOT NULL, uploadDate TEXT NOT NULL, dataUrl TEXT NOT NULL, FOREIGN KEY (personnel_id) REFERENCES personnel (id) ON DELETE CASCADE );

  -- Sub-tables with foreign key to personnel
  CREATE TABLE IF NOT EXISTS important_jobs ( id INTEGER PRIMARY KEY AUTOINCREMENT, personnel_id INTEGER NOT NULL, jobTitle TEXT, periodFrom TEXT, periodTo TEXT, FOREIGN KEY (personnel_id) REFERENCES personnel (id) ON DELETE CASCADE );
  CREATE TABLE IF NOT EXISTS service_operations ( id INTEGER PRIMARY KEY AUTOINCREMENT, personnel_id INTEGER NOT NULL, areaName TEXT, periodFrom TEXT, periodTo TEXT, FOREIGN KEY (personnel_id) REFERENCES personnel (id) ON DELETE CASCADE );
  CREATE TABLE IF NOT EXISTS decisive_storm ( id INTEGER PRIMARY KEY AUTOINCREMENT, personnel_id INTEGER NOT NULL, name TEXT, periodFrom TEXT, periodTo TEXT, FOREIGN KEY (personnel_id) REFERENCES personnel (id) ON DELETE CASCADE );
  CREATE TABLE IF NOT EXISTS training_courses ( id INTEGER PRIMARY KEY AUTOINCREMENT, personnel_id INTEGER NOT NULL, courseName TEXT, courseType TEXT, imperativeness TEXT, institute TEXT, periodFrom TEXT, periodTo TEXT, grade TEXT, FOREIGN KEY (personnel_id) REFERENCES personnel (id) ON DELETE CASCADE );
  CREATE TABLE IF NOT EXISTS service_history ( id INTEGER PRIMARY KEY AUTOINCREMENT, personnel_id INTEGER NOT NULL, unitName TEXT, jobTitle TEXT, periodFrom TEXT, periodTo TEXT, FOREIGN KEY (personnel_id) REFERENCES personnel (id) ON DELETE CASCADE );
  CREATE TABLE IF NOT EXISTS medals ( id INTEGER PRIMARY KEY AUTOINCREMENT, personnel_id INTEGER NOT NULL, name TEXT, FOREIGN KEY (personnel_id) REFERENCES personnel (id) ON DELETE CASCADE );
  CREATE TABLE IF NOT EXISTS languages ( id INTEGER PRIMARY KEY AUTOINCREMENT, personnel_id INTEGER NOT NULL, name TEXT, FOREIGN KEY (personnel_id) REFERENCES personnel (id) ON DELETE CASCADE );
  CREATE TABLE IF NOT EXISTS children ( id INTEGER PRIMARY KEY AUTOINCREMENT, personnel_id INTEGER NOT NULL, name TEXT, FOREIGN KEY (personnel_id) REFERENCES personnel (id) ON DELETE CASCADE );
  CREATE TABLE IF NOT EXISTS brothers ( id INTEGER PRIMARY KEY AUTOINCREMENT, personnel_id INTEGER NOT NULL, name TEXT, address TEXT, FOREIGN KEY (personnel_id) REFERENCES personnel (id) ON DELETE CASCADE );
  CREATE TABLE IF NOT EXISTS sisters ( id INTEGER PRIMARY KEY AUTOINCREMENT, personnel_id INTEGER NOT NULL, name TEXT, address TEXT, FOREIGN KEY (personnel_id) REFERENCES personnel (id) ON DELETE CASCADE );
  CREATE TABLE IF NOT EXISTS mechanisms ( id INTEGER PRIMARY KEY AUTOINCREMENT, personnel_id INTEGER NOT NULL, name TEXT, periodFrom TEXT, periodTo TEXT, FOREIGN KEY (personnel_id) REFERENCES personnel (id) ON DELETE CASCADE );
`;

db.exec(schema);

// Seed initial data in a transaction
db.transaction(() => {
    // Seed default user
    const user = db.prepare('SELECT id FROM users WHERE id = 1').get();
    if (!user) {
        db.prepare(`
            INSERT OR IGNORE INTO users (id, name, password, role, lastLogin, status) 
            VALUES (1, 'manager', 'manager123', 'مدير', 'لم يسجل دخول بعد', 'نشط')
        `).run();
    }
    // Seed default role
    const role = db.prepare('SELECT name FROM roles WHERE name = ?').get('مدير');
    if (!role) {
        const defaultPermissions = JSON.stringify([
            { id: 'p1', name: 'عرض لوحة التحكم', enabled: true },
            { id: 'p2', name: 'إدارة الضباط', enabled: true },
            { id: 'p3', name: 'إنشاء التقارير', enabled: true },
            { id: 'p4', name: 'إدارة المستخدمين والصلاحيات', enabled: true },
            { id: 'p5', name: 'الوصول للإعدادات المتقدمة', enabled: true },
        ]);
        db.prepare('INSERT OR IGNORE INTO roles (name, description, permissions) VALUES (?, ?, ?)').run('مدير', 'يمتلك جميع صلاحيات الوصول للنظام.', defaultPermissions);
    }
})();

// --- Helper Functions ---
const rankOrder: { [key: string]: number } = {
  'فريق أول': 1, 'فريق': 2, 'لواء': 3, 'عميد': 4, 'عقيد': 5, 'مقدم': 6, 'رائد': 7, 'نقيب': 8, 'ملازم أول': 9, 'ملازم': 10,
};

const subTables = [
    { name: 'importantJobs', tableName: 'important_jobs' }, { name: 'serviceOperations', tableName: 'service_operations' },
    { name: 'decisiveStorm', tableName: 'decisive_storm' }, { name: 'trainingCourses', tableName: 'training_courses' },
    { name: 'serviceHistory', tableName: 'service_history' }, { name: 'medals', tableName: 'medals' },
    { name: 'languages', tableName: 'languages' }, { name: 'children', tableName: 'children' },
    { name: 'brothers', tableName: 'brothers' }, { name: 'sisters', tableName: 'sisters' },
    { name: 'mechanisms', tableName: 'mechanisms' },
];

function getSubTableData(personnelId: number, tableName: string) {
    const stmt = db.prepare(`SELECT * FROM ${tableName} WHERE personnel_id = ?`);
    return stmt.all(personnelId).map((item: any) => {
        delete item.id;
        delete item.personnel_id;
        return item;
    });
}

function deleteSubTableData(personnelId: number, tableName: string) {
    db.prepare(`DELETE FROM ${tableName} WHERE personnel_id = ?`).run(personnelId);
}

function insertSubTableData(personnelId: number, tableName: string, data: any[]) {
    if (!data || data.length === 0) return;
    
    const keys = Object.keys(data[0]);
    if(keys.length === 0) return;

    const columns = ['personnel_id', ...keys].join(', ');
    const placeholders = ['@personnel_id', ...keys.map(k => `@${k}`)].join(', ');
    
    const stmt = db.prepare(`INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`);
    
    for (const item of data) {
        stmt.run({ personnel_id: personnelId, ...item });
    }
}

const addPersonnelTransaction = db.transaction((data: Partial<Personnel>) => {
    const { id, ...rest } = data; // Exclude id from the insert data
    const dbData = mapPersonnelToDb(rest);

    const subTableData: { [key: string]: any[] } = {};
    subTables.forEach(table => {
        if ((dbData as any)[table.name]) {
            subTableData[table.tableName] = (dbData as any)[table.name];
            delete (dbData as any)[table.name];
        }
    });

    const mainColumns = Object.keys(dbData);
    const stmt = db.prepare(`INSERT INTO personnel (${mainColumns.join(', ')}) VALUES (${mainColumns.map(k => `@${k}`).join(', ')})`);
    
    const result = stmt.run(dbData);
    const newId = result.lastInsertRowid as number;

    for (const [tableName, subData] of Object.entries(subTableData)) {
       insertSubTableData(newId, tableName, subData);
    }
    return newId;
});


const updatePersonnelTransaction = db.transaction((id: number, data: Partial<Personnel>) => {
    const dbData = mapPersonnelToDb(data);

    const subTableData: { [key: string]: any[] } = {};
    subTables.forEach(table => {
        if (dbData.hasOwnProperty(table.name)) {
            subTableData[table.tableName] = (dbData as any)[table.name];
            delete (dbData as any)[table.name];
        }
    });

    const mainColumns = Object.keys(dbData).filter(k => k !== 'id' && !subTables.some(st => st.name === k));
    if (mainColumns.length > 0) {
        const setClause = mainColumns.map(k => `${k} = @${k}`).join(', ');
        db.prepare(`UPDATE personnel SET ${setClause} WHERE id = @id`).run({ ...dbData, id });
    }

    for (const [tableName, subData] of Object.entries(subTableData)) {
        deleteSubTableData(id, tableName);
        insertSubTableData(id, tableName, data[tableName as keyof Personnel] as any[]);
    }
    return id;
});


function mapPersonnelFromDb(p: any): Personnel | undefined {
    if (!p) return undefined;
    const personnel: any = { ...p, phoneNumbers: p.phoneNumbers ? JSON.parse(p.phoneNumbers) : {} };
    for (const tableInfo of subTables) {
        personnel[tableInfo.name] = getSubTableData(p.id, tableInfo.tableName);
    }
    return personnel;
};

const toISO = (date: any) => date ? new Date(date).toISOString() : null;

const mapPersonnelToDb = (data: Partial<Personnel>) => {
    const dbData: any = { ...data };
    if ('fullName' in dbData) { dbData.name = dbData.fullName; delete dbData.fullName; }
    if (dbData.phoneNumbers) dbData.phoneNumbers = JSON.stringify(dbData.phoneNumbers);

    const dateFields = ['appointmentDate', 'lastReturnDate', 'transferDate', 'reportingDate', 'dateOfBirth', 'statusDate'];
    dateFields.forEach(field => { if (dbData[field]) dbData[field] = toISO(dbData[field]); });

    const mapTimeBasedArray = (arr: any[]) => arr?.map(item => ({ ...item, periodFrom: toISO(item.periodFrom), periodTo: toISO(item.periodTo) })) || [];
    
    subTables.forEach(table => {
        const key = table.name;
        if (dbData[key] && ['importantJobs', 'serviceOperations', 'decisiveStorm', 'trainingCourses', 'serviceHistory', 'mechanisms'].includes(key)) {
            dbData[key] = mapTimeBasedArray(dbData[key]);
        }
    });

    return dbData;
};

// --- Exported Functions ---

// --- Personnel ---
export async function getAllPersonnel(): Promise<Personnel[]> {
  const personnelList = db.prepare('SELECT * FROM personnel').all();
  return personnelList
    .map(p => mapPersonnelFromDb(p as any))
    .filter((p): p is Personnel => p !== undefined)
    .sort((a, b) => (rankOrder[a.rank] || 99) - (rankOrder[b.rank] || 99));
}

export async function getPersonnelById(id: number): Promise<Personnel | undefined> {
  const person = db.prepare('SELECT * FROM personnel WHERE id = ?').get(id);
  return mapPersonnelFromDb(person);
}

export async function addPersonnel(data: Partial<Personnel>): Promise<Personnel> {
    const newId = addPersonnelTransaction(data);
    const newPerson = await getPersonnelById(newId);
    if (!newPerson) throw new Error("Failed to retrieve the newly created personnel.");
    return newPerson;
}


export async function updatePersonnel(id: number, data: Partial<Personnel>): Promise<Personnel> {
    updatePersonnelTransaction(id, data);
    const updatedPerson = await getPersonnelById(id);
    if (!updatedPerson) throw new Error("Failed to retrieve the updated personnel.");
    return updatedPerson;
}

export async function deletePersonnel(id: number): Promise<void> {
    db.prepare('DELETE FROM personnel WHERE id = ?').run(id);
}

// --- Users ---
export async function getAllUsers(): Promise<User[]> {
  return db.prepare('SELECT id, name, role, lastLogin, status FROM users').all() as User[];
}

export async function login(username: string, password: string): Promise<User | null> {
    const user = db.prepare('SELECT * FROM users WHERE name = ?').get(username) as User | undefined;
    
    if (!user || user.password !== password) {
      return null;
    }
    
    db.prepare("UPDATE users SET lastLogin = ? WHERE id = ?").run(new Date().toISOString(), user.id);
    
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

export async function updateUser(id: number, updates: Partial<User>): Promise<User> {
    const setClause = Object.keys(updates).map(key => `${key} = @${key}`).join(', ');
    db.prepare(`UPDATE users SET ${setClause} WHERE id = @id`).run({ ...updates, id });
    const updatedUser = db.prepare('SELECT id, name, role, lastLogin, status FROM users WHERE id = ?').get(id) as User;
    if (!updatedUser) throw new Error("Failed to retrieve updated user.");
    return updatedUser;
}

export async function deleteUser(userId: number): Promise<void> {
    if (userId === 1) throw new Error("لا يمكن حذف حساب مدير النظام الافتراضي.");
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
}

export async function addUser(userData: Omit<User, 'id' | 'lastLogin' | 'status'>): Promise<User> {
    const { name, password, role } = userData;
    try {
        const result = db.prepare('INSERT INTO users (name, password, role, status, lastLogin) VALUES (?, ?, ?, ?, ?)').run(name, password, role, 'نشط', 'لم يسجل دخول بعد');
        return { id: result.lastInsertRowid as number, ...userData, status: 'نشط', lastLogin: 'لم يسجل دخول بعد' };
    } catch (error: any) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            throw new Error('اسم المستخدم هذا موجود بالفعل.');
        }
        throw error;
    }
}

// --- Attachments ---
export async function getAttachmentsForPersonnel(personnelId: number): Promise<Attachment[]> {
  return db.prepare('SELECT * FROM attachments WHERE personnel_id = ?').all(personnelId) as Attachment[];
}

export async function addAttachments(newAttachmentsData: Omit<Attachment, 'id'>[]): Promise<Attachment[]> {
  const addedAttachments: Attachment[] = newAttachmentsData.map((data, index) => ({
      ...data,
      id: `${data.personnelId}-${Date.now()}-${index}-${data.name}-${data.size}`,
  }));
  
  const stmt = db.prepare('INSERT INTO attachments (id, personnel_id, name, type, size, uploadDate, dataUrl) VALUES (@id, @personnelId, @name, @type, @size, @uploadDate, @dataUrl)');
  db.transaction((attachments) => {
    for (const attachment of attachments) stmt.run(attachment);
  })(addedAttachments);
  return addedAttachments;
}

export async function updateAttachment(attachmentId: string, updates: Partial<Attachment>): Promise<Attachment> {
    const setClause = Object.keys(updates).map(key => `${key} = @${key}`).join(', ');
    db.prepare(`UPDATE attachments SET ${setClause} WHERE id = @id`).run({ ...updates, id: attachmentId });
    const attachment = db.prepare('SELECT * FROM attachments WHERE id = ?').get(attachmentId) as Attachment;
    if (!attachment) throw new Error("Failed to retrieve updated attachment.");
    return attachment;
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
    db.prepare('DELETE FROM attachments WHERE id = ?').run(attachmentId);
}

// --- Activity Log ---
export async function logActivity(type: ActivityType, description: string, details?: string): Promise<void> {
    const typeToTitleMap: { [key in ActivityType]: string } = {
        add_personnel: 'تمت إضافة ضابط جديد', edit_personnel: 'تم تعديل بيانات ضابط', delete_personnel: 'تم حذف ضابط',
        create_report: 'تم إنشاء تقرير', promotion: 'ترقية ضابط',
    };
    const newActivity: Activity = {
        id: `activity-${Date.now()}`, type, title: typeToTitleMap[type] || 'نشاط جديد',
        description: `${description}${details ? ` - ${details}` : ''}`, timestamp: new Date().toISOString(),
    };
    db.prepare('INSERT INTO activity_log (id, type, title, description, timestamp) VALUES (?, ?, ?, ?, ?)').run(newActivity.id, newActivity.type, newActivity.title, newActivity.description, newActivity.timestamp);
    db.prepare(`DELETE FROM activity_log WHERE id NOT IN (SELECT id FROM activity_log ORDER BY timestamp DESC LIMIT 50)`).run();
}

export async function getActivityLog(): Promise<Activity[]> {
    return db.prepare('SELECT * FROM activity_log ORDER BY timestamp DESC').all() as Activity[];
}

// --- Backup ---
export async function getBackups(): Promise<Backup[]> {
    const results = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'backup-%' ORDER BY JSON_EXTRACT(value, '$.date') DESC").all() as {key: string, value: string}[];
    return results.map(b => {
        const val = JSON.parse(b.value);
        return { id: val.id, date: val.date, size: val.size, status: val.status };
    });
}

export async function getBackupData(backupId: string): Promise<any> {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(`backup-${backupId}`) as {value:string} | undefined;
    return row ? JSON.parse(row.value).data : null;
}

export async function createBackup(): Promise<{ dataString: string }> {
    const allData: { [key: string]: any[] } = {};
    const tables = ['personnel', 'important_jobs', 'service_operations', 'decisive_storm', 'training_courses', 'service_history', 'medals', 'languages', 'children', 'brothers', 'sisters', 'mechanisms', 'attachments', 'users', 'roles', 'activity_log'];
    for (const table of tables) {
        allData[table] = db.prepare(`SELECT * FROM ${table}`).all();
    }
    allData['settings'] = db.prepare("SELECT * FROM settings WHERE key NOT LIKE 'backup-%'").all();
    const dataString = JSON.stringify(allData, null, 2);
    const sizeInMB = (Buffer.byteLength(dataString, 'utf8') / (1024 * 1024)).toFixed(2);
    
    const backupId = Date.now().toString();
    const newBackup = { id: backupId, date: new Date().toISOString(), size: `${sizeInMB} MB`, status: 'مكتمل' as const, data: allData };
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(`backup-${backupId}`, JSON.stringify(newBackup));
    return { dataString };
}

export async function restoreBackup(restoredData: any): Promise<void> {
    if (!restoredData.personnel || !restoredData.roles) throw new Error("Invalid backup file structure.");
    
    db.transaction(() => {
        const tables = ['personnel', 'important_jobs', 'service_operations', 'decisive_storm', 'training_courses', 'service_history', 'medals', 'languages', 'children', 'brothers', 'sisters', 'mechanisms', 'attachments', 'users', 'roles', 'activity_log', 'settings'];
        for (const table of tables) {
             if (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?;").get(table)) {
                db.prepare(`DELETE FROM ${table}`).run();
            }
        }

        for (const table of tables) {
            if (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?;").get(table)) {
                if (restoredData[table] && restoredData[table].length > 0) {
                    const columns = Object.keys(restoredData[table][0]);
                    const stmt = db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(c => `@${c}`).join(', ')})`);
                    for (const row of restoredData[table]) {
                        stmt.run(row);
                    }
                }
            }
        }
    })();
}

export async function deleteBackup(backupId: string): Promise<void> {
    db.prepare("DELETE FROM settings WHERE key = ?").run(`backup-${backupId}`);
}

export async function getAutoBackupSettings(): Promise<AutoBackupSettings> {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'autoBackupSettings'").get() as {value: string} | undefined;
    return row ? JSON.parse(row.value) : { enabled: false, frequency: 'weekly' };
}

export async function saveAutoBackupSettings(newSettings: AutoBackupSettings): Promise<void> {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('autoBackupSettings', ?)").run(JSON.stringify(newSettings));
}

// --- Roles ---
export async function getAllRoles(): Promise<Role[]> {
    let rolesFromDb = db.prepare('SELECT * FROM roles').all() as any[];

    if (rolesFromDb.length === 0) {
        const defaultManagerRole = {
            name: 'مدير', description: 'يمتلك جميع صلاحيات الوصول للنظام.',
            permissions: [
                { id: 'p1', name: 'عرض لوحة التحكم', enabled: true }, { id: 'p2', name: 'إدارة الضباط', enabled: true },
                { id: 'p3', name: 'إنشاء التقارير', enabled: true }, { id: 'p4', name: 'إدارة المستخدمين والصلاحيات', enabled: true },
                { id: 'p5', name: 'الوصول للإعدادات المتقدمة', enabled: true },
            ],
        };
        db.prepare('INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)').run(defaultManagerRole.name, defaultManagerRole.description, JSON.stringify(defaultManagerRole.permissions));
        rolesFromDb = [{ ...defaultManagerRole, permissions: JSON.stringify(defaultManagerRole.permissions) }];
    }

    return rolesFromDb.map(role => ({ ...role, permissions: JSON.parse(role.permissions) }));
}

export async function saveRole(role: { isEditing: boolean, name: string, description: string, permissions: any[] }): Promise<Role[]> {
    const { isEditing, name, description, permissions } = role;
    const permissionsJson = JSON.stringify(permissions);

    if (isEditing) {
        db.prepare('UPDATE roles SET description = ?, permissions = ? WHERE name = ?').run(description, permissionsJson, name);
    } else {
        if (db.prepare('SELECT * FROM roles WHERE name = ?').get(name)) throw new Error('Role already exists');
        db.prepare('INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)').run(name, description, permissionsJson);
    }
    return getAllRoles();
}

export async function updatePermission(roleName: string, permissionId: string, enabled: boolean): Promise<Role[]> {
    const roleToUpdate = db.prepare('SELECT * FROM roles WHERE name = ?').get(roleName) as any;
    if (!roleToUpdate) throw new Error('Role not found');
    
    const permissions = JSON.parse(roleToUpdate.permissions);
    const updatedPermissions = permissions.map((p: any) => p.id === permissionId ? { ...p, enabled } : p);
    
    db.prepare('UPDATE roles SET permissions = ? WHERE name = ?').run(JSON.stringify(updatedPermissions), roleName);
    return getAllRoles();
}
