import React, { useState } from "react";
import {
  TextField,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  CircularProgress,
} from "@mui/material";
import { Link } from "react-router-dom";
import "./register.css";

const GRADE_LEVELS = [7, 8, 9, 10, 11, 12];

function Register() {
  const [form, setForm] = useState({
    username: "",
    password: "",
    email: "",
    idNumber: "",
    gradeLevel: "",
    section: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Registered successfully! Please log in.");
        window.location.href = "/";
      } else {
        setError(data.message || "Registration failed.");
      }
    } catch (err) {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="register-page">
      <div id="register-card">
        <div className="register-header">
          <span className="register-logo">🎓</span>
          <h2 className="register-title">Student Registration</h2>
          <p className="register-subtitle">Create your clearance system account</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          {/* Row 1 – ID & Email */}
          <div className="register-row">
            <TextField
              required
              label="Student ID Number"
              name="idNumber"
              variant="outlined"
              fullWidth
              value={form.idNumber}
              onChange={handleChange}
              placeholder="e.g. 2024-00123"
            />
            <TextField
              required
              label="Email Address"
              name="email"
              type="email"
              variant="outlined"
              fullWidth
              value={form.email}
              onChange={handleChange}
              placeholder="e.g. juan@school.edu.ph"
            />
          </div>

          {/* Row 2 – Grade & Section */}
          <div className="register-row">
            <FormControl required fullWidth variant="outlined">
              <InputLabel id="grade-label">Grade Level</InputLabel>
              <Select
                labelId="grade-label"
                name="gradeLevel"
                value={form.gradeLevel}
                onChange={handleChange}
                label="Grade Level"
              >
                {GRADE_LEVELS.map((g) => (
                  <MenuItem key={g} value={g}>
                    Grade {g}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              required
              label="Section"
              name="section"
              variant="outlined"
              fullWidth
              value={form.section}
              onChange={handleChange}
              placeholder="e.g. Sampaguita"
            />
          </div>

          {/* Row 3 – Username */}
          <TextField
            required
            label="Username"
            name="username"
            variant="outlined"
            fullWidth
            value={form.username}
            onChange={handleChange}
          />

          {/* Row 4 – Password */}
          <TextField
            required
            label="Password"
            name="password"
            type="password"
            variant="outlined"
            fullWidth
            value={form.password}
            onChange={handleChange}
          />

          {error && <p className="register-error">⚠ {error}</p>}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            className="register-btn"
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : "Create Account"}
          </Button>

          <p className="register-footer">
            Already have an account? <Link to="/">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Register;
