import React, { useState } from "react";
import axios from "axios";
import "./AddUserModal.css";

export default function AddSubjectModal({ onClose, onSuccess, departments }) {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    department_id: "",
    year_level: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.code.trim() ||
      !formData.name.trim() ||
      !formData.department_id ||
      !formData.year_level
    ) {
      alert("Please fill out all fields.");
      return;
    }
    try {
      const response = await axios.post(
        "http://localhost:3001/subjects",
        formData
      );
      if (response.data.message) {
        alert(response.data.message);
        onSuccess(); // Use the unified success handler
        onClose();
      }
    } catch (error) {
      console.error("There was an error adding the subject!", error);
      alert("Failed to add subject.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add New Subject</h2>
        <form onSubmit={handleSubmit} className="add-user-form">
          <div className="form-group">
            <label htmlFor="code">Subject Code (e.g., IT223)</label>
            <input
              type="text"
              id="code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="name">Subject Name</label>
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
            <label htmlFor="year_level">Year Level</label>
            <select
              id="year_level"
              name="year_level"
              value={formData.year_level}
              onChange={handleChange}
              required
            >
              <option value="" disabled>
                Select Year Level
              </option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="department_id">Department</label>
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
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          <div className="modal-buttons">
            <button type="submit" className="submit-btn">
              Add Subject
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
