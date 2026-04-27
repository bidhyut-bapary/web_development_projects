// যখন পেজ লোড হবে তখন preloader দেখাবে
window.addEventListener("load", () => {
  const preloader = document.getElementById("preloader");
  const mainContent = document.querySelector(".main-content");

  setTimeout(() => {
    preloader.style.display = "none"; // Preloader লুকাবে
    mainContent.style.display = "block"; // Main content দেখাবে
  }, 1500); // 1 সেকেন্ড delay
});

const projects = [
  {
    title: "Password Generator",
    desc: "Secure password tool",
    link: "password-generator/index.html",
  },
  { title: "Loan Management System", desc: "coming soon", link: "#" },
  { title: "Electrical Work", desc: "coming soon", link: "#" },
  { title: "CV Builder", desc: "coming soon", link: "#" },
  { title: "Billing System", desc: "coming soon", link: "#" },
  {
    title: "Portfolio Website",
    desc: "Available Now",
    link: "https://bidhyut-bapary.github.io/my_portfolio_website/",
  },
  { title: "Photo Restoration", desc: "coming soon", link: "#" },
  { title: "Grocery Billing App", desc: "coming soon", link: "#" },
  { title: "Dark/Light Mode UI", desc: "coming soon", link: "#" },
  { title: "Git Workflow Tool", desc: "coming soon", link: "#" },
];

let perPage = 8;

function changePage(page) {
  let grid = document.getElementById("project-grid");
  grid.innerHTML = ""; // আগের কার্ড মুছে ফেলবে

  let start = (page - 1) * perPage;
  let end = start + perPage;
  let pageProjects = projects.slice(start, end);

  pageProjects.forEach((p) => {
    let card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
            <h3>${p.title}</h3>
            <p>${p.desc}</p>
            <a href="${p.link}" class="btn" target="_blank">View Project</a>
        `;
    grid.appendChild(card);
  });
}

// প্রথম পেজ লোড হবে
changePage(1);
function setupPagination() {
  let totalPages = Math.ceil(projects.length / perPage);
  let paginationDiv = document.querySelector(".pagination");
  paginationDiv.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    let btn = document.createElement("button");
    btn.innerText = i;
    btn.onclick = () => changePage(i);
    paginationDiv.appendChild(btn);
  }
}

setupPagination();
