const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json()); // Parse JSON data
app.use(express.urlencoded({ extended: true })); // Parse form data
app.use(cors());

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MySQL Database Connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "php",
});

db.connect((err) => {
    if (err) {
        console.error("❌ Database Connection Failed:", err.message);
        return;
    }
    console.log("✅ Connected to MySQL Database");
});

// Multer Storage Configuration for Image Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

// 📌 API: Submit an Issue
app.post("/submit-issue", upload.single("image"), (req, res) => {
    console.log("📌 Received Data:", req.body);

    const { name, email, issue_type, ph_level, issue_description } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    if (!name || !email || !issue_type) {
        return res.status(400).json({ message: "❌ Missing required fields" });
    }

    const phValue = issue_type.toLowerCase() === "water" ? parseFloat(ph_level) || null : null;

    console.log("📌 Storing in DB:", { name, email, issue_type, phValue, issue_description, imagePath });

    const sql = `
        INSERT INTO issues1 (name, email, issue_type, ph_level, issue_description, image_path) 
        VALUES (?, ?, ?, ?, ?, ?);
    `;
    const values = [name, email, issue_type, phValue, issue_description || "No description", imagePath];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("❌ Database Error:", err.sqlMessage);
            return res.status(500).json({ message: "Database error", error: err.sqlMessage });
        }
        res.json({ message: "✅ Issue submitted successfully!" });
    });
});

// 📌 API: Get All Issues
app.get("/get-issues", (req, res) => {
    db.query("SELECT * FROM issues1", (err, results) => {
        if (err) {
            console.error("❌ Database Fetch Error:", err.message);
            return res.status(500).json({ message: "Database fetch error" });
        }
        res.json(results);
    });
});

// 📌 API: Update Issue Status
app.post("/update-status", (req, res) => {
    const { id, status } = req.body;

    if (!id || !status) {
        return res.status(400).json({ message: "❌ Missing required fields" });
    }

    console.log(`Updating issue ID: ${id} with status: ${status}`);

    db.query("UPDATE issues1 SET status = ? WHERE id = ?", [status, id], (err, result) => {
        if (err) {
            console.error("❌ Database Update Error:", err.message);
            return res.status(500).json({ message: "Database update error", error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "❌ Issue ID not found" });
        }

        res.json({ success: true, message: "✅ Status updated successfully!" });
    });
});


// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
