require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const session = require("express-session");
const nodemailer = require("nodemailer");
const mysql = require("mysql2/promise");

const app = express();

// ================= DATABASE =================
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "crowdfunding_db"
});

// ================= MIDDLEWARE =================
app.use(
  cors({
    origin: "http://127.0.0.1:5500",
    credentials: true
  })
);

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "crowdfunding_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60
    }
  })
);

// ================= MAIL =================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("Backend server is running");
});

// ================= REGISTER =================
app.post("/api/register", async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({
        success: false,
        message: "Username, password, and email are required"
      });
    }

    const [existingUsers] = await pool.execute(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username.trim(), email.trim().toLowerCase()]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Username or email already exists"
      });
    }

    await pool.execute(
      "INSERT INTO users (username, password, email, role, is_alert_recipient) VALUES (?, ?, ?, ?, ?)",
      [username.trim(), password.trim(), email.trim().toLowerCase(), "user", 1]
    );

    return res.json({
      success: true,
      message: "Registration successful. Please login."
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during registration"
    });
  }
});

// ================= LOGIN =================
app.post("/api/login", async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({
        success: false,
        message: "Username, password, and email are required"
      });
    }

    const [rows] = await pool.execute(
      "SELECT id, username, email, role FROM users WHERE username = ? AND password = ? AND email = ?",
      [username.trim(), password.trim(), email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid username, password, or email"
      });
    }

    const user = rows[0];

    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    return res.json({
      success: true,
      message: "Login successful",
      user: req.session.user
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during login"
    });
  }
});

// ================= SESSION CHECK =================
app.get("/api/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: "No user logged in"
    });
  }

  return res.json({
    success: true,
    user: req.session.user
  });
});

// ================= LOGOUT =================
app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Logout failed"
      });
    }

    return res.json({
      success: true,
      message: "Logged out successfully"
    });
  });
});

// ================= ALERT MAIL =================
app.post("/api/send-alert", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first"
      });
    }

    if (req.session.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can send alert messages"
      });
    }

    const { alertTitle } = req.body;

    if (!alertTitle) {
      return res.status(400).json({
        success: false,
        message: "Alert message is required"
      });
    }

    const [recipients] = await pool.execute(
      "SELECT email FROM users WHERE is_alert_recipient = 1"
    );

    if (recipients.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No alert recipients found"
      });
    }

    const recipientEmails = recipients.map((user) => user.email);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      bcc: recipientEmails.join(","),
      subject: "Crowdfunding Alert Notification",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
          <h2 style="color: #1d4ed8;">Crowdfunding Alert Notification</h2>
          <p>Hello,</p>
          <p>An admin has triggered a new alert from the Crowdfunding Data Analytics Web Application.</p>
          <p><strong>Alert Message:</strong> ${alertTitle}</p>
          <p>Please review this insight in your application dashboard.</p>
          <br/>
          <p>Regards,</p>
          <p><strong>Crowdfunding Data Analytics System</strong></p>
        </div>
      `
    });

    return res.json({
      success: true,
      message: `Alert email sent successfully to ${recipientEmails.length} users`
    });
  } catch (error) {
    console.error("Send alert error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send alert email"
    });
  }
});

// ================= ML PREDICTION =================
app.post("/api/predict", async (req, res) => {
  try {
    console.log("Received from frontend:", req.body);

    const response = await axios.post(
      "http://127.0.0.1:5001/predict",
      req.body
    );

    console.log("Flask response:", response.data);

    return res.json({
      success: response.data.success,
      logistic: response.data.logistic,
      random_forest: response.data.random_forest,
      message: response.data.message || ""
    });
  } catch (error) {
    console.error("Node prediction error:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      logistic: "",
      random_forest: "",
      message: "Prediction failed"
    });
  }
});

// ================= TEST DB =================
app.get("/api/test-db", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT NOW() AS currentTime");
    res.json({
      success: true,
      message: "Database connected successfully",
      time: rows[0].currentTime
    });
  } catch (error) {
    console.error("DB test error:", error);
    res.status(500).json({
      success: false,
      message: "Database connection failed"
    });
  }
});

// ================= TEST MAIL =================
app.get("/api/test-mail", async (req, res) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "Test Email from Crowdfunding Backend",
      text: "Your backend email configuration is working successfully."
    });

    return res.json({
      success: true,
      message: "Test email sent successfully"
    });
  } catch (error) {
    console.error("Test mail error:", error);
    return res.status(500).json({
      success: false,
      message: "Test email failed"
    });
  }
});

// ================= SERVER =================
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});