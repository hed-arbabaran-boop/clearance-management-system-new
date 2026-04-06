import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./StudentDashboard.css";

/* ── helpers ── */
const STATUS_LABEL = { cleared: "Cleared", pending: "Pending", not_cleared: "Not Cleared" };
const STATUS_ICON  = { cleared: "✔", pending: "⏳", not_cleared: "✖" };

function decodeToken(token) {
  try { return JSON.parse(atob(token.split(".")[1])); }
  catch { return {}; }
}

/* ══════════════════════════════════════════════════════════════════════════════
   SUBJECT MODAL
══════════════════════════════════════════════════════════════════════════════ */
function SubjectModal({ subject, index, onClose, onUploadDone }) {
  const [file,      setFile]      = useState(null);
  const [uploading, setUploading] = useState(false);
  const [msg,       setMsg]       = useState("");
  const [isError,   setIsError]   = useState(false);
  const fileRef = useRef();

  if (!subject) return null;
  const isCleared   = subject.status === "cleared";
  const hasUploaded = !!subject.uploadedFile;

  async function handleUpload() {
    if (!file) return;
    setUploading(true); setMsg(""); setIsError(false);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/clearance/upload/${index}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setMsg("✔ File submitted successfully! Waiting for teacher review.");
        setIsError(false);
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
        onUploadDone();
      } else {
        setMsg(data.message || "Upload failed.");
        setIsError(true);
      }
    } catch {
      setMsg("Could not connect to server.");
      setIsError(true);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className={`modal-status-banner modal-banner-${subject.status}`}>
          <span className="modal-status-icon">{STATUS_ICON[subject.status]}</span>
          <span className="modal-status-text">{STATUS_LABEL[subject.status]}</span>
        </div>

        <h2 className="modal-subject-name">{subject.name}</h2>

        {subject.remarks && (
          <div className="modal-remarks">
            <span className="modal-remarks-label">Teacher's Remarks</span>
            <p className="modal-remarks-text">{subject.remarks}</p>
          </div>
        )}

        {isCleared ? (
          <div className="modal-cleared-block">
            <span className="modal-cleared-icon">🎉</span>
            <p className="modal-cleared-text">
              This subject has been cleared.
              {subject.clearedAt && (
                <span className="modal-cleared-date">
                  {" "}Cleared on {new Date(subject.clearedAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              )}
            </p>
          </div>
        ) : (
          <div className="modal-upload-section">
            <p className="modal-upload-instructions">
              {hasUploaded
                ? "You have already submitted a file. You may re-submit to replace it."
                : "Upload your clearance document (JPG, PNG, or PDF — max 10 MB)."}
            </p>

            {hasUploaded && (
              <div className="modal-existing-file">
                <span>📎</span>
                <span>Previously submitted: <strong>{subject.uploadedFile}</strong></span>
                {subject.uploadedAt && (
                  <span className="modal-upload-date">
                    {new Date(subject.uploadedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}

            <label className="modal-file-label">
              <input
                ref={fileRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="modal-file-input"
                onChange={(e) => { setFile(e.target.files[0]); setMsg(""); }}
              />
              <span className="modal-file-btn">📁 Choose File</span>
              <span className="modal-file-name">{file ? file.name : "No file chosen"}</span>
            </label>

            {msg && (
              <p className={`modal-msg ${isError ? "modal-msg-err" : "modal-msg-ok"}`}>{msg}</p>
            )}

            <button
              className="modal-submit-btn"
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? "Uploading…" : "Submit Clearance"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   STUDENT DASHBOARD
══════════════════════════════════════════════════════════════════════════════ */
export default function StudentDashboard() {
  const navigate = useNavigate();
  const [student,  setStudent]  = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [page,     setPage]     = useState("clearance");
  const [modal,    setModal]    = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) { navigate("/"); return; }
    const payload = decodeToken(token);
    if (payload.role && payload.role !== "student") { navigate("/"); return; }
    setStudent({
      username:   payload.username   || "Student",
      email:      payload.email      || "—",
      gradeLevel: payload.gradeLevel || "—",
      section:    payload.section    || "—",
      idNumber:   payload.idNumber   || "—",
      role:       payload.role       || "student",
    });
    fetchClearance();
  }, []);

  function fetchClearance() {
    const t = localStorage.getItem("token");
    fetch("/api/clearance", {
      headers: {
        Authorization: `Bearer ${t}`,
        "ngrok-skip-browser-warning": "true",
      },
    })
      .then((r) => { if (!r.ok) throw new Error("Failed to fetch."); return r.json(); })
      .then((d) => { setSubjects(d.subjects || []); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }

  function logout() { localStorage.removeItem("token"); navigate("/"); }

  const clearedCount = subjects.filter((s) => s.status === "cleared").length;
  const total        = subjects.length;
  const progress     = total > 0 ? Math.round((clearedCount / total) * 100) : 0;
  const allCleared   = clearedCount === total && total > 0;

  return (
    <div className="sd-wrapper">
      {/* ── Navbar ── */}
      <nav className="sd-nav">
        <div className="sd-nav-left">
          <span className="sd-nav-logo">🎓</span>
          <span className="sd-nav-brand">ClearanceSystem</span>
        </div>
        <div className="sd-nav-links">
          <button
            className={`sd-nav-link ${page === "clearance" ? "active" : ""}`}
            onClick={() => setPage("clearance")}
          >
            📋 My Clearance
          </button>
          <button
            className={`sd-nav-link ${page === "profile" ? "active" : ""}`}
            onClick={() => setPage("profile")}
          >
            👤 My Profile
          </button>
        </div>
        <div className="sd-nav-right">
          <span className="sd-nav-user">{student?.username}</span>
          <button className="sd-nav-logout" onClick={logout}>Logout</button>
        </div>
      </nav>

      <main className="sd-main">
        {/* ════════ CLEARANCE PAGE ════════ */}
        {page === "clearance" && (
          <>
            <h1 className="sd-page-title">My Subject Clearance</h1>
            <p className="sd-page-sub">Click on a subject to view details or submit your clearance file.</p>

            {loading && <div className="sd-loading">Loading clearance data…</div>}
            {error   && <div className="sd-error">⚠ {error}</div>}

            {!loading && !error && (
              <>
                {/* Summary */}
                <div className={`sd-summary ${allCleared ? "all-cleared" : ""}`}>
                  <div>
                    <p className="sd-sum-main">
                      {allCleared ? "🎉 All subjects cleared!" : `${clearedCount} / ${total} subjects cleared`}
                    </p>
                    <p className="sd-sum-sub">
                      {allCleared
                        ? "You have completed all clearance requirements."
                        : "Click a pending subject to upload your clearance document."}
                    </p>
                  </div>
                  <div className="sd-prog-wrap">
                    <div className="sd-prog-bar">
                      <div className="sd-prog-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="sd-prog-pct">{progress}%</span>
                  </div>
                </div>

                {/* Subject grid */}
                <div className="sd-grid">
                  {subjects.map((subj, idx) => (
                    <button
                      key={idx}
                      className={`sd-card sd-card-${subj.status}`}
                      onClick={() => setModal({ subject: subj, index: idx })}
                    >
                      <div className="sd-card-top">
                        <span className={`sd-card-icon-wrap sd-icon-${subj.status}`}>
                          {STATUS_ICON[subj.status]}
                        </span>
                        {subj.uploadedFile && subj.status !== "cleared" && (
                          <span className="sd-card-uploaded-badge" title="File submitted">📎</span>
                        )}
                      </div>
                      <p className="sd-card-name">{subj.name}</p>
                      <span className={`sd-card-badge sd-badge-${subj.status}`}>
                        {STATUS_LABEL[subj.status]}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ════════ PROFILE PAGE ════════ */}
        {page === "profile" && student && (
          <>
            <h1 className="sd-page-title">My Profile</h1>
            <p className="sd-page-sub">Your account information on record.</p>

            <div className="profile-card">
              <div className="profile-avatar">
                {student.username.charAt(0).toUpperCase()}
              </div>
              <div className="profile-name">{student.username}</div>
              <div className="profile-role-badge">Student</div>

              <div className="profile-fields">
                {[
                  { label: "Student ID",   value: student.idNumber },
                  { label: "Email",        value: student.email },
                  { label: "Grade Level",  value: `Grade ${student.gradeLevel}` },
                  { label: "Section",      value: student.section },
                ].map((f) => (
                  <div key={f.label} className="profile-field">
                    <span className="profile-field-label">{f.label}</span>
                    <span className="profile-field-value">{f.value}</span>
                  </div>
                ))}
              </div>

              {/* Mini clearance summary inside profile */}
              <div className="profile-clearance-summary">
                <p className="pcs-label">Clearance Progress</p>
                <div className="sd-prog-wrap">
                  <div className="sd-prog-bar">
                    <div className="sd-prog-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="sd-prog-pct">{progress}%</span>
                </div>
                <p className="pcs-detail">
                  {clearedCount} of {total} subjects cleared
                </p>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Subject modal */}
      {modal && (
        <SubjectModal
          subject={modal.subject}
          index={modal.index}
          onClose={() => setModal(null)}
          onUploadDone={() => {
            fetchClearance();
            setModal(null);
          }}
        />
      )}
    </div>
  );
}