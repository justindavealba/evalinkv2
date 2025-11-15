const express = require('express');
const mysql = require('mysql2/promise'); // Use the promise-based version
const bcrypt = require('bcrypt');
const cors = require('cors');

// For file uploads
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files (like uploaded images) from the 'public' directory
app.use(express.static('public'));
// Use a connection pool for better performance and resource management
const dbPool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'evalink', // Corrected to match the database we created
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = 'public/uploads/profiles/';
        // Ensure this directory exists, creating it if it doesn't.
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Create a unique filename to avoid overwrites
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

/**
 * Checks if a default admin user exists and creates one if not.
 * This function is safe to run on every server start.
 */
async function createAdminIfNotExists() {
    let connection;
    try {
        connection = await dbPool.getConnection();
        const adminEmail = 'admin';
        const adminPassword = 'admin123';
        const adminName = 'Administrator';
        const saltRounds = 10;

        const [rows] = await connection.execute('SELECT email FROM users WHERE email = ?', [adminEmail]);

        if (rows.length > 0) {
            console.log(`Admin user "${adminEmail}" already exists. Skipping creation.`);
            return;
        }

        console.log(`Admin user "${adminEmail}" not found. Creating...`);
        const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
        const insertQuery = `INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, 'admin')`;
        await connection.execute(insertQuery, [adminEmail, adminName, adminEmail, hashedPassword]);
        console.log(`✅ Admin user "${adminEmail}" created successfully!`);

    } catch (error) {
        console.error('❌ Error during admin user setup:', error.message);
    } finally {
        if (connection) connection.release();
    }
}

// Helper function to log activity
async function logActivity(userId, activityType, description) {
    try {
        const sql = "INSERT INTO activity_logs (user_id, activity_type, description) VALUES (?, ?, ?)";
        await dbPool.execute(sql, [userId, activityType, description]);
    } catch (error) {
        console.error(`Failed to log activity: ${error.message}`);
    }
}

app.get('/', (req, res) => {
    return res.json('Hello from the backend server!');
});

// --- AUTH ENDPOINTS ---

app.post('/login', async (req, res) => {
    try {
        const { email, id, password } = req.body;

        if ((!email && !id) || !password) {
            return res.status(400).json({ error: "Identifier and password are required" });
        }

        let sql;
        let params;

        if (email) {
            // Admin login using email as the username
            sql = "SELECT * FROM users WHERE email = ? AND role = 'admin'";
            params = [email];
        } else {
            // Student/Faculty login using ID
            sql = "SELECT * FROM users WHERE id = ?";
            params = [id];
        }

        const [rows] = await dbPool.execute(sql, params);

        if (rows.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Log the login activity (fire-and-forget)
        logActivity(user.id, 'login', 'User logged in successfully.');

        // On success, return user info (excluding password)
        const { password: _, ...userInfo } = user;
        return res.status(200).json({ message: "Login successful", user: userInfo });

    } catch (error) {
        console.error("Error during login:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// --- USER MANAGEMENT ENDPOINTS ---

app.get('/users', async (req, res) => {
    try {
        const role = req.query.role;
        if (!role) {
            return res.status(400).json({ error: "Role query parameter is required" });
        }

        const sql = `
        SELECT u.id, u.name, u.email, u.year_level, u.section_id, u.profile_image_url, d.name as department_name 
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.role = ?
        ORDER BY u.name ASC`;
        const [rows] = await dbPool.execute(sql, [role]);
        return res.json(rows);
    } catch (error) {
        console.error(`Error fetching users:`, error);
        return res.status(500).json({ error: `Failed to fetch users` });
    }
});

app.get('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sql = `
            SELECT u.id, u.name, u.email, u.role, u.year_level, u.section_id, u.profile_image_url, d.name as department_name 
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.id = ?`;
        const [rows] = await dbPool.execute(sql, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        // Return user info, excluding password if it were selected
        return res.json(rows[0]);
    } catch (error) {
        console.error(`Error fetching user:`, error);
        return res.status(500).json({ error: `Failed to fetch user` });
    }
});

app.post('/users', async (req, res) => {
    try {
        const { id, name, email, password, role, department_id, section_id, year_level } = req.body;
        // Assuming admin actions are not tied to a specific user in this context for logging
        // In a real app, you'd get the admin's ID from a token.
        const adminId = req.body.adminId || 'admin'; // Fallback to 'admin'
        const hashedPassword = await bcrypt.hash(password.toString(), 10);

        const sql = "INSERT INTO users (`id`, `name`, `email`, `password`, `role`, `department_id`, `section_id`, `year_level`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        const values = [id, name, email, hashedPassword, role, department_id, section_id || null, year_level || null];

        const [result] = await dbPool.execute(sql, values);
        logActivity(adminId, 'create_user', `Created new ${role}: ${name} (${id})`);
        return res.status(201).json({ message: "User added successfully", userId: result.insertId });
    } catch (error) {
        console.error("Error adding user:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: "A user with this email already exists." });
        }
        return res.status(500).json({ error: "Failed to add user" });
    }
});

app.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.body.adminId || 'admin';

        const sql = "DELETE FROM users WHERE id = ?";
        const [result] = await dbPool.execute(sql, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        logActivity(adminId, 'delete_user', `Deleted user with ID: ${id}`);
        return res.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        return res.status(500).json({ error: "Failed to delete user." });
    }
});

// New endpoint for uploading a profile image
app.post('/users/:id/profile-image', upload.single('profileImage'), async (req, res) => {
    const { id } = req.params;
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    // The path to be stored in the DB, relative to the server root
    const imageUrl = `/uploads/profiles/${req.file.filename}`;

    try {
        const sql = "UPDATE users SET profile_image_url = ? WHERE id = ?";
        await dbPool.execute(sql, [imageUrl, id]);

        // Log activity
        logActivity(id, 'update_profile', 'User updated their profile picture.');
        res.json({ message: 'Profile image updated successfully', imageUrl });
    } catch (error) {
        console.error("Error updating profile image:", error);
        res.status(500).json({ error: 'Database error while updating profile image.' });
    }
});

// --- DEPARTMENT ENDPOINTS ---

app.get('/departments', async (req, res) => {
    try {
        const sql = "SELECT * FROM departments ORDER BY name ASC";
        const [rows] = await dbPool.query(sql);
        return res.json(rows);
    } catch (error) {
        console.error("Error fetching departments:", error);
        return res.status(500).json({ error: "Failed to fetch departments" });
    }
});

app.post('/departments', async (req, res) => {
    try {
        const { name } = req.body;
        const adminId = req.body.adminId || 'admin';
        const sql = "INSERT INTO departments (`name`) VALUES (?)";
        const [result] = await dbPool.execute(sql, [name]);
        logActivity(adminId, 'create_department', `Added department: ${name}`);
        return res.status(201).json({ message: "Department added successfully", departmentId: result.insertId });
    } catch (error) {
        console.error("Error adding department:", error);
        return res.status(500).json({ error: "Failed to add department" });
    }
});

app.delete('/departments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.body.adminId || 'admin';
        const sql = "DELETE FROM departments WHERE id = ?";
        await dbPool.execute(sql, [id]);
        logActivity(adminId, 'delete_department', `Deleted department with ID: ${id}`);
        return res.json({ message: "Department deleted successfully" });
    } catch (error) {
        console.error("Error deleting department:", error);
        return res.status(500).json({ error: "Failed to delete department. It might be in use." });
    }
});

// --- SECTION ENDPOINTS ---

app.get('/sections', async (req, res) => {
    try {
        const sql = `
        SELECT s.id, s.name, s.year_level, d.name as department_name
        FROM sections s
        LEFT JOIN departments d ON s.department_id = d.id
        ORDER BY s.name ASC`;
        const [rows] = await dbPool.query(sql);
        return res.json(rows);
    } catch (error) {
        console.error("Error fetching sections:", error);
        return res.status(500).json({ error: "Failed to fetch sections" });
    }
});

app.post('/sections', async (req, res) => {
    try {
        const { name, department_id, year_level } = req.body;
        const adminId = req.body.adminId || 'admin';
        const sql = "INSERT INTO sections (`name`, `department_id`, `year_level`) VALUES (?, ?, ?)";
        const [result] = await dbPool.execute(sql, [name, department_id, year_level]);
        logActivity(adminId, 'create_section', `Added section: ${name}`);
        return res.status(201).json({ message: "Section added successfully", sectionId: result.insertId });
    } catch (error) {
        console.error("Error adding section:", error);
        return res.status(500).json({ error: "Failed to add section" });
    }
});

app.get('/users/:id/sections', async (req, res) => {
    try {
        const { id } = req.params;
        const sql = `
            SELECT 
                fs.section_id,
                fs.subject_id,
                sec.name as section_name,
                sub.name as subject_name,
                sub.code as subject_code
            FROM faculty_subjects fs
            JOIN sections sec ON fs.section_id = sec.id
            JOIN subjects sub ON fs.subject_id = sub.id
            WHERE fs.faculty_id = ?
            ORDER BY sec.name, sub.name;
        `;
        const [rows] = await dbPool.execute(sql, [id]);
        return res.json(rows);
    } catch (error) {
        console.error("Error fetching faculty sections:", error);
        return res.status(500).json({ error: "Failed to fetch faculty sections" });
    }
});

app.delete('/sections/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.body.adminId || 'admin';
        const sql = "DELETE FROM sections WHERE id = ?";
        await dbPool.execute(sql, [id]);
        logActivity(adminId, 'delete_section', `Deleted section with ID: ${id}`);
        return res.json({ message: "Section deleted successfully" });
    } catch (error) {
        console.error("Error deleting section:", error);
        return res.status(500).json({ error: "Failed to delete section" });
    }
});

// --- SUBJECT ENDPOINTS ---

app.get('/subjects', async (req, res) => {
    try {
        const sql = `
            SELECT 
                s.id, s.code, s.name, s.year_level, 
                d.name as department_name,
                GROUP_CONCAT(f.name) as faculty_name
            FROM subjects s
            LEFT JOIN departments d ON s.department_id = d.id
            LEFT JOIN faculty_subjects fs ON s.id = fs.subject_id
            LEFT JOIN users f ON fs.faculty_id = f.id AND f.role = 'faculty'
            GROUP BY s.id
            ORDER BY s.code ASC`;
        const [rows] = await dbPool.query(sql);
        return res.json(rows);
    } catch (error) {
        console.error("Error fetching subjects:", error);
        return res.status(500).json({ error: "Failed to fetch subjects" });
    }
});

app.post('/subjects', async (req, res) => {
    try {
        const { code, name, department_id, year_level } = req.body;
        const adminId = req.body.adminId || 'admin';
        const sql = "INSERT INTO subjects (`code`, `name`, `department_id`, `year_level`) VALUES (?, ?, ?, ?)";
        const [result] = await dbPool.execute(sql, [code, name, department_id, year_level]);
        logActivity(adminId, 'create_subject', `Added subject: ${name} (${code})`);
        return res.status(201).json({ message: "Subject added successfully", subjectId: result.insertId });
    } catch (error) {
        console.error("Error adding subject:", error);
        return res.status(500).json({ error: "Failed to add subject" });
    }
});

app.delete('/subjects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.body.adminId || 'admin';
        const sql = "DELETE FROM subjects WHERE id = ?";
        await dbPool.execute(sql, [id]);
        logActivity(adminId, 'delete_subject', `Deleted subject with ID: ${id}`);
        return res.json({ message: "Subject deleted successfully" });
    } catch (error) {
        console.error("Error deleting subject:", error);
        return res.status(500).json({ error: "Failed to delete subject. It might be in use." });
    }
});

// --- FACULTY LOAD (ASSIGNMENT) ENDPOINTS ---

app.get('/faculty-loads', async (req, res) => {
    try {
        const sql = `
            SELECT 
                CONCAT(fs.faculty_id, '-', fs.subject_id, '-', fs.section_id) as id,
                u.id as faculty_id,
                s.id as subject_id,
                sec.id as section_id,
                u.name as faculty_name,
                s.name as subject_name,
                sec.name as section_name,
                d.name as department_name
            FROM faculty_subjects fs
            JOIN users u ON fs.faculty_id = u.id
            JOIN subjects s ON fs.subject_id = s.id
            JOIN sections sec ON fs.section_id = sec.id
            JOIN departments d ON s.department_id = d.id
            ORDER BY u.name, s.name;
        `;
        const [rows] = await dbPool.query(sql);
        return res.json(rows);
    } catch (error) {
        console.error("Error fetching faculty loads:", error);
        return res.status(500).json({ error: "Failed to fetch faculty loads" });
    }
});

app.post('/faculty-loads', async (req, res) => {
    try {
        const { faculty_id, subject_id, section_id } = req.body;
        const adminId = req.body.adminId || 'admin';
        const sql = "INSERT INTO faculty_subjects (faculty_id, subject_id, section_id) VALUES (?, ?, ?)";
        const [result] = await dbPool.execute(sql, [faculty_id, subject_id, section_id]);
        logActivity(adminId, 'assign_load', `Assigned subject ${subject_id} to faculty ${faculty_id}`);
        return res.status(201).json({ message: "Faculty load assigned successfully", assignmentId: result.insertId });
    } catch (error) {
        console.error("Error assigning faculty load:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: "This subject and section is already assigned to a faculty member." });
        }
        return res.status(500).json({ error: "Failed to assign faculty load" });
    }
});

app.delete('/faculty-loads/:id', async (req, res) => {
    try {
        const compositeId = req.params.id;
        const [faculty_id, subject_id, section_id] = compositeId.split('-');
        const adminId = req.body.adminId || 'admin';

        const sql = "DELETE FROM faculty_subjects WHERE faculty_id = ? AND subject_id = ? AND section_id = ?";
        await dbPool.execute(sql, [faculty_id, subject_id, section_id]);
        logActivity(adminId, 'unassign_load', `Unassigned subject ${subject_id} from faculty ${faculty_id}`);
        return res.json({ message: "Faculty load unassigned successfully" });
    } catch (error) {
        console.error("Error deleting faculty load:", error);
        return res.status(500).json({ error: "Failed to delete faculty load" });
    }
});

// --- STUDENT SUBJECT (ENROLLMENT) ENDPOINTS ---

app.get('/student-subjects', async (req, res) => {
    try {
        const sql = `
            SELECT 
                CONCAT(ss.student_id, '-', ss.subject_id) as id,
                student.name as student_name,
                subj.name as subject_name,
                faculty.name as faculty_name,
                sec.name as section_name
            FROM student_subjects ss
            JOIN users student ON ss.student_id = student.id
            JOIN subjects subj ON ss.subject_id = subj.id
            JOIN users faculty ON ss.faculty_id = faculty.id
            LEFT JOIN sections sec ON ss.section_id = sec.id
            ORDER BY student.name, subj.name;
        `;
        const [rows] = await dbPool.query(sql);
        return res.json(rows);
    } catch (error) {
        console.error("Error fetching student subjects:", error);
        return res.status(500).json({ error: "Failed to fetch student subjects" });
    }
});

app.post('/student-subjects', async (req, res) => {
    try {
        const { student_id, subject_id, faculty_id, section_id = null } = req.body;
        const adminId = req.body.adminId || 'admin';
        const sql = "INSERT INTO student_subjects (student_id, subject_id, faculty_id, section_id) VALUES (?, ?, ?, ?)"; // Query is correct
        const [result] = await dbPool.execute(sql, [student_id, subject_id, faculty_id, section_id || null]); // Values were missing faculty_id
        logActivity(adminId, 'enroll_student', `Enrolled student ${student_id} in subject ${subject_id}`);
        return res.status(201).json({ message: "Student enrolled in subject successfully", enrollmentId: result.insertId });
    } catch (error) {
        console.error("Error enrolling student:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: "This student is already enrolled in this subject." });
        }
        return res.status(500).json({ error: "Failed to enroll student" });
    }
});

app.delete('/student-subjects/:id', async (req, res) => {
    try {
        const compositeId = req.params.id;
        const [student_id, subject_id] = compositeId.split('-');
        const adminId = req.body.adminId || 'admin';

        const sql = "DELETE FROM student_subjects WHERE student_id = ? AND subject_id = ?";
        await dbPool.execute(sql, [student_id, subject_id]);
        logActivity(adminId, 'unenroll_student', `Unenrolled student ${student_id} from subject ${subject_id}`);
        return res.json({ message: "Student enrollment deleted successfully" });
    } catch (error) {
        console.error("Error deleting student enrollment:", error);
        return res.status(500).json({ error: "Failed to delete enrollment" });
    }
});

// --- STUDENT-SPECIFIC ENDPOINTS ---

app.get('/users/:id/subjects', async (req, res) => {
    try {
        const { id } = req.params;
        const sql = `
            SELECT
                s.id,
                s.code,
                s.name,
                ss.faculty_id,
                ss.section_id,
                f.name as instructor,
                f.name as faculty_name -- Add this line for consistency
            FROM student_subjects ss
            JOIN subjects s ON ss.subject_id = s.id
            JOIN users f ON ss.faculty_id = f.id
            WHERE ss.student_id = ?
            ORDER BY s.name;
        `;
        const [rows] = await dbPool.execute(sql, [id]);
        return res.json(rows);
    } catch (error) {
        console.error("Error fetching student's enrolled subjects:", error);
        return res.status(500).json({ error: "Failed to fetch enrolled subjects" });
    }
});

// GET /students/:studentId/evaluated-subjects - Get IDs of subjects a student has already evaluated
app.get('/students/:studentId/evaluated-subjects', async (req, res) => {
    try {
        const { studentId } = req.params;
        const sql = `SELECT subject_id FROM evaluations WHERE student_id = ?`;
        const [rows] = await dbPool.execute(sql, [studentId]);
        // Return an array of just the IDs for easy lookup on the frontend
        const evaluatedSubjectIds = rows.map(row => row.subject_id);
        return res.json(evaluatedSubjectIds);
    } catch (error) {
        console.error("Error fetching evaluated subjects:", error);
        return res.status(500).json({ error: "Failed to fetch evaluated subjects" });
    }
});

// --- ACTIVITY LOG ENDPOINTS ---

// GET /activity-logs - Get all logs for the admin
app.get('/activity-logs', async (req, res) => {
    try {
        const sql = `
            SELECT l.activity_type, l.description, DATE_FORMAT(l.timestamp, '%Y-%m-%d %h:%i %p') as timestamp, u.name as user_name, u.role as user_role
            FROM activity_logs l
            JOIN users u ON l.user_id = u.id 
            WHERE u.role = 'admin'
            ORDER BY l.timestamp DESC`;
        const [logs] = await dbPool.query(sql);
        res.json(logs);
    } catch (error) {
        console.error("Error fetching all activity logs:", error);
        res.status(500).json({ error: "Failed to fetch all activity logs." });
    }
});
// GET /users/:userId/activity-logs - Get all activity logs for a user
app.get('/users/:userId/activity-logs', async (req, res) => {
    const { userId } = req.params;
    try {
        const sql = "SELECT activity_type, description, DATE_FORMAT(timestamp, '%Y-%m-%d %h:%i %p') as timestamp FROM activity_logs WHERE user_id = ? ORDER BY timestamp DESC";
        const [logs] = await dbPool.execute(sql, [userId]);
        res.json(logs);
    } catch (error) {
        console.error("Error fetching activity logs:", error);
        res.status(500).json({ error: "Failed to fetch activity logs." });
    }
});

// POST /activity-logs - Manually create a log (for client-side events like logout)
app.post('/activity-logs', async (req, res) => {
    const { userId, activityType, description } = req.body;
    await logActivity(userId, activityType, description);
    res.status(201).json({ message: "Activity logged." });
});


// --- INCIDENT REPORT ENDPOINTS ---

// GET /incidents/student/:studentId - Get incident history for a student
app.get('/incidents/student/:studentId', async (req, res) => {
    const { studentId } = req.params;
    try {
        const sql = "SELECT id, title, description, status, DATE_FORMAT(submitted_at, '%Y-%m-%d %h:%i %p') as date FROM incidents WHERE student_id = ? ORDER BY submitted_at DESC";
        const [rows] = await dbPool.execute(sql, [studentId]);
        res.json(rows);
    } catch (error) {
        console.error("Error fetching incident reports:", error);
        res.status(500).json({ error: "Failed to fetch incident reports." });
    }
});

// GET /incidents - For Admin Dashboard to see ALL incidents
app.get('/incidents', async (req, res) => {
    try {
        const sql = `
            SELECT 
                i.id, i.title, i.description, i.status, 
                DATE_FORMAT(i.submitted_at, '%Y-%m-%d %h:%i %p') as date,
                u.name as reporter_name,
                u.id as reporter_id,
                u.role as reporter_role
            FROM incidents i
            JOIN users u ON i.student_id = u.id
            ORDER BY i.submitted_at DESC;
        `;
        const [rows] = await dbPool.query(sql);
        res.json(rows);
    } catch (error) {
        console.error("Error fetching all incidents:", error);
        res.status(500).json({ error: "Failed to fetch all incidents." });
    }
});

// POST /incidents - Create a new incident report
app.post('/incidents', async (req, res) => {
    const { student_id, title, description } = req.body;
    if (!student_id || !title || !description) {
        return res.status(400).json({ error: "Student ID, title, and description are required." });
    }
    try {
        const sql = "INSERT INTO incidents (student_id, title, description) VALUES (?, ?, ?)";
        const [result] = await dbPool.execute(sql, [student_id, title, description]);

        // Log activity
        logActivity(student_id, 'report_incident', `Reported incident: "${title}"`);
        res.status(201).json({ message: "Incident reported successfully!", incidentId: result.insertId });
    } catch (error) {
        console.error("Error reporting incident:", error);
        res.status(500).json({ error: "Failed to report incident." });
    }
});

// PATCH /incidents/:id - Update incident status by Admin
app.patch('/incidents/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // In a real app, get admin ID from auth token
    const adminId = 'admin';

    if (!status) {
        return res.status(400).json({ error: "Status is required." });
    }

    const allowedStatuses = ['Pending', 'Under Investigation', 'Resolved'];
    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status value." });
    }

    try {
        const sql = "UPDATE incidents SET status = ? WHERE id = ?";
        await dbPool.execute(sql, [status, id]);
        logActivity(adminId, 'update_incident', `Updated incident #${id} status to ${status}`);
        res.json({ message: "Incident status updated successfully." });
    } catch (error) {
        console.error("Error updating incident status:", error);
        res.status(500).json({ error: "Failed to update incident status." });
    }
});

// --- EVALUATION ENDPOINTS ---

// GET /evaluations - For Admin Dashboard Evaluation Reports
app.get('/evaluations', async (req, res) => {
    try {
        const sql = `
            SELECT
                e.id,
                e.student_id,
                s.name as course,
                e.comments as feedback,
                AVG(ea.rating) as rating
            FROM evaluations e
            JOIN subjects s ON e.subject_id = s.id
            LEFT JOIN evaluation_answers ea ON e.id = ea.evaluation_id
            GROUP BY e.id, e.student_id, s.name, e.comments
            ORDER BY e.submitted_at DESC;
        `;
        const [rows] = await dbPool.query(sql);
        // Ensure rating is formatted correctly, even if null
        const results = rows.map(row => ({ ...row, rating: row.rating ? parseFloat(row.rating) : 0 }));
        return res.json(results);
    } catch (error) {
        console.error("Error fetching all evaluations:", error);
        return res.status(500).json({ error: "Failed to fetch evaluation reports" });
    }
});

// GET /evaluations/stats/daily - Get daily evaluation counts for the chart
app.get('/evaluations/stats/daily', async (req, res) => {
    try {
        const days = parseInt(req.query.days, 10) || 7; // Default to 7 days if not specified

        const sql = `
            SELECT
                DATE(submitted_at) as evaluation_date,
                COUNT(*) as evaluation_count
            FROM evaluations
            WHERE submitted_at >= CURDATE() - INTERVAL ? DAY
            GROUP BY DATE(submitted_at)
            ORDER BY evaluation_date ASC;
        `;

        const [rows] = await dbPool.execute(sql, [days]);
        return res.json(rows);
    } catch (error) {
        console.error("Error fetching daily evaluation stats:", error);
        return res.status(500).json({ error: "Failed to fetch daily stats" });
    }
});

// POST /evaluations - Submit a new student evaluation
app.post("/evaluations", async (req, res) => {
  const { student_id, faculty_id, subject_id, section_id, answers, comments } =
    req.body;

  // Basic validation
  if (!student_id || !faculty_id || !subject_id || !answers) {
    return res.status(400).json({ error: "Missing required evaluation data." });
  }

  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();

    // Step 1: Insert the main evaluation record
    const evaluationQuery = `
      INSERT INTO evaluations (student_id, faculty_id, subject_id, section_id, comments)
      VALUES (?, ?, ?, ?, ?);
    `;
    const [evaluationResult] = await connection.query(evaluationQuery, [
      student_id,
      faculty_id,
      subject_id,
      section_id || null,
      comments,
    ]);
    const evaluationId = evaluationResult.insertId;

    // Step 2: Prepare and insert all the answers
    const answerEntries = Object.entries(answers); // [[questionId, rating], ...]
    if (answerEntries.length === 0) {
      throw new Error("No answers provided."); // Rollback if no answers
    }

    const answerValues = answerEntries.map(([question_id, rating]) => [
      evaluationId,
      parseInt(question_id, 10),
      rating,
    ]);

    const answersQuery = `
      INSERT INTO evaluation_answers (evaluation_id, question_id, rating)
      VALUES ?;
    `;
    await connection.query(answersQuery, [answerValues]);

    // Step 3: Commit the transaction
    await connection.commit();

    // Log activity after successful commit
    logActivity(student_id, 'evaluation', `Submitted evaluation for subject ID ${subject_id}.`);

    res.status(201).json({ message: "Evaluation submitted successfully!" });
  } catch (error) {
    await connection.rollback(); // Rollback on any error
    console.error("Error submitting evaluation:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "You have already submitted an evaluation for this subject." });
    }

    res.status(500).json({ error: "Failed to submit evaluation due to a server error." });
  } finally {
    connection.release(); // Always release the connection
  }
});
// ... (your existing server.js code)

// GET /evaluation-questions - Fetch all categories and their questions
// Used by both Student and Admin dashboards.
app.get("/evaluation-questions", async (req, res) => {
  const query = `
    SELECT 
      ec.id as category_id, 
      ec.name as category_name,
      eq.id as question_id,
      eq.text as question_text
    FROM evaluation_categories ec
    LEFT JOIN evaluation_questions eq ON ec.id = eq.category_id
    ORDER BY ec.display_order, ec.id, eq.display_order, eq.id;
  `;

  try {
    const [results] = await dbPool.query(query);

    // Process the flat results into a nested structure
    const categories = {};
    results.forEach((row) => {
      if (!categories[row.category_id]) {
        categories[row.category_id] = {
          id: row.category_id,
          name: row.category_name, // This should be 'name' for the frontend
          questions: [],
        };
      }
      // Add question only if it exists (for categories with no questions)
      if (row.question_id) {
        categories[row.category_id].questions.push({
          id: row.question_id,
          text: row.question_text, // This should be 'text' for the frontend
        });
      }
    });

    res.json(Object.values(categories));
  } catch (error) {
    console.error("Error fetching evaluation questions:", error);
    res.status(500).json({ error: "Failed to fetch evaluation questions" });
  }
});

// POST /evaluation-categories - Add a new category
app.post("/evaluation-categories", async (req, res) => {
  const { name, display_order = 0 } = req.body;
  const adminId = 'admin';

  if (!name) {
    return res.status(400).json({ error: "Category name is required." });
  }

  const query = "INSERT INTO evaluation_categories (name, display_order) VALUES (?, ?)";
  try {
    await dbPool.execute(query, [name, display_order]);
    logActivity(adminId, 'create_eval_category', `Created evaluation category: ${name}`);
    res.status(201).json({ message: "Evaluation category added successfully!" });
  } catch (error) {
    console.error("Error adding evaluation category:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "This category name already exists." });
    }
    res.status(500).json({ error: "Database error." });
  }
});

// POST /evaluation-questions - Add a new question to a category
app.post("/evaluation-questions", async (req, res) => {
  const { category_id, text, display_order = 0 } = req.body;
  const adminId = 'admin';

  if (!category_id || !text) {
    return res
      .status(400)
      .json({ error: "Category ID and question text are required." });
  }

  const query = "INSERT INTO evaluation_questions (category_id, text, display_order) VALUES (?, ?, ?)";
  try {
    await dbPool.execute(query, [category_id, text, display_order]);
    logActivity(adminId, 'create_eval_question', `Added new evaluation question.`);
    res.status(201).json({ message: "Evaluation question added successfully!" });
  } catch (error) {
    console.error("Error adding evaluation question:", error);
    res.status(500).json({ error: "Database error." });
  }
});

// ... (rest of your server.js code)
// GET /faculty/:facultyId/evaluations - Get aggregated evaluation results for a faculty member
app.get('/faculty/:facultyId/evaluations', async (req, res) => {
  const { facultyId } = req.params;

  const query = `
    SELECT 
      s.id AS subject_id,
      s.name AS subject_name,
      s.code AS subject_code,
      ec.id AS category_id,
      ec.name AS category_name,
      eq.id AS question_id,
      eq.text AS question_text,
      ea.rating,
      e.id as evaluation_id,
      e.comments
    FROM evaluations e
    JOIN evaluation_answers ea ON e.id = ea.evaluation_id
    JOIN evaluation_questions eq ON ea.question_id = eq.id
    JOIN evaluation_categories ec ON eq.category_id = ec.id
    JOIN subjects s ON e.subject_id = s.id
    WHERE e.faculty_id = ?
    ORDER BY s.name, ec.display_order, eq.display_order;
  `;

  try {
    const [rows] = await dbPool.execute(query, [facultyId]);

    if (rows.length === 0) {
      return res.json([]);
    }

    // Process the flat data into a nested structure
    const resultsBySubject = {};

    rows.forEach(row => {
      const { subject_id, subject_name, subject_code, category_id, category_name, question_id, question_text, rating, evaluation_id, comments } = row;

      if (!resultsBySubject[subject_id]) {
        resultsBySubject[subject_id] = {
          subject_id,
          subject_name,
          subject_code,
          total_evaluations: 0,
          comments: new Set(),
          questions: {},
          total_rating_sum: 0,
          total_ratings_count: 0,
        };
      }

      const subject = resultsBySubject[subject_id];
      if (comments) subject.comments.add(comments);

      if (!subject.questions[question_id]) {
        subject.questions[question_id] = {
          question_id,
          question_text,
          category_name,
          total_rating: 0,
          count: 0,
        };
      }

      // Aggregate ratings for each question
      subject.questions[question_id].total_rating += rating;
      subject.questions[question_id].count++;
    });

    // Final processing: convert sets to arrays and calculate overall averages
    const finalResults = Object.values(resultsBySubject).map(subject => {
      const all_questions = Object.values(subject.questions);
      const total_sum = all_questions.reduce((sum, q) => sum + q.total_rating, 0);
      const total_count = all_questions.reduce((sum, q) => sum + q.count, 0);
      const overall_average = total_count > 0 ? (total_sum / total_count).toFixed(2) : "0.00";

      // Get unique evaluation count
      const evaluationIds = new Set(rows.filter(r => r.subject_id === subject.subject_id).map(r => r.evaluation_id));

      return {
        subject_id: subject.subject_id,
        subject_name: subject.subject_name,
        subject_code: subject.subject_code,
        comments: Array.from(subject.comments).filter(c => c.trim() !== ''),
        overall_average: overall_average,
        total_evaluations: evaluationIds.size,
      };
    });

    res.json(finalResults);
  } catch (error) {
    console.error("Error fetching aggregated evaluations:", error);
    res.status(500).json({ error: "Failed to fetch evaluation results" });
  }
});

const PORT = 3001;
app.listen(PORT, async () => {
    console.log('Server is running on port 3001');
    await createAdminIfNotExists();
});
