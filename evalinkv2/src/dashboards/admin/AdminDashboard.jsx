import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AddStudentModal from "./AddStudentModal";
import AddFacultyModal from "./AddFacultyModal";
import AddDepartmentModal from "./AddDepartmentModal"; // Import the new modal
import AddSectionModal from "./AddSectionModal";
import AddSubjectModal from "./AddSubjectModal";
import axios from "axios";
import evalinkLogo from "../../assets/evalinklogo.png";
import "./AdminDashboard.css";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {
  FaUserCircle,
  FaTachometerAlt,
  FaClipboardCheck,
  FaExclamationCircle,
  FaHistory,
  FaUsersCog, // New icon for User Management
  FaTrash,
} from "react-icons/fa";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function AdminDashboard({ setUserRole }) {
  const [activeSection, setActiveSection] = useState(
    localStorage.getItem("adminActiveSection") || "overview"
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddFacultyModal, setShowAddFacultyModal] = useState(false);
  const [showAddDepartmentModal, setShowAddDepartmentModal] = useState(false); // State for the new modal
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);

  // Mock evaluation data
  const [evaluations, setEvaluations] = useState([
    {
      studentId: "STU-1001",
      course: "IT221 - Information Management",
      rating: 4.5,
      feedback: "The instructor explains clearly.",
    },
    {
      studentId: "STU-1002",
      course: "IT223 - Web Systems and Technologies",
      rating: 4.8,
      feedback: "Very interactive and helpful lessons!",
    },
    {
      studentId: "STU-1003",
      course: "IT224 - System Integration",
      rating: 4.0,
      feedback: "Challenging but rewarding class.",
    },
  ]);

  // Mock incident data
  const [incidents, setIncidents] = useState([
    {
      id: 1,
      studentId: "STU-1001",
      subject: "Disruptive behavior",
      description: "Student disrupted during class.",
      status: "Pending",
    },
    {
      id: 2,
      studentId: "STU-1005",
      subject: "Cheating",
      description: "Possible cheating incident reported.",
      status: "Under Investigation",
    },
  ]);

  // Mock user data
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Pagination states
  const [studentsPage, setStudentsPage] = useState(1);
  const [facultyPage, setFacultyPage] = useState(1);
  const [departmentsPage, setDepartmentsPage] = useState(1);
  const [sectionsPage, setSectionsPage] = useState(1);
  const [subjectsPage, setSubjectsPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchStudents = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3001/users?role=student"
      );
      setStudents(response.data);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const fetchFaculty = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3001/users?role=faculty"
      );
      setFaculty(response.data);
    } catch (error) {
      console.error("Error fetching faculty:", error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get("http://localhost:3001/departments");
      setDepartments(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchSections = async () => {
    try {
      const response = await axios.get("http://localhost:3001/sections");
      setSections(response.data);
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await axios.get("http://localhost:3001/subjects");
      setSubjects(response.data);
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const handleAddStudent = () => fetchStudents();
  const handleAddFaculty = () => fetchFaculty();
  const handleAddDepartment = () => fetchDepartments();
  const handleAddSection = () => fetchSections();
  const handleAddSubject = () => fetchSubjects();

  const handleDelete = async (type, id) => {
    if (window.confirm(`Are you sure you want to delete this ${type}?`)) {
      try {
        if (type === "student" || type === "faculty") {
          await axios.delete(`http://localhost:3001/users/${id}`);
        } else {
          await axios.delete(`http://localhost:3001/${type}s/${id}`);
        }
        // Refresh the corresponding list
        switch (type) {
          case "student":
            fetchStudents();
            break;
          case "faculty":
            fetchFaculty();
            break;
          case "department":
            fetchDepartments();
            // Also refresh related data that might be affected
            fetchFaculty();
            fetchStudents();
            fetchSubjects();
            fetchSections();
            break;
          case "section":
            fetchSections();
            break;
          case "subject":
            fetchSubjects();
            fetchSections();
            break;
          default:
            break;
        }
      } catch (error) {
        console.error(`Error deleting ${type}:`, error);
        if (
          error.response &&
          error.response.data &&
          error.response.data.error
        ) {
          alert(`Failed to delete ${type}: ${error.response.data.error}`);
        } else {
          alert(`An error occurred while deleting the ${type}.`);
        }
      }
    }
  };

  // State for chart
  const [timeRange, setTimeRange] = useState(7); // Default to 7 days
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
  });

  const handleStatusChange = (id, newStatus) => {
    setIncidents((prev) =>
      prev.map((incident) =>
        incident.id === id ? { ...incident, status: newStatus } : incident
      )
    );
  };

  const handleLogout = () => {
    if (setUserRole) {
      setUserRole("");
    }
    navigate("/login");
  };

  useEffect(() => {
    // Save the active section to localStorage whenever it changes
    localStorage.setItem("adminActiveSection", activeSection);
  }, [activeSection]);

  useEffect(() => {
    // Generate mock chart data when timeRange changes
    const generateData = () => {
      const labels = [];
      const data = [];
      for (let i = 0; i < timeRange; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.unshift(
          date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        );
        // Random number of evaluations for demo purposes
        data.unshift(Math.floor(Math.random() * 50) + 10);
      }

      setChartData({
        labels,
        datasets: [
          {
            label: "Daily Evaluations",
            data,
            backgroundColor: "rgba(0, 82, 163, 0.6)",
            borderColor: "rgba(0, 82, 163, 1)",
            borderWidth: 1,
            borderRadius: 5,
          },
        ],
      });
    };

    generateData();
  }, [timeRange]);

  useEffect(() => {
    // Fetch all user management data when the component mounts
    fetchDepartments();
    fetchStudents();
    fetchFaculty();
    fetchSections();
    fetchSubjects();
  }, []);

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
  };

  // Pagination logic
  const paginatedStudents = students.slice(
    (studentsPage - 1) * ITEMS_PER_PAGE,
    studentsPage * ITEMS_PER_PAGE
  );
  const totalStudentPages = Math.ceil(students.length / ITEMS_PER_PAGE);

  const paginatedFaculty = faculty.slice(
    (facultyPage - 1) * ITEMS_PER_PAGE,
    facultyPage * ITEMS_PER_PAGE
  );
  const totalFacultyPages = Math.ceil(faculty.length / ITEMS_PER_PAGE);

  const paginatedDepartments = departments.slice(
    (departmentsPage - 1) * ITEMS_PER_PAGE,
    departmentsPage * ITEMS_PER_PAGE
  );
  const totalDepartmentPages = Math.ceil(departments.length / ITEMS_PER_PAGE);

  const paginatedSections = sections.slice(
    (sectionsPage - 1) * ITEMS_PER_PAGE,
    sectionsPage * ITEMS_PER_PAGE
  );
  const totalSectionPages = Math.ceil(sections.length / ITEMS_PER_PAGE);

  const paginatedSubjects = subjects.slice(
    (subjectsPage - 1) * ITEMS_PER_PAGE,
    subjectsPage * ITEMS_PER_PAGE
  );
  const totalSubjectPages = Math.ceil(subjects.length / ITEMS_PER_PAGE);

  return (
    <div className="admin-dashboard">
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
            <h1>Admin Dashboard</h1>
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
                <button onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ===== LAYOUT ===== */}
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
              activeSection === "evaluations" ? "active" : ""
            }`}
            onClick={() => setActiveSection("evaluations")}
          >
            <FaClipboardCheck />
            <span>Evaluation Reports</span>
          </button>

          <button
            className={`sidebar-btn ${
              activeSection === "incidents" ? "active" : ""
            }`}
            onClick={() => setActiveSection("incidents")}
          >
            <FaExclamationCircle />
            <span>Incident Reports</span>
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
          <button
            className={`sidebar-btn ${
              activeSection === "user-management" ? "active" : ""
            }`}
            onClick={() => setActiveSection("user-management")}
          >
            <FaUsersCog />
            <span>User Management</span>
          </button>
          <div className="sidebar-logo">
            <img src={evalinkLogo} alt="Evalink Logo" className="ustp-logo" />
          </div>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className="dashboard-content">
          {/* ===== Overview ===== */}
          {activeSection === "overview" && (
            <section className="overview-section">
              <h2>Overview</h2>
              <div className="analytics-grid">
                <div className="stat-card">
                  <h4>Total Evaluations</h4>
                  <p>{evaluations.length}</p>
                </div>
                <div className="stat-card">
                  <h4>Pending Incidents</h4>
                  <p>
                    {incidents.filter((i) => i.status === "Pending").length}
                  </p>
                </div>
                <div className="stat-card">
                  <h4>Active Users</h4>
                  <p>152</p> {/* Mock data */}
                </div>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>Daily Evaluation Activity</h3>
                  <div className="time-filter">
                    <button
                      onClick={() => setTimeRange(7)}
                      className={timeRange === 7 ? "active" : ""}
                    >
                      7 Days
                    </button>
                    <button
                      onClick={() => setTimeRange(30)}
                      className={timeRange === 30 ? "active" : ""}
                    >
                      30 Days
                    </button>
                    <button
                      onClick={() => setTimeRange(90)}
                      className={timeRange === 90 ? "active" : ""}
                    >
                      90 Days
                    </button>
                  </div>
                </div>
                <Bar options={chartOptions} data={chartData} />
              </div>
            </section>
          )}

          {/* ===== Evaluation Reports ===== */}
          {activeSection === "evaluations" && (
            <section className="evaluation-section">
              <h2>Evaluation Reports</h2>
              <div className="evaluations">
                {evaluations.map((e, index) => (
                  <div key={index} className="evaluation-card">
                    <h3>{e.course}</h3>
                    <p>
                      <strong>Student ID:</strong> {e.studentId}
                    </p>
                    <p>
                      <strong>Rating:</strong> ⭐ {e.rating}
                    </p>
                    <p>
                      <strong>Feedback:</strong> {e.feedback}
                    </p>
                  </div>
                ))}
              </div>

              <div className="overall-rating">
                <h3>
                  Overall Average Rating: ⭐
                  {(
                    evaluations.reduce((sum, e) => sum + e.rating, 0) /
                    evaluations.length
                  ).toFixed(2)}
                </h3>
              </div>
            </section>
          )}

          {/* ===== Incident Reports ===== */}
          {activeSection === "incidents" && (
            <section className="incident-section">
              <h2>Incident Reports</h2>
              <div className="incident-list">
                {incidents.map((incident) => (
                  <div key={incident.id} className="incident-card">
                    <h3>{incident.subject}</h3>
                    <p>
                      <strong>Student ID:</strong> {incident.studentId}
                    </p>
                    <p>
                      <strong>Description:</strong> {incident.description}
                    </p>
                    <p>
                      <strong>Status:</strong>{" "}
                      <select
                        value={incident.status}
                        onChange={(e) =>
                          handleStatusChange(incident.id, e.target.value)
                        }
                      >
                        <option>Pending</option>
                        <option>Under Investigation</option>
                        <option>Resolved</option>
                      </select>
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ===== Activity Log ===== */}
          {activeSection === "activity" && (
            <section className="activity-log-section">
              <h2>Activity Log</h2>
              <div className="activity-item">
                <span className="activity-type">Admin Login</span>
                <p>You accessed the admin panel successfully.</p>
              </div>
              <div className="activity-item">
                <span className="activity-type">Report Review</span>
                <p>Reviewed evaluation and updated report statuses.</p>
              </div>
            </section>
          )}

          {/* ===== USER MANAGEMENT ===== */}
          {activeSection === "user-management" && (
            <section className="user-management-section">
              <h2>User Management</h2>
              <div className="user-management-actions">
                <button onClick={() => setShowAddStudentModal(true)}>
                  Add Student
                </button>
                <button onClick={() => setShowAddFacultyModal(true)}>
                  Add Faculty
                </button>
                <button onClick={() => setShowAddDepartmentModal(true)}>
                  Add Department
                </button>
                <button onClick={() => setShowAddSectionModal(true)}>
                  Add Section
                </button>
                <button onClick={() => setShowAddSubjectModal(true)}>
                  Add Subject
                </button>
              </div>

              <div className="user-table-container">
                <h3>Students</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Year Level</th>
                      <th>Department</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.map((student) => (
                      <tr key={student.id}>
                        <td>{student.id}</td>
                        <td>{student.name}</td>
                        <td>{student.year}</td>
                        <td>{student.department}</td>
                        <td>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDelete("student", student.id)}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalStudentPages > 1 && (
                  <div className="pagination-controls">
                    <button
                      onClick={() => setStudentsPage((p) => Math.max(p - 1, 1))}
                      disabled={studentsPage === 1}
                    >
                      Previous
                    </button>
                    <span>
                      Page {studentsPage} of {totalStudentPages}
                    </span>
                    <button
                      onClick={() =>
                        setStudentsPage((p) =>
                          Math.min(p + 1, totalStudentPages)
                        )
                      }
                      disabled={studentsPage === totalStudentPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

              <div className="user-table-container">
                <h3>Faculty</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Faculty ID</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFaculty.map((fac) => (
                      <tr key={fac.id}>
                        <td>{fac.id}</td>
                        <td>{fac.name}</td>
                        <td>{fac.department}</td>
                        <td>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDelete("faculty", fac.id)}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalFacultyPages > 1 && (
                  <div className="pagination-controls">
                    <button
                      onClick={() => setFacultyPage((p) => Math.max(p - 1, 1))}
                      disabled={facultyPage === 1}
                    >
                      Previous
                    </button>
                    <span>
                      Page {facultyPage} of {totalFacultyPages}
                    </span>
                    <button
                      onClick={() =>
                        setFacultyPage((p) =>
                          Math.min(p + 1, totalFacultyPages)
                        )
                      }
                      disabled={facultyPage === totalFacultyPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

              <div className="user-table-container">
                <h3>Departments</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Department ID</th>
                      <th>Name</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDepartments.map((dept) => (
                      <tr key={dept.id}>
                        <td>{dept.id}</td>
                        <td>{dept.name}</td>
                        <td>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDelete("department", dept.id)}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalDepartmentPages > 1 && (
                  <div className="pagination-controls">
                    <button
                      onClick={() =>
                        setDepartmentsPage((p) => Math.max(p - 1, 1))
                      }
                      disabled={departmentsPage === 1}
                    >
                      Previous
                    </button>
                    <span>
                      Page {departmentsPage} of {totalDepartmentPages}
                    </span>
                    <button
                      onClick={() =>
                        setDepartmentsPage((p) =>
                          Math.min(p + 1, totalDepartmentPages)
                        )
                      }
                      disabled={departmentsPage === totalDepartmentPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

              <div className="user-table-container">
                <h3>Sections</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Section ID</th>
                      <th>Section Name</th>
                      <th>Department</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSections.map((section) => (
                      <tr key={section.id}>
                        <td>{section.id}</td>
                        <td>{section.name}</td>
                        <td>{section.department_name || "N/A"}</td>
                        <td>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDelete("section", section.id)}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalSectionPages > 1 && (
                  <div className="pagination-controls">
                    <button
                      onClick={() => setSectionsPage((p) => Math.max(p - 1, 1))}
                      disabled={sectionsPage === 1}
                    >
                      Previous
                    </button>
                    <span>
                      Page {sectionsPage} of {totalSectionPages}
                    </span>
                    <button
                      onClick={() =>
                        setSectionsPage((p) =>
                          Math.min(p + 1, totalSectionPages)
                        )
                      }
                      disabled={sectionsPage === totalSectionPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

              <div className="user-table-container">
                <h3>Subjects</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Subject Code</th>
                      <th>Subject Name</th>
                      <th>Year Level</th>
                      <th>Assigned Faculty</th>
                      <th>Department</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSubjects.map((subject) => (
                      <tr key={subject.id}>
                        <td>{subject.code}</td>
                        <td>{subject.name}</td>
                        <td>{subject.year_level || "N/A"}</td>
                        <td>{subject.faculty_name || "N/A"}</td>
                        <td>{subject.department_name || "N/A"}</td>
                        <td>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDelete("subject", subject.id)}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalSubjectPages > 1 && (
                  <div className="pagination-controls">
                    <button
                      onClick={() => setSubjectsPage((p) => Math.max(p - 1, 1))}
                      disabled={subjectsPage === 1}
                    >
                      Previous
                    </button>
                    <span>
                      Page {subjectsPage} of {totalSubjectPages}
                    </span>
                    <button
                      onClick={() =>
                        setSubjectsPage((p) =>
                          Math.min(p + 1, totalSubjectPages)
                        )
                      }
                      disabled={subjectsPage === totalSubjectPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>
      {showAddStudentModal && (
        <AddStudentModal
          onClose={() => setShowAddStudentModal(false)}
          onAddStudent={handleAddStudent}
          departments={departments}
        />
      )}
      {showAddFacultyModal && (
        <AddFacultyModal
          onClose={() => setShowAddFacultyModal(false)}
          onAddFaculty={handleAddFaculty}
          departments={departments}
        />
      )}
      {showAddDepartmentModal && (
        <AddDepartmentModal
          onClose={() => setShowAddDepartmentModal(false)}
          onAddDepartment={handleAddDepartment}
        />
      )}
      {showAddSectionModal && (
        <AddSectionModal
          onClose={() => setShowAddSectionModal(false)}
          onAddSection={handleAddSection}
          departments={departments}
        />
      )}
      {showAddSubjectModal && (
        <AddSubjectModal
          onClose={() => setShowAddSubjectModal(false)}
          onAddSubject={handleAddSubject}
          departments={departments}
          faculty={faculty}
        />
      )}
    </div>
  );
}
