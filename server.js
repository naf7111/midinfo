// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const db = require('./database.js'); // ملف الاتصال بقاعدة البيانات
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public')); // لتوصيل الملفات الثابتة (HTML, CSS, JS)

// CORS (مهم لطلبات API من المتصفح)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// تسجيل جميع الطلبات للتشخيص
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 1. API للأقسام
app.get('/api/categories', (req, res) => {
    db.all("SELECT * FROM categories", [], (err, rows) => {
        if (err) {
            console.error("❌ خطأ في جلب الأقسام:", err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log(`✅ جلب ${rows.length} قسم`);
        res.json(rows);
    });
});

app.post('/api/categories', (req, res) => {
    const { name } = req.body;

    if (!name || name.trim() === '') {
        console.log("❌ محاولة إضافة قسم بدون اسم");
        return res.status(400).json({ error: 'اسم القسم مطلوب' });
    }

    db.run(
        `INSERT INTO categories (name) VALUES (?)`,
        [name.trim()],
        function (err) {
            if (err) {
                console.error("❌ خطأ في إضافة القسم:", err.message);

                if (err.message.includes('UNIQUE constraint failed')) {
                    res.status(400).json({ error: 'القسم موجود مسبقًا' });
                } else {
                    res.status(400).json({ error: err.message });
                }
                return;
            }

            console.log(`✅ تم إضافة القسم: ${name} (ID: ${this.lastID})`);
            res.status(201).json({ id: this.lastID, name });
        }
    );
});

// 2. API للبوستات
app.get('/api/posts', (req, res) => {
    const sql = `
    SELECT posts.*, categories.name as category 
    FROM posts 
    LEFT JOIN categories ON posts.category_id = categories.id
    ORDER BY posts.id DESC
  `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("❌ خطأ في جلب البوستات:", err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log(`✅ جلب ${rows.length} بوست`);
        res.json(rows);
    });
});

app.get('/api/posts/:id', (req, res) => {
    const id = req.params.id;
    const sql = `
    SELECT posts.*, categories.name as category 
    FROM posts 
    LEFT JOIN categories ON posts.category_id = categories.id
    WHERE posts.id = ?
  `;

    db.get(sql, [id], (err, row) => {
        if (err) {
            console.error(`❌ خطأ في جلب البوست ${id}:`, err.message);
            return res.status(500).json({ error: err.message });
        }

        if (!row) {
            console.log(`❌ البوست ${id} غير موجود`);
            return res.status(404).json({ error: 'البوست غير موجود' });
        }

        console.log(`✅ جلب البوست ${id}`);
        res.json(row);
    });
});

app.post('/api/posts', (req, res) => {
    const { title, content, category_id } = req.body;

    if (!title || !content) {
        console.log("❌ محاولة نشر بوست بدون عنوان أو محتوى");
        return res.status(400).json({
            error: 'العنوان والمحتوى مطلوبان'
        });
    }

    db.run(
        `INSERT INTO posts (title, content, category_id) VALUES (?, ?, ?)`,
        [title, content, category_id || null],
        function (err) {
            if (err) {
                console.error("❌ خطأ في نشر البوست:", err.message);
                return res.status(400).json({ error: err.message });
            }

            console.log(`✅ تم نشر البوست (ID: ${this.lastID})`);
            res.status(201).json({ id: this.lastID });
        }
    );
});

app.delete('/api/posts/:id', (req, res) => {
    const id = req.params.id;

    console.log(`جارٍ حذف البوست مع المعرف: ${id}`);

    db.run(
        `DELETE FROM posts WHERE id = ?`,
        id,
        function (err) {
            if (err) {
                console.error(`❌ خطأ في حذف البوست ${id}:`, err.message);
                return res.status(400).json({ error: err.message });
            }

            if (this.changes === 0) {
                console.log(`❌ لم يتم العثور على البوست ${id}`);
                return res.status(404).json({ error: 'البوست غير موجود' });
            }

            console.log(`✅ تم حذف البوست ${id}`);
            res.json({ deleted: this.changes });
        }
    );
});

// 3. نقطة نهاية للاختبار
app.get('/api/test', (req, res) => {
    res.json({ status: 'ok', message: 'الخادم يعمل بشكل صحيح' });
});

// 4. معالجة المسارات غير المعرفة
app.use((req, res) => {
    console.error(`❌ المسار غير موجود: ${req.method} ${req.url}`);

    if (req.url.startsWith('/api/')) {
        res.status(404).json({
            error: `المسار غير موجود: ${req.url}`,
            hint: 'تأكد من تشغيل الخادم وفتح الملفات عبر http://localhost:3000'
        });
    } else {
        res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>404 - غير موجود</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
          h1 { color: #d32f2f; }
          .hint { background: #fff8e1; padding: 20px; border-radius: 8px; margin-top: 30px; text-align: left; }
        </style>
      </head>
      <body>
        <h1>404 - الصفحة غير موجودة</h1>
        <p>المسار: ${req.method} ${req.url}</p>
        
        <div class="hint">
          <h3>السبب المحتمل:</h3>
          <ul style="text-align: right; direction: rtl; list-style-position: inside;">
            <li>أنت تفتح الملف كـ file:// بدلًا من http://</li>
            <li>الخادم لا يعمل أو يعمل على منفذ مختلف</li>
            <li>هيكل الملفات غير صحيح</li>
          </ul>
          
          <h3>الحل:</h3>
          <ol style="text-align: right; direction: rtl; list-style-position: inside;">
            <li>شغّل الخادم: node server.js</li>
            <li>افتح الملف عبر: http://localhost:3000/admin.html</li>
            <li>تأكد من هيكل الملفات:</li>
          </ol>
          <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; text-align: left; direction: ltr;">
project/
├── server.js
├── database.js
├── blog.db
└── public/
    ├── admin.html
    ├── index.html
    └── post.html</pre>
        </div>
      </body>
      </html>
    `);
    }
});

// تشغيل الخادم
app.listen(port, () => {
    console.log(`\n🚀 الخادم يعمل على http://localhost:${port}`);
    console.log('✅ يمكنك الآن فتح:');
    console.log('   - http://localhost:3000/admin.html');
    console.log('   - http://localhost:3000/index.html');
    console.log('   - http://localhost:3000/post.html?id=1 (لعرض بوست محدد)\n');

    // اختبار بسيط
    console.log('🔍 جارٍ اختبار نقاط النهاية...');
    console.log('   - /api/categories (GET)');
    console.log('   - /api/posts (GET, POST, DELETE)');
    console.log('   - /api/test (GET)\n');
});

// إغلاق قاعدة البيانات عند إيقاف الخادم
process.on('SIGINT', () => {
    console.log('\n🔌 جارٍ إغلاق قاعدة البيانات...');
    db.close((err) => {
        if (err) {
            console.error('❌ خطأ في إغلاق قاعدة البيانات:', err.message);
        } else {
            console.log('✅ تم إغلاق قاعدة البيانات بنجاح');
        }
        process.exit(0);
    });
});