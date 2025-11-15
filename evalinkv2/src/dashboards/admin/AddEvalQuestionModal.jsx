import React, { useState } from "react";
import axios from "axios";
import "./AddUserModal.css"; // Reusing the same modal styles

export default function AddEvalQuestionModal({
  onClose,
  onSuccess,
  categories,
}) {
  const [formData, setFormData] = useState({
    category_id: "",
    text: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category_id || !formData.text.trim()) {
      alert("Please select a category and enter the question text.");
      return;
    }
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const response = await axios.post(
        `${apiUrl}/evaluation-questions`,
        formData
      );
      alert(response.data.message);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error adding evaluation question:", error);
      alert(
        error.response?.data?.error || "Failed to add evaluation question."
      );
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add Evaluation Question</h2>
        <form onSubmit={handleSubmit} className="add-user-form">
          <div className="form-group">
            <label htmlFor="category_id">Category</label>
            <select
              id="category_id"
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              required
            >
              <option value="" disabled>
                Select a Category
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="text">Question Text</label>
            <textarea
              id="text"
              name="text"
              value={formData.text}
              onChange={handleChange}
              required
              rows="3"
            />
          </div>
          <div className="modal-buttons">
            <button type="submit" className="submit-btn">
              Add Question
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
