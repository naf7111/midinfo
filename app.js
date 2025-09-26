const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./database");

const app = express();

// ✅ Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public")); // يخدم ملفات: index.html, admin.html, post.html

// =============================
// 📂 إدارة الأقسام
// =============================

// إضافة قسم
app.post("/api/categories", (req, res) => {
    const { name } = req.body;
    db.run("INSERT INTO categories (name) VALUES (?)", [name], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name });
    });
});

// جلب الأقسام
app.get("/api/categories", (req, res) => {
    db.all("SELECT * FROM categories", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// =============================
// 📝 إدارة البوستات
// =============================

// إضافة بوست
app.post("/api/posts", (req, res) => {
    const { title, content, category_id } = req.body;
    db.run(
        "INSERT INTO posts (title, content, category_id) VALUES (?, ?, ?)",
        [title, content, category_id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, title, content, category_id });
        }
    );
});

// جلب كل البوستات مع اسم القسم
app.get("/api/posts", (req, res) => {
    const query = `
    SELECT posts.*, categories.name as category
    FROM posts
    LEFT JOIN categories ON posts.category_id = categories.id
    ORDER BY created_at DESC
  `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ✅ جلب بوست واحد بالتفصيل
app.get("/api/posts/:id", (req, res) => {
    const { id } = req.params;
    const query = `
    SELECT posts.*, categories.name as category
    FROM posts
    LEFT JOIN categories ON posts.category_id = categories.id
    WHERE posts.id = ?
  `;
    db.get(query, [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "البوست غير موجود" });
        res.json(row);
    });
});

// ✅ Start server if run directly
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`✅ Server started on http://localhost:${PORT}`);
    });
}

// ✅ Export app for modular use (if needed)
module.exports = app;
