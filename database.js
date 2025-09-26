const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./blog.db", (err) => {
    if (err) {
        console.error("❌ Error opening database:", err.message);
    } else {
        console.log("✅ Connected to SQLite database.");

        // إنشاء جدول الأقسام
        db.run(
            `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE
      )`,
            (err) => {
                if (err) console.error("❌ Error creating categories:", err.message);
                else console.log("✅ Categories table ready.");
            }
        );

        // إنشاء جدول البوستات مرتبط بالأقسام
        db.run(
            `CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        content TEXT,
        category_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )`,
            (err) => {
                if (err) console.error("❌ Error creating posts:", err.message);
                else console.log("✅ Posts table ready.");
            }
        );
    }
});

module.exports = db;
