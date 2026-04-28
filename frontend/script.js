const API_BASE_URL = "http://127.0.0.1:5000";

function speakMessage(text) {
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // LOGIN
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value.trim();
      const email = document.getElementById("email").value.trim();

      const loginMessage = document.getElementById("loginMessage");
      const loginError = document.getElementById("loginError");

      if (loginMessage) loginMessage.textContent = "";
      if (loginError) loginError.textContent = "";

      try {
        const res = await fetch(`${API_BASE_URL}/api/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({ username, password, email })
        });

        const data = await res.json();
        console.log("Login response:", data);

        if (data.success) {
          if (loginMessage) loginMessage.textContent = "Login successful";
          speakMessage("Login successful");

          setTimeout(() => {
            window.location.href = "home.html";
          }, 800);
        } else {
          if (loginError) loginError.textContent = data.message || "Login failed";
        }
      } catch (err) {
        console.error("Login error:", err);
        if (loginError) loginError.textContent = "Unable to connect to backend server";
      }
    });
  }

  // REGISTER
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = document.getElementById("registerUsername").value.trim();
      const password = document.getElementById("registerPassword").value.trim();
      const email = document.getElementById("registerEmail").value.trim();

      const registerMessage = document.getElementById("registerMessage");
      const registerError = document.getElementById("registerError");

      if (registerMessage) registerMessage.textContent = "";
      if (registerError) registerError.textContent = "";

      try {
        const res = await fetch(`${API_BASE_URL}/api/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ username, password, email })
        });

        const data = await res.json();
        console.log("Register response:", data);

        if (data.success) {
          if (registerMessage) registerMessage.textContent = "Registration successful";
          speakMessage("Registration successful");

          setTimeout(() => {
            window.location.href = "login.html";
          }, 1000);
        } else {
          if (registerError) registerError.textContent = data.message || "Registration failed";
        }
      } catch (err) {
        console.error("Register error:", err);
        if (registerError) registerError.textContent = "Unable to connect to backend server";
      }
    });
  }

  // REVIEW
  const reviewForm = document.getElementById("reviewForm");
  if (reviewForm) {
    reviewForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const reviewMessage = document.getElementById("reviewMessage");
      if (reviewMessage) {
        reviewMessage.textContent = "Thanks for your feedback";
      }

      speakMessage("Thanks for your feedback");
      reviewForm.reset();
    });
  }

  // PREDICTION
  const predictForm = document.getElementById("predictForm");
  if (predictForm) {
    predictForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const resultEl = document.getElementById("result");
      if (resultEl) resultEl.textContent = "Predicting...";

      const data = {
        Category: document.getElementById("category").value.trim(),
        Main_Category: document.getElementById("main_category").value.trim(),
        Country: document.getElementById("country").value.trim(),
        Campaign_Duration_Days: Number(document.getElementById("duration").value),
        Goal_Amount: Number(document.getElementById("goal").value),
        Pledged_Amount: Number(document.getElementById("pledged").value),
        Backers_Count: Number(document.getElementById("backers").value),
        Is_Featured: document.getElementById("featured").value,
        Funding_Gap: Number(document.getElementById("gap").value),
        Goal_Range: document.getElementById("goal_range").value.trim()
      };

      try {
        const res = await fetch(`${API_BASE_URL}/api/predict`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(data)
        });

        const result = await res.json();
        console.log("Prediction result:", result);

        if (result.success) {
          if (resultEl) {
            resultEl.textContent = `Logistic: ${result.logistic} | Random Forest: ${result.random_forest}`;
          }
        } else {
          if (resultEl) {
            resultEl.textContent = result.message || "Prediction failed";
          }
        }
      } catch (err) {
        console.error("Prediction error:", err);
        if (resultEl) {
          resultEl.textContent = "Prediction failed";
        }
      }
    });
  }
});

// ALERT FUNCTION
async function handleAlert(event, alertTitle) {
  event.preventDefault();

  const alertMessage = document.getElementById("alertMessage");
  if (alertMessage) {
    alertMessage.textContent = "Sending alert...";
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/send-alert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ alertTitle })
    });

    const data = await res.json();

    if (alertMessage) {
      alertMessage.textContent = data.message || "Alert processed";
    }
  } catch (err) {
    console.error("Alert error:", err);
    if (alertMessage) {
      alertMessage.textContent = "Alert failed";
    }
  }
}