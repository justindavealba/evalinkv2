import React, { useState, useEffect } from "react";
import "./StudentDashboard.css";
import axios from "axios";
import EvaluateInstructor from "./EvaluateInstructor";
import evalinkLogo from "../../assets/evalinklogo.png"; // Corrected path
import { useNavigate } from "react-router-dom";
import {
  FaUserCircle,
  FaTachometerAlt, // For Overview
  FaBook, // For Subjects
  FaExclamationTriangle, // For Report
  FaHistory, // For Activity Log
  FaSignInAlt, // For Login activity
  FaSignOutAlt, // For Logout activity
} from "react-icons/fa";

export default function StudentDashboard({ setUserRole }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const [incidentReports, setIncidentReports] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    const storedReports =
      JSON.parse(localStorage.getItem("incidentReports")) || [];
    const storedLogs =
      JSON.parse(localStorage.getItem("studentActivityLog")) || [];
    setIncidentReports(storedReports);
    setActivityLogs(storedLogs);

    // Fetch enrolled subjects
    const studentId = localStorage.getItem("userId");
    if (studentId) {
      axios
        .get(`http://localhost:3001/users/${studentId}/subjects`)
        .then((response) => {
          setSubjects(response.data);
        })
        .catch((error) => console.error("Error fetching subjects:", error));
    }
  }, []);

  const handleLogout = () => {
    const now = new Date();
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };
    const logoutTime = now.toLocaleString("en-US", options);

    const logs = JSON.parse(localStorage.getItem("studentActivityLog")) || [];
    logs.push({ type: "logout", timestamp: logoutTime });
    localStorage.setItem("studentActivityLog", JSON.stringify(logs));

    if (setUserRole) setUserRole("");
    navigate("/login");
  };

  return (
    <div className="student-dashboard">
      {/* ===== HEADER ===== */}
      <nav className="navbar">
        <div className="navbar-left">
          <button
            className="menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
        </div>

        <div className="navbar-center">
          <div className="brand-text">
            <h1>Faculty Evaluation System</h1>
          </div>
        </div>

        <div className="navbar-right">
          <div className="profile-section">
            <button
              className="profile-icon"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <FaUserCircle size={28} />
            </button>

            {showDropdown && (
              <div className="profile-dropdown">
                <button onClick={() => setActiveTab("profile")}>Profile</button>
                <button onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ===== MAIN LAYOUT ===== */}
      <div className="dashboard-layout">
        {/* ===== SIDEBAR ===== */}
        <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
          <button
            className={`sidebar-btn ${
              activeTab === "overview" ? "active" : ""
            }`}
            onClick={() => setActiveTab("overview")}
          >
            <FaTachometerAlt />
            <span>Overview</span>
          </button>
          <button
            className={`sidebar-btn ${
              activeTab === "subjects" ? "active" : ""
            }`}
            onClick={() => setActiveTab("subjects")}
          >
            <FaBook />
            <span>Enrolled Subjects</span>
          </button>
          <button
            className={`sidebar-btn ${activeTab === "report" ? "active" : ""}`}
            onClick={() => setActiveTab("report")}
          >
            <FaExclamationTriangle />
            <span>Report</span>
          </button>
          <button
            className={`sidebar-btn ${
              activeTab === "activity" ? "active" : ""
            }`}
            onClick={() => setActiveTab("activity")}
          >
            <FaHistory />
            <span>Activity Log</span>
          </button>
          <div className="sidebar-logo">
            <img src={evalinkLogo} alt="Evalink Logo" className="ustp-logo" />
          </div>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className="dashboard-content">
          {/* ===== OVERVIEW ===== */}
          {activeTab === "overview" && (
            <section className="overview-section">
              <h2>Overview</h2>
              <p>
                Welcome to your dashboard! Here you can view subjects, submit
                incident reports, and track activity logs.
              </p>
            </section>
          )}

          {/* ===== SUBJECTS ===== */}
          {activeTab === "subjects" && (
            <section className="subjects-section">
              <h2>Enrolled Subjects</h2>
              <div className="subjects">
                {subjects.map((subject) => (
                  <div key={subject.code} className="subject-card">
                    <h3>{subject.name}</h3>
                    <p>Instructor: {subject.instructor || "Not Assigned"}</p>
                    <button
                      className="evaluate-btn"
                      onClick={() => setSelectedSubject(subject)}
                    >
                      Evaluate
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ===== INCIDENT REPORT ===== */}
          {activeTab === "report" && (
            <section className="incident-section">
              <h2>Incident Report</h2>
              <form
                className="incident-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const report = {
                    title: formData.get("title"),
                    description: formData.get("description"),
                    date: new Date().toLocaleString(),
                  };
                  const updatedReports = [...incidentReports, report];
                  setIncidentReports(updatedReports);
                  localStorage.setItem(
                    "incidentReports",
                    JSON.stringify(updatedReports)
                  );
                  e.target.reset();
                }}
              >
                <label>Title</label>
                <input
                  name="title"
                  required
                  placeholder="Enter incident title"
                />
                <label>Description</label>
                <textarea
                  name="description"
                  required
                  placeholder="Describe the incident"
                ></textarea>
                <button type="submit" className="submit-incident-btn">
                  Submit Report
                </button>
              </form>

              <div className="incident-history">
                <h4>Report History</h4>
                {incidentReports.length > 0 ? (
                  incidentReports.map((r, i) => (
                    <div key={i} className="incident-item">
                      <strong>{r.title}</strong> <em>{r.date}</em>
                      <p>{r.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="no-activity">No reports submitted yet.</p>
                )}
              </div>
            </section>
          )}

          {/* ===== ACTIVITY LOG ===== */}
          {activeTab === "activity" && (
            <section className="activity-log-section">
              <h2>Activity Log</h2>
              <div className="activity-log-container">
                {activityLogs.length > 0 ? (
                  activityLogs.map((log, index) => (
                    <div key={index} className={`activity-item ${log.type}`}>
                      <div className="activity-icon">
                        {log.type === "login" ? (
                          <FaSignInAlt color="#28a745" />
                        ) : (
                          <FaSignOutAlt color="#dc3545" />
                        )}
                      </div>
                      <div className="activity-details">
                        <span className="activity-type">
                          Student
                          {log.type === "login" ? " Logged In" : " Logged Out"}
                        </span>
                        <span className="activity-time">{log.timestamp}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-activity">No activity logged yet.</p>
                )}
              </div>
            </section>
          )}

          {/* ===== PROFILE PAGE ===== */}
          {activeTab === "profile" && (
            <section className="profile-section-content">
              <h2 className="profile-greeting">Hi, Alexa!</h2>
              <div className="profile-card-new">
                <div className="profile-icon-new">
                  <FaUserCircle size={80} color="#1b1464" />
                </div>
                <div className="profile-info-new">
                  <h3>Alexa Guevarra</h3>
                  <p>
                    <strong>ID:</strong> 202213079
                  </p>
                  <p>
                    <strong>Year:</strong> 3rd Year
                  </p>
                  <p>
                    <strong>Semester:</strong> 1st Semester 2025-2026
                  </p>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
      {/* ===== EVALUATION MODAL ===== */}
      {selectedSubject && (
        <EvaluateInstructor
          subject={selectedSubject}
          onClose={() => setSelectedSubject(null)}
        />
      )}
    </div>
  );
}
