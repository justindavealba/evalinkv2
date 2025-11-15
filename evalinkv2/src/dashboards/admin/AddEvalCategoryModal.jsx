import React, { useState } from "react";
import axios from "axios";
import "./AddUserModal.css"; // Reusing the same modal styles

export default function AddEvalCategoryModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    display_order: 0,
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Category name cannot be empty.");
      return;
    }
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const response = await axios.post(
        `${apiUrl}/evaluation-categories`,
        formData
      );
      alert(response.data.message);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error adding evaluation category:", error);
      alert(
        error.response?.data?.error || "Failed to add evaluation category."
      );
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add Evaluation Category</h2>
        <form onSubmit={handleSubmit} className="add-user-form">
          <div className="form-group">
            <label htmlFor="name">Category Name (e.g., A. Commitment)</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          {/* You can add display_order input if needed */}
          <div className="modal-buttons">
            <button type="submit" className="submit-btn">
              Add Category
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
