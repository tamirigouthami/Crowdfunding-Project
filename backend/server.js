const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const session = require("express-session");
const validUsers = require("./users");

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: "http://127.0.0.1:5500",
    credentials: true
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
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

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.post("/api/login", (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({
        success: false,
        message: "Username, password, and email are required"
      });
    }

    const user = validUsers.find(
      (u) =>
        u.username === username.trim() &&
        u.password === password.trim() &&
        u.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username, password, or email"
      });
    }

    req.session.user = {
      username: user.username,
      email: user.email
    };

    return res.json({
      success: true,
      message: "Login successful",
      user: {
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during login"
    });
  }
});

app.get("/api/me", (req, res) => {
  try {
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
  } catch (error) {
    console.error("Session check error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while checking session"
    });
  }
});

app.post("/api/send-alert", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first"
      });
    }

    const { alertTitle } = req.body;

    if (!alertTitle) {
      return res.status(400).json({
        success: false,
        message: "Alert message is required"
      });
    }

    const loggedInUser = req.session.user;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: loggedInUser.email,
      subject: "Crowdfunding Alert Notification",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
          <h2 style="color: #1d4ed8;">Crowdfunding Alert Notification</h2>
          <p>Hello <strong>${loggedInUser.username}</strong>,</p>
          <p>You have received a new alert from the Crowdfunding Data Analysis Web Application.</p>
          <p><strong>Alert Message:</strong> ${alertTitle}</p>
          <p>Please review this insight in your application dashboard.</p>
          <br/>
          <p>Regards,</p>
          <p><strong>Crowdfunding Data Analysis System</strong></p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    return res.json({
      success: true,
      message: `Alert email sent successfully to ${loggedInUser.email}`
    });
  } catch (error) {
    console.error("Send alert error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send alert email"
    });
  }
});

app.post("/api/logout", (req, res) => {
  try {
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
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during logout"
    });
  }
});

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

app.listen(process.env.PORT, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});