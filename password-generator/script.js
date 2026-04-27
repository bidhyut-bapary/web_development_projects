const passwordField = document.getElementById("password");
const lengthSlider = document.getElementById("length");
const lengthValue = document.getElementById("lengthValue");
const strengthText = document.getElementById("strength");

lengthSlider.oninput = () => {
    lengthValue.innerText = lengthSlider.value;
};

function generatePassword() {
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+";

    let chars = "";

    if (document.getElementById("uppercase").checked) chars += upper;
    if (document.getElementById("lowercase").checked) chars += lower;
    if (document.getElementById("numbers").checked) chars += numbers;
    if (document.getElementById("symbols").checked) chars += symbols;

    if (!chars) {
        alert("Select at least one option!");
        return;
    }

    let password = "";
    for (let i = 0; i < lengthSlider.value; i++) {
        password += chars[Math.floor(Math.random() * chars.length)];
    }

    passwordField.value = password;
    checkStrength(password);
}

function checkStrength(pwd) {
    if (pwd.length < 10) {
        strengthText.innerText = "Weak";
        strengthText.style.color = "red";
    } else if (pwd.length < 16) {
        strengthText.innerText = "Medium";
        strengthText.style.color = "orange";
    } else {
        strengthText.innerText = "Strong";
        strengthText.style.color = "green";
    }
}

function copyPassword() {
    passwordField.select();
    document.execCommand("copy");
    alert("Copied!");
}


// Dark/Light Mode Toggle
function toggleTheme() {
    document.body.classList.toggle("dark");
    document.body.classList.toggle("light");

    const themeBtn = document.getElementById("toggleTheme");
    if (document.body.classList.contains("dark")) {
        themeBtn.innerText = "🌙 Dark Mode";
    } else {
        themeBtn.innerText = "☀️ Light Mode";
    }
}

// Default theme
document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("light");
});