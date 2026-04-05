const mongoose = require("mongoose");

const SUBJECTS_BY_GRADE = {
  7:  ["Filipino", "English", "Mathematics", "Science", "Araling Panlipunan (AP)", "MAPEH", "TLE", "ESP"],
  8:  ["Filipino", "English", "Mathematics", "Science", "Araling Panlipunan (AP)", "MAPEH", "TLE", "ESP"],
  9:  ["Filipino", "English", "Mathematics", "Science", "Araling Panlipunan (AP)", "MAPEH", "TLE", "ESP"],
  10: ["Filipino", "English", "Mathematics", "Science", "Araling Panlipunan (AP)", "MAPEH", "TLE", "ESP"],
  11: ["Oral Communication", "Reading & Writing", "21st Century Literature", "General Mathematics",
       "Earth & Life Science", "Physical Education & Health", "Personal Development",
       "Understanding Culture, Society & Politics"],
  12: ["Research / Practical Research", "Work Immersion",
       "English for Academic & Professional Purposes", "Filipino sa Piling Larangan",
       "Physical Education & Health", "Contemporary Philippine Arts", "Media & Information Literacy"],
};

const clearanceSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  gradeLevel: { type: Number, required: true },
  subjects: [
    {
      name:         { type: String, required: true },
      status:       { type: String, enum: ["cleared", "pending", "not_cleared"], default: "pending" },
      remarks:      { type: String, default: "" },
      clearedAt:    { type: Date },
      uploadedFile: { type: String, default: "" },   // filename stored on server
      uploadedAt:   { type: Date },
    },
  ],
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Clearance", clearanceSchema);
module.exports.SUBJECTS_BY_GRADE = SUBJECTS_BY_GRADE;
