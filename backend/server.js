const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); // Add this line to parse JSON request bodies

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'evalink'
});

app.get('/', (req, res) => {
    return res.json('Hello from the backend server!');
})

// Unified endpoint to add a new user (student or faculty)
app.post('/users', (req, res) => {
    const { id, name, password, role, department_id, section_id, year } = req.body;
    const sql = "INSERT INTO users (`id`, `name`, `password`, `role`, `department_id`, `section_id`, `year`) VALUES (?, ?, ?, ?, ?, ?, ?)";

    // Hash the password
    bcrypt.hash(password.toString(), 10, (err, hash) => {
        if(err) {
            console.error("Error hashing password:", err);
            return res.json({ error: "Error hashing password" });
        }
        const values = [
            id,
            name,
            hash, // Store the hash
            role,
            department_id,
            section_id,
            year
        ];
        db.query(sql, values, (err, data) => {
            if (err) {
                console.error("Error adding user:", err);
                return res.json({ error: "Failed to add user" });
            }
            return res.json({ message: "User added successfully", data });
        });
    });
});

// Endpoint to add a new department
app.post('/departments', (req, res) => {
    const sql = "INSERT INTO departments (`name`) VALUES (?)";
    const values = [
        req.body.name
    ];
    db.query(sql, values, (err, data) => {
        if (err) {
            console.error("Error adding department:", err);
            return res.json({ error: "Failed to add department" });
        }
        return res.json({ message: "Department added successfully", data });
    });
});

// Endpoint for Admin to add a new section
app.post('/sections', (req, res) => {
    const sql = "INSERT INTO sections (`name`, `department_id`) VALUES (?, ?)";
    const values = [
        req.body.name,
        req.body.department_id
    ];
    db.query(sql, values, (err, data) => {
        if (err) {
            console.error("Error adding section:", err);
            return res.status(500).json({ error: "Failed to add section" });
        }
        return res.json({ message: "Section added successfully", data });
    });
});

// Endpoint to get sections by year level
app.get('/sections/by-year', (req, res) => {
    const yearLevel = req.query.year;
    if (!yearLevel) {
        return res.status(400).json({ error: "Year level is required" });
    }
    const sql = "SELECT s.id, s.name FROM sections s JOIN subjects sub ON s.subject_id = sub.id WHERE sub.year_level = ?";
    db.query(sql, [yearLevel], (err, data) => {
        if (err) {
            return res.status(500).json({ error: "Failed to fetch sections" });
        }
        return res.json(data);
    });
});

// Endpoint to get all departments
app.get('/departments', (req, res) => {
    const sql = "SELECT * FROM departments ORDER BY name ASC";
    db.query(sql, (err, data) => {
        if (err) {
            console.error("Error fetching departments:", err);
            return res.json({ error: "Failed to fetch departments" });
        }
        return res.json(data);
    });
});

// Unified endpoint to get users by role
app.get('/users', (req, res) => {
    const role = req.query.role;
    if (!role) {
        return res.status(400).json({ error: "Role query parameter is required" });
    }

    const sql = `
        SELECT u.id, u.name, u.year, d.name as department 
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.role = ?
        ORDER BY u.name ASC`;
    db.query(sql, [role], (err, data) => {
        if (err) {
            console.error(`Error fetching ${role}s:`, err);
            return res.json({ error: `Failed to fetch ${role}s` });
        }
        return res.json(data);
    });
});

// Unified login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT * FROM users WHERE id = ?";

    // TEMPORARY: Simplified admin login to get you unblocked.
    if (username === 'admin' && password === 'admin123') {
        return res.status(200).json({ message: "Login successful", role: 'admin' });
    }
    if (username === 'admin') {
        return res.status(401).json({ error: "Invalid credentials for admin" });
    }

    db.query(sql, [username], (err, data) => {
        if (err) {
            console.error("Error during login:", err);
            return res.status(500).json({ error: "Internal server error" });
        }
        if (data.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const user = data[0];
        bcrypt.compare(password, user.password, (bcryptErr, bcryptRes) => {
            if (bcryptErr) {
                console.error("Error comparing passwords:", bcryptErr);
                return res.status(500).json({ error: "Internal server error" });
            }
            if (!bcryptRes) {
                return res.status(401).json({ error: "Invalid credentials" });
            }
            // Return user role on successful login
            return res.status(200).json({ message: "Login successful", role: user.role });
        });
    });
});

// Endpoint to add a new subject
app.post('/subjects', (req, res) => {
    const sql = "INSERT INTO subjects (`code`, `name`, `department_id`, `year_level`, `faculty_id`) VALUES (?, ?, ?, ?, ?)";
    const values = [
        req.body.code,
        req.body.name,
        req.body.department_id,
        req.body.year_level,
        req.body.faculty_id
    ];
    db.query(sql, values, (err, data) => {
        if (err) {
            console.error("Error adding subject:", err);
            return res.status(500).json({ error: "Failed to add subject" });
        }
        return res.json({ message: "Subject added successfully", data });
    });
});

// Endpoint to get all sections
app.get('/sections', (req, res) => {
    const sql = `
        SELECT s.id, s.name, sub.year_level, sub.name as subject_name, f.name as faculty_name, d.name as department_name
        FROM sections s
        LEFT JOIN subjects sub ON s.subject_id = sub.id
        LEFT JOIN users f ON sub.faculty_id = f.id
        LEFT JOIN departments d ON s.department_id = d.id
        ORDER BY s.name ASC`;
    db.query(sql, (err, data) => {
        if (err) {
            console.error("Error fetching sections:", err);
            return res.status(500).json({ error: "Failed to fetch sections" });
        }
        return res.json(data);
    });
});

// Endpoint to get all subjects
app.get('/subjects', (req, res) => {
    const sql = `
        SELECT s.id, s.code, s.name, s.year_level, d.name as department_name, f.name as faculty_name
        FROM subjects s
        LEFT JOIN users f ON s.faculty_id = f.id
        LEFT JOIN departments d ON s.department_id = d.id
        ORDER BY s.code ASC`;
    db.query(sql, (err, data) => {
        if (err) {
            console.error("Error fetching subjects:", err);
            return res.status(500).json({ error: "Failed to fetch subjects" });
        }
        return res.json(data);
    });
});

// Unified endpoint to delete a user
app.delete('/users/:id', (req, res) => {
    const sql = "DELETE FROM users WHERE id = ?";
    const id = req.params.id;
    db.query(sql, [id], (err, data) => {
        if (err) {
            console.error("Error deleting department:", err);
            return res.json({ error: "Failed to delete department. It might be in use by subjects, faculty, or students." });
        }
        return res.json({ message: "Department deleted successfully" });
    });
});

// Endpoint to delete a section
app.delete('/sections/:id', (req, res) => {
    const sql = "DELETE FROM sections WHERE id = ?";
    const id = req.params.id;
    db.query(sql, [id], (err, data) => {
        if (err) return res.json({ error: "Failed to delete section" });
        return res.json({ message: "Section deleted successfully" });
    });
});

// Endpoint to get a student's enrolled subjects
app.get('/users/:id/subjects', (req, res) => {
    const studentId = req.params.id;
    const sql = `
        SELECT 
            sub.id, 
            sub.code, 
            sub.name, 
            instructor.name as instructor
        FROM users u
        JOIN sections s ON u.section_id = s.id
        JOIN subjects sub ON s.subject_id = sub.id
        LEFT JOIN users instructor ON sub.faculty_id = instructor.id
        WHERE u.id = ? AND u.role = 'student'`;

    db.query(sql, [studentId], (err, data) => {
        if (err) return res.status(500).json({ error: "Failed to fetch student subjects" });
        return res.json(data);
    });
});

// Endpoint to delete a subject
app.delete('/subjects/:id', (req, res) => {
    const sql = "DELETE FROM subjects WHERE id = ?";
    const id = req.params.id;
    db.query(sql, [id], (err, data) => {
        if (err) {
            console.error("Error deleting subject:", err);
            return res.json({ error: "Failed to delete subject. It might be in use by a section." });
        }
        return res.json({ message: "Subject deleted successfully" });
    });
});

app.listen(3001, () => {
    console.log('Server is running on port 3001');
})
