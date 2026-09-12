const Database = require('better-sqlite3');
const db = new Database('./backend/database.sqlite');
db.exec("DROP TABLE IF EXISTS question_bank_automation_settings; DROP TABLE IF EXISTS question_bank_automation_logs;");
console.log("Tables dropped");
