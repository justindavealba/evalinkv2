import React, { useState, useEffect } from "react";
import "./EvaluateInstructor.css";

export default function EvaluateInstructor({
  subject,
  onClose,
  readOnly = false,
}) {
  const categories = [
    {
      name: "Teaching & Instruction",
      items: [
        "Explains concepts clearly and understandably.",
        "Organizes lessons and materials effectively.",
        "Encourages critical thinking and class participation.",
        "Uses relevant examples or real-life applications.",
      ],
    },
    {
      name: "Communication",
      items: [
        "Speaks clearly and is easy to understand.",
        "Listens to questions and answers them well.",
        "Gives clear instructions for assignments, exams, and projects.",
      ],
    },
    {
      name: "Subject Knowledge",
      items: [
        "Demonstrates strong knowledge of the subject.",
        "Stays updated with current developments in the field.",
      ],
    },
    {
      name: "Classroom Management",
      items: [
        "Maintains a respectful and productive learning environment.",
        "Manages class time efficiently.",
        "Treats students fairly and respectfully.",
      ],
    },
    {
      name: "Student Engagement",
      items: [
        "Motivates students to participate in discussions.",
        "Encourages questions and interaction.",
        "Provides opportunities for collaborative or practical learning.",
      ],
    },
    {
      name: "Assessment & Feedback",
      items: [
        "Assignments, quizzes, and exams fairly evaluate learning.",
        "Provides timely and constructive feedback.",
        "Grades are consistent and transparent.",
      ],
    },
    {
      name: "Accessibility & Support",
      items: [
        "Available for consultation or help outside class.",
        "Supports students who need extra guidance.",
      ],
    },
  ];

  const [ratings, setRatings] = useState({});
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!readOnly) {
      // Load saved ratings/feedback from localStorage if available (students only)
      const saved = JSON.parse(
        localStorage.getItem(`ratings_${subject.code}`) || "{}"
      );
      setRatings(saved.ratings || {});
      setFeedback(saved.feedback || "");
    } else {
      // For faculty: load existing ratings/feedback (mocked for demo)
      const saved = JSON.parse(
        localStorage.getItem(`ratings_${subject.code}`) || "{}"
      );
      setRatings(saved.ratings || {});
      setFeedback(saved.feedback || "");
    }
  }, [subject.code, readOnly]);

  const handleRatingChange = (key, value) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (readOnly) return; // Should never happen
    localStorage.setItem(
      `ratings_${subject.code}`,
      JSON.stringify({ ratings, feedback })
    );
    alert("Thank you! Your evaluation has been submitted.");
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>
          {readOnly ? "Feedback for" : "Evaluate"}: {subject.name}
        </h2>
        {subject.instructor && (
          <p>
            <strong>Instructor:</strong> {subject.instructor}
          </p>
        )}

        <form onSubmit={handleSubmit} className="evaluation-form">
          {categories.map((cat) => (
            <div key={cat.name} className="category-section">
              <h3>{cat.name}</h3>
              {cat.items.map((item, idx) => {
                const key = `${cat.name}-${idx}`;
                return (
                  <div key={key} className="evaluation-item">
                    <label>{item}</label>
                    <select
                      value={ratings[key] || ""}
                      onChange={
                        !readOnly
                          ? (e) => handleRatingChange(key, e.target.value)
                          : undefined
                      }
                      disabled={readOnly}
                      required={!readOnly}
                    >
                      <option value="">
                        {readOnly ? "-" : "Select Rating"}
                      </option>
                      <option value="5">5 - Outstanding</option>
                      <option value="4">4 - Very Satisfactory</option>
                      <option value="3">3 - Satisfactory</option>
                      <option value="2">2 - Fair</option>
                      <option value="1">1 - Poor</option>
                    </select>
                  </div>
                );
              })}
            </div>
          ))}

          <div className="feedback-section">
            <label>
              Additional Feedback:
              <textarea
                value={feedback}
                onChange={
                  !readOnly ? (e) => setFeedback(e.target.value) : undefined
                }
                placeholder={readOnly ? "" : "Write your feedback here..."}
                readOnly={readOnly}
              />
            </label>
          </div>

          <div className="modal-buttons">
            {!readOnly ? (
              <>
                <button type="submit" className="submit-btn">
                  Submit Evaluation
                </button>
                <button type="button" className="cancel-btn" onClick={onClose}>
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" className="cancel-btn" onClick={onClose}>
                Close
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
