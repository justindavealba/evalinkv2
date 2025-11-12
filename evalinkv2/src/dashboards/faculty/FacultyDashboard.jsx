import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // This was already here, which is good.
import axios from "axios";
import evalinkLogo from "../../assets/evalinklogo.png"; // Using evalinklogo for consistency
import "./FacultyDashboard.css";
import {
  FaUserCircle,
  FaTachometerAlt, // For Overview
  FaUsers, // For My Sections (or FaChalkboardTeacher)
  FaClipboardList, // For Student Evaluations
  FaHistory, // For Activity Log
} from "react-icons/fa";

export default function FacultyDashboard({ setUserRole }) {
  const [activeSection, setActiveSection] = useState("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [sections, setSections] = useState([]);
  const navigate = useNavigate();

  const handleLogout = () => {
    // You can add faculty-specific activity logging here if needed
    // For example:
    // const logs = JSON.parse(localStorage.getItem("facultyActivityLog")) || [];
    // logs.push({ type: "logout", timestamp: new Date().toLocaleString() });
    // localStorage.setItem("facultyActivityLog", JSON.stringify(logs));

    if (setUserRole) {
      setUserRole("");
    }
    localStorage.removeItem("userId"); // Clear stored user ID on logout
    navigate("/login");
  };

  useEffect(() => {
    if (activeSection === "sections") {
      const facultyId = localStorage.getItem("userId");
      if (facultyId) {
        axios
          .get(`http://localhost:3001/users/${facultyId}/sections`)
          .then((response) => {
            setSections(response.data);
          })
          .catch((error) => console.error("Error fetching sections:", error));
      }
    }
  }, [activeSection]);

  return (
    <div className="faculty-dashboard">
      {/* ===== HEADER ===== */}
      <nav className="navbar">
        <div className="navbar-left">
          <button
            className="menu-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
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
                <button onClick={() => setActiveSection("profile")}>
                  Profile
                </button>
                <button onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ===== MAIN LAYOUT ===== */}
      <div className="dashboard-layout">
        {/* ===== SIDEBAR ===== */}
        <aside className={`sidebar ${isSidebarOpen ? "open" : "closed"}`}>
          <button
            className={`sidebar-btn ${
              activeSection === "overview" ? "active" : ""
            }`}
            onClick={() => setActiveSection("overview")}
          >
            <FaTachometerAlt />
            <span>Overview</span>
          </button>

          <button
            className={`sidebar-btn ${
              activeSection === "sections" ? "active" : ""
            }`}
            onClick={() => setActiveSection("sections")}
          >
            <FaUsers />
            <span>My Sections</span>
          </button>

          <button
            className={`sidebar-btn ${
              activeSection === "evaluations" ? "active" : ""
            }`}
            onClick={() => setActiveSection("evaluations")}
          >
            <FaClipboardList />
            <span>Student Evaluations</span>
          </button>

          <button
            className={`sidebar-btn ${
              activeSection === "activity" ? "active" : ""
            }`}
            onClick={() => setActiveSection("activity")}
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
          {activeSection === "overview" && (
            <section className="overview-section">
              <h2>Overview</h2>
              <p>
                Welcome, Professor! Here you can view the evaluations made by
                your students, monitor their feedback, and review your handled
                sections.
              </p>
            </section>
          )}

          {/* ===== MY SECTIONS ===== */}
          {activeSection === "sections" && (
            <section className="subjects-section">
              <h2>My Sections</h2>
              {sections.length > 0 ? (
                <div className="subjects">
                  {sections.map((section) => (
                    <div key={section.id} className="subject-card">
                      <h3>{section.name}</h3>
                      <p>Subject: {section.subject_name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>You have not been assigned to any sections yet.</p>
              )}
            </section>
          )}

          {/* ===== STUDENT EVALUATIONS ===== */}
          {activeSection === "evaluations" && (
            <section className="evaluation-section">
              <h2>Student Evaluations</h2>
              <div className="evaluation-list">
                <div className="evaluation-card">
                  <h3>IT223 - Web Systems and Technologies</h3>
                  <p>
                    Average Rating: <strong>4.6 / 5</strong>
                  </p>
                  <p>Remarks: "The lessons are clear and well explained!"</p>
                </div>

                <div className="evaluation-card">
                  <h3>IT224 - System Integration and Architecture</h3>
                  <p>
                    Average Rating: <strong>4.8 / 5</strong>
                  </p>
                  <p>Remarks: "Engaging and helpful discussions!"</p>
                </div>

                <div className="evaluation-card">
                  <h3>IT221 - Information Management</h3>
                  <p>
                    Average Rating: <strong>4.4 / 5</strong>
                  </p>
                  <p>Remarks: "Challenging but rewarding subject."</p>
                </div>
              </div>
            </section>
          )}

          {/* ===== ACTIVITY LOG ===== */}
          {activeSection === "activity" && (
            <section className="activity-log-section">
              <h2>Activity Log</h2>
              <div className="activity-item login">
                <span className="activity-type">Login</span>
                <p>You logged into the faculty dashboard.</p>
              </div>
              <div className="activity-item view">
                <span className="activity-type">Viewed Evaluations</span>
                <p>You reviewed evaluation feedback for IT223.</p>
              </div>
              <div className="activity-item logout">
                <span className="activity-type">Logout</span>
                <p>You logged out of the system.</p>
              </div>
            </section>
          )}
          {activeSection === "profile" && (
            <section className="profile-section-content">
              <h2 className="profile-greeting">Hi, Professor!</h2>
              <div className="profile-card-new">
                <div className="profile-icon-new">
                  <FaUserCircle size={80} color="#1b1464" />
                </div>
                <div className="profile-info-new">
                  <h3>Professor Name</h3>
                  <p>
                    <strong>ID:</strong> 123456789
                  </p>
                  <p>
                    <strong>Department:</strong> Information Technology
                  </p>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
