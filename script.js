const API_BASE_URL = "http://127.0.0.1:5000";

function speakMessage(text) {
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }
}

function playBeep(duration = 200, frequency = 700, volume = 0.2) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const audioContext = new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gainNode.gain.value = volume;

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();

  setTimeout(() => {
    oscillator.stop();
    audioContext.close();
  }, duration);
}

function playAlertOnly() {
  playBeep(220, 850, 0.2);
}

async function handleAlert(event, alertTitle) {
  event.stopPropagation();
  playBeep(250, 900, 0.25);

  const alertMessage = document.getElementById("alertMessage");
  if (alertMessage) {
    alertMessage.textContent = "Sending alert email...";
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/send-alert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ alertTitle })
    });

    const data = await response.json();

    if (alertMessage) {
      alertMessage.textContent = data.message;
    }

    if (data.success) {
      speakMessage("Alert email sent successfully");
    }
  } catch (error) {
    console.error("Alert error:", error);
    if (alertMessage) {
      alertMessage.textContent = "Failed to send alert email";
    }
  }
}

async function protectPage() {
  const protectedPage = document.querySelector(".protected-page");
  if (!protectedPage) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/me`, {
      method: "GET",
      credentials: "include"
    });

    const data = await response.json();

    if (!data.success) {
      window.location.href = "login.html";
      return;
    }

    localStorage.setItem("loggedInUser", JSON.stringify(data.user));
  } catch (error) {
    console.error("Protect page error:", error);
    window.location.href = "login.html";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const loginForm = document.getElementById("loginForm");

  if (!loginForm) {
    await protectPage();
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value.trim();
      const email = document.getElementById("email").value.trim();

      const loginMessage = document.getElementById("loginMessage");
      const loginError = document.getElementById("loginError");

      loginMessage.textContent = "";
      loginError.textContent = "";

      try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({ username, password, email })
        });

        const data = await response.json();

        if (data.success) {
          localStorage.setItem("loggedInUser", JSON.stringify(data.user));
          loginMessage.textContent = data.message;
          speakMessage("Login successful");

          setTimeout(() => {
            window.location.href = "home.html";
          }, 1200);
        } else {
          loginError.textContent = data.message;
        }
      } catch (error) {
        console.error("Login error:", error);
        loginError.textContent = "Unable to connect to backend server";
      }
    });
  }

  const reviewForm = document.getElementById("reviewForm");
  if (reviewForm) {
    reviewForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const reviewMessage = document.getElementById("reviewMessage");
      reviewMessage.textContent = "Thanks for your feedback";
      speakMessage("Thanks for your feedback");
      reviewForm.reset();
    });
  }
});