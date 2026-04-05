const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const jwt      = require("jsonwebtoken");
const multer   = require("multer");
const path     = require("path");
const fs       = require("fs");
require("dotenv").config();

const User          = require("./models/User");
const ClearanceModel = require("./models/Clearance");
const Clearance      = ClearanceModel;
const SUBJECTS_BY_GRADE = ClearanceModel.SUBJECTS_BY_GRADE;

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded files statically
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use("/uploads", express.static(uploadsDir));

// Multer config – store files in server/uploads/
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error("Only JPG, PNG, and PDF files are allowed."));
  },
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// ── Auth middleware ───────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ message: "Unauthorized" });
  try {
    req.user = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// ── Test ─────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.send("API is running"));

// ── REGISTER ─────────────────────────────────────────────────────────────────
app.post("/api/register", async (req, res) => {
  const { username, password, email, idNumber, gradeLevel, section } = req.body;

  if (!username || !password || !email || !idNumber || !gradeLevel || !section)
    return res.status(400).json({ message: "All fields are required." });

  const grade = parseInt(gradeLevel);
  if (grade < 7 || grade > 12)
    return res.status(400).json({ message: "Grade level must be 7–12." });

  try {
    const existing = await User.findOne({ $or: [{ username }, { email }, { idNumber }] });
    if (existing) {
      if (existing.username === username) return res.status(400).json({ message: "Username already exists." });
      if (existing.email === email)       return res.status(400).json({ message: "Email already registered." });
      if (existing.idNumber === idNumber) return res.status(400).json({ message: "ID number already registered." });
    }

    const newUser = new User({ username, password, email, idNumber, gradeLevel: grade, section, role: "student" });
    await newUser.save();

    const subjects = (SUBJECTS_BY_GRADE[grade] || []).map((name) => ({ name }));
    await Clearance.create({ userId: newUser._id, gradeLevel: grade, subjects });

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// ── LOGIN (email-based, role-aware) ──────────────────────────────────────────
app.post("/api/login", async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role)
    return res.status(400).json({ message: "Email, password and role are required." });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "No account found with that email." });

    if (user.role !== role)
      return res.status(403).json({ message: `This account is not registered as a ${role}.` });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Incorrect password." });

    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email,
        gradeLevel: user.gradeLevel, section: user.section,
        idNumber: user.idNumber, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ message: "Login successful", token, role: user.role });
  } catch (error) {
    res.status(500).json({ message: "Error logging in" });
  }
});

// ── GET clearance ─────────────────────────────────────────────────────────────
app.get("/api/clearance", authMiddleware, async (req, res) => {
  try {
    let clearance = await Clearance.findOne({ userId: req.user.id });
    if (!clearance) {
      const user = await User.findById(req.user.id);
      const grade = user ? user.gradeLevel : 7;
      const subjects = (SUBJECTS_BY_GRADE[grade] || []).map((name) => ({ name }));
      clearance = await Clearance.create({ userId: req.user.id, gradeLevel: grade, subjects });
    }
    res.json(clearance);
  } catch (error) {
    res.status(500).json({ message: "Error fetching clearance" });
  }
});

// ── UPLOAD clearance file for a subject ───────────────────────────────────────
app.post("/api/clearance/upload/:subjectIndex", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const idx = parseInt(req.params.subjectIndex);
    const clearance = await Clearance.findOne({ userId: req.user.id });
    if (!clearance) return res.status(404).json({ message: "Clearance record not found." });
    if (!clearance.subjects[idx]) return res.status(400).json({ message: "Subject not found." });
    if (clearance.subjects[idx].status === "cleared")
      return res.status(400).json({ message: "Subject is already cleared." });

    // Delete old file if it exists
    if (clearance.subjects[idx].uploadedFile) {
      const oldPath = path.join(uploadsDir, clearance.subjects[idx].uploadedFile);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    clearance.subjects[idx].uploadedFile = req.file.filename;
    clearance.subjects[idx].uploadedAt   = new Date();
    clearance.updatedAt = new Date();
    await clearance.save();

    res.json({ message: "File uploaded successfully.", filename: req.file.filename });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));
