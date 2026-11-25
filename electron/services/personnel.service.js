
const db = require('../lib/db');
const { rankOrder } = require('../lib/constants');

const subTables = [
    { name: 'importantJobs', tableName: 'important_jobs' },
    { name: 'serviceOperations', tableName: 'service_operations' },
    { name: 'decisiveStorm', tableName: 'decisive_storm' },
    { name: 'trainingCourses', tableName: 'training_courses' },
    { name: 'serviceHistory', tableName: 'service_history' },
    { name: 'medals', tableName: 'medals' },
    { name: 'languages', tableName: 'languages' },
    { name: 'children', tableName: 'children' },
    { name: 'brothers', tableName: 'brothers' },
    { name: 'sisters', tableName: 'sisters' },
    { name: 'mechanisms', tableName: 'mechanisms' },
];


function getSubTableData(personnelId, tableName) {
    const stmt = db.prepare(`SELECT * FROM ${tableName} WHERE personnel_id = ?`);
    return stmt.all(personnelId).map((item) => {
        delete item.id;
        delete item.personnel_id;
        return item;
    });
}

function deleteSubTableData(personnelId, tableName) {
    const stmt = db.prepare(`DELETE FROM ${tableName} WHERE personnel_id = ?`);
    stmt.run(personnelId);
}

function insertSubTableData(personnelId, tableName, data) {
    if (!data || data.length === 0) return;
    
    const keys = Object.keys(data[0]);
    if(keys.length === 0) return;

    const columns = ['personnel_id', ...keys].join(', ');
    const placeholders = ['?', ...keys.map(() => '?')].join(', ');
    
    const stmt = db.prepare(`INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`);
    
    const insertMany = db.transaction((items) => {
        for (const item of items) {
            const values = [personnelId, ...keys.map(k => item[k])];
            stmt.run(...values);
        }
    });

    insertMany(data);
}

const mapPersonnelFromDb = (p) => {
    if (!p) return p;
    const personnel = {
        ...p,
        phoneNumbers: p.phoneNumbers ? JSON.parse(p.phoneNumbers) : {},
    };

    subTables.forEach(tableInfo => {
        personnel[tableInfo.name] = getSubTableData(p.id, tableInfo.tableName);
    });
    
    return personnel;
};

// Helper to convert dates to ISO strings for DB storage
const toISO = (date) => {
    if (!date) return null;
    if (typeof date === 'string') return date; // Already a string
    return new Date(date).toISOString();
};


const mapPersonnelToDb = (data) => {
    const dbData = { ...data };
    
    // Map name correctly from form
    if ('fullName' in dbData) {
        dbData.name = dbData.fullName;
        delete dbData.fullName;
    }

    // Stringify JSON fields
    if (dbData.phoneNumbers) dbData.phoneNumbers = JSON.stringify(dbData.phoneNumbers);

    // Convert date objects to ISO strings
    const dateFields = [
        'appointmentDate', 'lastReturnDate', 'transferDate', 
        'reportingDate', 'dateOfBirth', 'statusDate'
    ];
    dateFields.forEach(field => {
        if (dbData[field]) dbData[field] = toISO(dbData[field]);
    });

    const mapTimeBasedArray = (arr) => {
      if(!arr) return [];
      return arr.map(item => ({ ...item, periodFrom: toISO(item.periodFrom), periodTo: toISO(item.periodTo) }))
    }

    subTables.forEach(table => {
        const key = table.name;
        if (dbData[key]) {
            if (['importantJobs', 'serviceOperations', 'decisiveStorm', 'trainingCourses', 'serviceHistory', 'mechanisms'].includes(key)) {
                dbData[key] = mapTimeBasedArray(dbData[key]);
            }
        }
    });

    return dbData;
};


async function getAllPersonnel() {
  const stmt = db.prepare('SELECT * FROM personnel');
  const personnelList = stmt.all();

  const fullPersonnelList = personnelList.map(p => mapPersonnelFromDb(p));

  const sortedData = fullPersonnelList.sort((a, b) => {
    const rankA = rankOrder[a.rank] || 99;
    const rankB = rankOrder[b.rank] || 99;
    return rankA - rankB;
  });

  return sortedData;
}

async function getPersonnelById(id) {
  const stmt = db.prepare('SELECT * FROM personnel WHERE id = ?');
  const person = stmt.get(id);
  return person ? mapPersonnelFromDb(person) : undefined;
}

async function addPersonnel(newPersonnelData) {
  const dbData = mapPersonnelToDb(newPersonnelData);

  const subTableData = {};
  subTables.forEach(table => {
      const key = table.name;
      if (dbData[key]) {
          subTableData[table.tableName] = dbData[key];
          delete dbData[key];
      }
  });
  
  const mainColumns = Object.keys(dbData).filter(k => k !== 'id');
  const mainPlaceholders = mainColumns.map(() => '?').join(', ');
  
  const stmt = db.prepare(`
    INSERT INTO personnel (${mainColumns.join(', ')})
    VALUES (${mainPlaceholders})
  `);
  
  const result = stmt.run(...mainColumns.map(k => dbData[k]));
  const newId = result.lastInsertRowid;

  Object.entries(subTableData).forEach(([tableName, data]) => {
    insertSubTableData(newId, tableName, data);
  });


  return (await getPersonnelById(newId));
}

async function updatePersonnel(id, updatedData) {
    const dbData = mapPersonnelToDb(updatedData);

    const subTableData = {};
    subTables.forEach(table => {
        const key = table.name;
        if (dbData.hasOwnProperty(key)) {
            subTableData[table.tableName] = dbData[key];
            delete dbData[key];
        }
    });

    const mainColumns = Object.keys(dbData).filter(k => k !== 'id');
    if (mainColumns.length > 0) {
      const setClause = mainColumns.map(k => `${k} = ?`).join(', ');
      const stmt = db.prepare(`UPDATE personnel SET ${setClause} WHERE id = ?`);
      stmt.run(...mainColumns.map(k => dbData[k]), id);
    }
    
    // Update sub-tables by deleting and re-inserting
    Object.entries(subTableData).forEach(([tableName, data]) => {
      deleteSubTableData(id, tableName);
      insertSubTableData(id, tableName, data);
    });

    return (await getPersonnelById(id));
}

async function deletePersonnel(id) {
    // Sub-table data will be deleted automatically due to ON DELETE CASCADE
    const stmt = db.prepare('DELETE FROM personnel WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
        throw new Error("Personnel not found to delete");
    }
}

module.exports = {
  getAllPersonnel,
  getPersonnelById,
  addPersonnel,
  updatePersonnel,
  deletePersonnel,
};
