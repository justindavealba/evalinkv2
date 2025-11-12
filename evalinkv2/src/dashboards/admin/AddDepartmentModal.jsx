import React, { useState } from "react";
import axios from "axios";
import "./AddUserModal.css";

export default function AddDepartmentModal({ onClose, onAddDepartment }) {
  const [formData, setFormData] = useState({
    name: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Department name cannot be empty.");
      return;
    }
    try {
      const response = await axios.post(
        "http://localhost:3001/departments",
        formData
      );
      if (response.data.error) {
        alert("Error adding department: " + response.data.error);
      } else {
        alert(response.data.message);
        onAddDepartment({ ...formData, id: response.data.data.insertId });
        onClose();
      }
    } catch (error) {
      console.error("There was an error sending the data!", error);
      alert("Failed to connect to the server or add department.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add New Department</h2>
        <form onSubmit={handleSubmit} className="add-user-form">
          <div className="form-group">
            <label htmlFor="name">Department Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="modal-buttons">
            <button type="submit" className="submit-btn">
              Add Department
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
