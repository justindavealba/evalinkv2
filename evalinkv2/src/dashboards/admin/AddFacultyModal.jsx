import React, { useState } from "react";
import axios from "axios"; // Import axios
import "./AddUserModal.css";

export default function AddFacultyModal({ onClose, onSuccess, departments }) {
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    email: "",
    password: "",
    department_id: "", // This will hold the selected department ID
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    // Make function async
    e.preventDefault();
    const payload = { ...formData, role: "faculty" }; // Add role to payload
    try {
      const response = await axios.post("http://localhost:3001/users", payload); // Send POST request
      if (response.data.message) {
        alert(response.data.message);
        onSuccess(); // Use the unified success handler
        onClose(); // Close the modal
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        // Display the specific error message from the server
        alert(`Error: ${error.response.data.error}`);
      } else {
        console.error("There was an error sending the data!", error);
        alert("Failed to connect to the server or add faculty.");
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add New Faculty</h2>
        <form onSubmit={handleSubmit} className="add-user-form">
          <div className="form-group">
            <label htmlFor="id">Faculty ID / Number</label>
            <input
              type="text"
              id="id"
              name="id"
              value={formData.id}
              onChange={handleChange}
              required
              autoComplete="off"
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
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="off"
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
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          <div className="modal-buttons">
            <button type="submit" className="submit-btn">
              Add Faculty
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
