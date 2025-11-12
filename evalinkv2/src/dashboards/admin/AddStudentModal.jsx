import React, { useState, useEffect } from "react";
import axios from "axios"; // Import axios
import "./AddUserModal.css";

export default function AddStudentModal({
  onClose,
  onAddStudent,
  departments,
}) {
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    password: "",
    department_id: "",
    section_id: "",
    year: "", // This will be set automatically
  });
  const [allSections, setAllSections] = useState([]);

  useEffect(() => {
    // Fetch all sections when the modal mounts
    axios
      .get("http://localhost:3001/sections")
      .then((res) => setAllSections(res.data))
      .catch((err) => console.error("Failed to fetch sections", err));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // When a section is selected, find its year level and update the form data
    if (name === "section_id") {
      const selectedSection = allSections.find(
        (sec) => sec.id === parseInt(value)
      );
      if (selectedSection) {
        setFormData((prev) => ({ ...prev, year: selectedSection.year_level }));
      }
    }
  };

  const handleSubmit = async (e) => {
    // Make function async
    e.preventDefault();
    const payload = { ...formData, role: "student" }; // Add role to payload
    try {
      const response = await axios.post("http://localhost:3001/users", payload); // Send POST request
      if (response.data.error) {
        alert("Error adding student: " + response.data.error);
      } else {
        alert(response.data.message);
        onAddStudent(formData); // Call original callback
        onClose();
      }
    } catch (error) {
      console.error("There was an error sending the data!", error);
      alert("Failed to connect to the server or add student.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add New Student</h2>
        <form onSubmit={handleSubmit} className="add-user-form">
          <div className="form-group">
            <label htmlFor="id">Student ID</label>
            <input
              type="number"
              id="id"
              name="id"
              value={formData.id}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="department">Department</label>
            <select
              id="department_id"
              name="department_id"
              value={formData.department_id}
              onChange={handleChange}
              required
            >
              <option value="" disabled>
                Select Department
              </option>
              {departments &&
                departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="section_id">Section</label>
            <select
              id="section_id"
              name="section_id"
              value={formData.section_id}
              onChange={handleChange}
              required
            >
              <option value="" disabled>
                Select Section
              </option>
              {allSections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name} ({sec.year_level})
                </option>
              ))}
            </select>
          </div>
          <div className="modal-buttons">
            <button type="submit" className="submit-btn">
              Add Student
            </button>
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
