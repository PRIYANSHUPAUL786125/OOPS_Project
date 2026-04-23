(function () {
  "use strict";

  let currentPage = "dashboard";
  let sidebarCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
  let darkMode = localStorage.getItem("theme") !== "light";

  let allStudents = [];
  let filteredStudents = [];
  let currentPageTable = 1;
  const rowsPerPage = 5;

  // ---------- DOM ELEMENTS ----------
  const body = document.body;
  const sidebar = document.getElementById("sidebar");
  const pages = document.querySelectorAll(".page");
  const navItems = document.querySelectorAll(".nav-item");
  const collapseBtn = document.getElementById("collapseSidebarBtn");
  const themeToggles = [
    document.getElementById("themeToggleMain"),
    document.getElementById("themeToggleSidebar"),
  ];
  const globalSearch = document.getElementById("globalSearch");
  const tableBody = document.getElementById("tableBody");
  const paginationDiv = document.getElementById("pagination");
  const tableSearch = document.getElementById("tableSearch");
  const sortSelect = document.getElementById("sortSelect");

  // ---------- HELPERS ----------
  function showToast(message, type = "info") {
    const container =
      document.getElementById("toastContainer") ||
      (() => {
        let d = document.createElement("div");
        d.id = "toastContainer";
        d.className = "toast-container";
        document.body.appendChild(d);
        return d;
      })();
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function animateCounter(el, start, end, duration) {
    let startTime;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      el.textContent = (progress * end).toFixed(end % 1 ? 2 : 0);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ---------- API INTEGRATION ----------

  // Fetch actual data from Crow backend
  async function fetchUsersAPI() {
    try {
      const res = await fetch("http://localhost:18080/users");
      if (!res.ok) throw new Error("Network response was not ok");

      const json = await res.json();
      if (json.success && json.data && json.data.users) {
        allStudents = json.data.users;
        filteredStudents = [...allStudents];
        return true;
      }
    } catch (error) {
      console.error("API Error:", error);
      showToast("Failed to fetch live data from backend", "error");
    }
    return false;
  }

  // ---------- CORE FUNCTIONS ----------
  function updateMetrics() {
    const grid = document.getElementById("metricsGrid");
    if (!grid) return;

    if (allStudents.length === 0) {
      grid.innerHTML =
        '<div class="skeleton" style="height:120px;grid-column:span 4"></div>'.repeat(
          4,
        );
      return;
    }

    const total = allStudents.length;
    const avgCg = allStudents.reduce((a, b) => a + b.actual_cg, 0) / total || 0;
    const maxCg = Math.max(...allStudents.map((s) => s.actual_cg), 0);
    const failRate = (
      (allStudents.filter((s) => s.fail_count > 0).length / total) *
      100
    ).toFixed(1);

    const metrics = [
      { label: "Total Students", value: total, trend: "Live", up: null },
      {
        label: "Average CGPA",
        value: avgCg.toFixed(2),
        trend: "Live",
        up: null,
      },
      {
        label: "Highest CGPA",
        value: maxCg.toFixed(2),
        trend: "Live",
        up: null,
      },
      { label: "Failure Rate", value: failRate + "%", trend: "Live", up: null },
    ];

    grid.innerHTML = metrics
      .map(
        (m) => `
      <div class="metric-card">
        <div class="metric-label">${m.label}</div>
        <div class="metric-value" data-target="${m.value}">0</div>
        <div class="trend">${m.trend}</div>
      </div>
    `,
      )
      .join("");

    document.querySelectorAll(".metric-value").forEach((el) => {
      const target = parseFloat(el.dataset.target) || 0;
      animateCounter(el, 0, target, 800);
    });
  }

  function renderTable() {
    if (!tableBody) return;
    const searchTerm = (tableSearch?.value || "").toLowerCase();

    let filtered = allStudents.filter((s) =>
      s.registration_no.toLowerCase().includes(searchTerm),
    );

    const sort = sortSelect?.value || "cgpa_desc";
    if (sort.includes("cgpa")) {
      filtered.sort((a, b) =>
        sort.includes("desc")
          ? b.actual_cg - a.actual_cg
          : a.actual_cg - b.actual_cg,
      );
    } else if (sort.includes("wgpa")) {
      filtered.sort((a, b) =>
        sort.includes("desc") ? b.wgpa - a.wgpa : a.wgpa - b.wgpa,
      );
    }

    filteredStudents = filtered;
    const start = (currentPageTable - 1) * rowsPerPage;
    const paginated = filtered.slice(start, start + rowsPerPage);

    tableBody.innerHTML = paginated
      .map((s) => {
        const cgClass =
          s.actual_cg < 6 ? "cgpa-low" : s.actual_cg > 8 ? "cgpa-high" : "";
        return `<tr class="${cgClass}"><td>${s.registration_no}</td><td>${s.wgpa}</td><td>${s.performance_variance}</td><td>${s.fail_count}</td><td>${s.avg_gp}</td><td>${s.last_gp}</td><td>${s.gp_trend}</td><td>${s.actual_cg}</td></tr>`;
      })
      .join("");

    renderPagination(filtered.length);
  }

  function renderPagination(total) {
    if (!paginationDiv) return;
    const pages = Math.ceil(total / rowsPerPage);
    paginationDiv.innerHTML = Array.from(
      { length: pages },
      (_, i) =>
        `<button class="page-btn ${i + 1 === currentPageTable ? "active" : ""}" data-page="${i + 1}">${i + 1}</button>`,
    ).join("");

    document.querySelectorAll(".page-btn").forEach((b) =>
      b.addEventListener("click", (e) => {
        currentPageTable = +e.target.dataset.page;
        renderTable();
      }),
    );
  }

  function drawCharts() {
    if (allStudents.length === 0) return;

    // 1. CGPA Distribution Bar Chart
    const barCanvas = document.getElementById("cgpaBarChart");
    if (barCanvas) {
      const ctx = barCanvas.getContext("2d");
      const container = barCanvas.parentElement;
      const width = container.clientWidth - 40;
      const height = 200;

      barCanvas.width = width;
      barCanvas.height = height;

      const ranges = [0, 0, 0, 0, 0]; // <5, 5-6, 6-7, 7-8, 8+
      const labels = ["<5", "5-6", "6-7", "7-8", "8+"];

      allStudents.forEach((s) => {
        const cg = s.actual_cg;
        if (cg < 5) ranges[0]++;
        else if (cg < 6) ranges[1]++;
        else if (cg < 7) ranges[2]++;
        else if (cg < 8) ranges[3]++;
        else ranges[4]++;
      });

      const maxCount = Math.max(...ranges, 1);
      const barWidth = (width - 100) / 5;

      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = darkMode ? "#334155" : "#e2e8f0";
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 5; i++) {
        const y = 30 + i * 30;
        ctx.beginPath();
        ctx.moveTo(50, y);
        ctx.lineTo(width - 30, y);
        ctx.stroke();
      }

      ranges.forEach((count, i) => {
        const barHeight = (count / maxCount) * 140;
        const x = 60 + i * barWidth;
        const y = height - 30 - barHeight;

        const gradient = ctx.createLinearGradient(x, y, x, height - 30);
        gradient.addColorStop(0, "#4f46e5");
        gradient.addColorStop(1, "#7c3aed");

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - 10, barHeight);

        ctx.fillStyle = darkMode ? "#f1f5f9" : "#0f172a";
        ctx.font = "12px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(labels[i], x + (barWidth - 10) / 2, height - 10);
        ctx.fillText(count, x + (barWidth - 10) / 2, y - 5);
      });
    }

    // 2. Pass/Fail Donut Chart
    const donutCanvas = document.getElementById("passFailDonut");
    if (donutCanvas) {
      const ctx = donutCanvas.getContext("2d");
      const size = 200;
      donutCanvas.width = size;
      donutCanvas.height = size;

      const passCount = allStudents.filter((s) => s.fail_count === 0).length;
      const failCount = allStudents.length - passCount;
      const total = allStudents.length;

      ctx.clearRect(0, 0, size, size);

      ctx.beginPath();
      ctx.fillStyle = "#22c55e";
      ctx.arc(size / 2, size / 2, 70, 0, (passCount / total) * Math.PI * 2);
      ctx.lineTo(size / 2, size / 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = "#ef4444";
      ctx.arc(
        size / 2,
        size / 2,
        70,
        (passCount / total) * Math.PI * 2,
        Math.PI * 2,
      );
      ctx.lineTo(size / 2, size / 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = darkMode ? "#0f172a" : "#ffffff";
      ctx.arc(size / 2, size / 2, 40, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = darkMode ? "#f1f5f9" : "#0f172a";
      ctx.font = "bold 14px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${passCount} Pass`, size / 2, size / 2 - 5);
      ctx.fillText(`${failCount} Fail`, size / 2, size / 2 + 15);
    }

    // 3. Trend line chart
    const lineCanvas = document.getElementById("trendLineCanvas");
    if (lineCanvas) {
      const ctx = lineCanvas.getContext("2d");
      const width = lineCanvas.parentElement.clientWidth - 40;
      const height = 150;

      lineCanvas.width = width;
      lineCanvas.height = height;

      const sortedStudents = [...allStudents].sort(
        (a, b) => a.actual_cg - b.actual_cg,
      );
      const points = sortedStudents.map((s, i) => ({
        x: 50 + (i / Math.max(sortedStudents.length - 1, 1)) * (width - 100),
        y: height - 30 - (s.actual_cg / 10) * 120,
      }));

      ctx.clearRect(0, 0, width, height);

      ctx.beginPath();
      ctx.strokeStyle = "#4f46e5";
      ctx.lineWidth = 3;
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      points.forEach((p) => {
        ctx.beginPath();
        ctx.fillStyle = "#818cf8";
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  function switchPage(pageId) {
    pages.forEach((p) => p.classList.remove("active"));
    document.getElementById(`page-${pageId}`)?.classList.add("active");
    navItems.forEach((n) => {
      n.classList.toggle("active", n.dataset.page === pageId);
    });
    currentPage = pageId;

    // Refresh components
    if (pageId === "dashboard") updateMetrics();
    if (pageId === "students") renderTable();
    if (pageId === "analytics") setTimeout(drawCharts, 50);
  }

  function exportToCSV() {
    const headers = [
      "Registration No",
      "WGPA",
      "Perf Variance",
      "Fail Count",
      "Avg GP",
      "Last GP",
      "GP Trend",
      "Actual CG",
    ];
    const rows = allStudents.map((s) => [
      s.registration_no,
      s.wgpa,
      s.performance_variance,
      s.fail_count,
      s.avg_gp,
      s.last_gp,
      s.gp_trend,
      s.actual_cg,
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `student_data_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showToast("CSV exported successfully", "success");
  }

  // ---------- INITIALIZATION & EVENT LISTENERS ----------
  if (sidebarCollapsed && sidebar) sidebar.classList.add("collapsed");
  if (!darkMode) body.classList.add("light-mode");

  collapseBtn?.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    sidebarCollapsed = sidebar.classList.contains("collapsed");
    localStorage.setItem("sidebarCollapsed", sidebarCollapsed);
  });

  themeToggles.forEach((btn) =>
    btn?.addEventListener("click", () => {
      darkMode = !darkMode;
      body.classList.toggle("light-mode", !darkMode);
      localStorage.setItem("theme", darkMode ? "dark" : "light");
      if (currentPage === "analytics") setTimeout(drawCharts, 50);
    }),
  );

  navItems.forEach((item) =>
    item.addEventListener("click", (e) => {
      e.preventDefault();
      switchPage(item.dataset.page);
    }),
  );

  let searchTimeout;
  globalSearch?.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) return;
      const found = allStudents.find((s) =>
        s.registration_no.toLowerCase().includes(query),
      );
      if (found) {
        showToast(
          `Found: ${found.registration_no} | CGPA: ${found.actual_cg}`,
          "success",
        );
        if (currentPage === "students" && tableSearch) {
          tableSearch.value = query;
          renderTable();
        }
      } else {
        showToast("No student found with that registration number", "error");
      }
    }, 300);
  });

  tableSearch?.addEventListener("input", renderTable);
  sortSelect?.addEventListener("change", renderTable);

  const predictFeatureBtn = document.getElementById("predictFeatureBtn");
  if (predictFeatureBtn) {
    predictFeatureBtn.addEventListener("click", () => {
      showToast(
        "Backend requires SGPA sequence. Please use the SGPA predictor.",
        "error",
      );
    });
  }

  // --- Live SGPA Generator and Prediction via Backend API ---
  const generateBtn = document.getElementById("generateSemBtn");
  if (generateBtn) {
    generateBtn.addEventListener("click", () => {
      const semCountInput = document.getElementById("semCount");
      let count = parseInt(semCountInput.value);
      if (count < 1) count = 1;
      if (count > 8) count = 8;
      semCountInput.value = count;

      const container = document.getElementById("sgpaInputsContainer");
      container.innerHTML = Array.from(
        { length: count },
        (_, i) => `
        <div class="input-group floating">
          <input type="number" step="0.01" min="0" max="10" class="sgpa-input" placeholder=" " value="8.0" id="sgpa${i}">
          <label>Semester ${i + 1} SGPA</label>
        </div>
      `,
      ).join("");

      container.style.opacity = "0";
      setTimeout(() => (container.style.opacity = "1"), 10);
    });
    setTimeout(() => generateBtn.click(), 100);
  }

  document.addEventListener("input", (e) => {
    if (e.target.classList.contains("sgpa-input")) {
      const inputs = document.querySelectorAll(".sgpa-input");
      const values = Array.from(inputs).map((input) => {
        let val = parseFloat(input.value) || 0;
        if (val < 0) val = 0;
        if (val > 10) val = 10;
        input.value = val;
        return val;
      });

      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const trend =
        values.length > 1 ? values[values.length - 1] - values[0] : 0;
      const avgDisplay = document.getElementById("avgSgpaDisplay");
      const trendDisplay = document.getElementById("sgpaTrendDisplay");

      if (avgDisplay) avgDisplay.textContent = avg.toFixed(2);
      if (trendDisplay) {
        if (trend > 0.1) trendDisplay.innerHTML = "📈 Increasing";
        else if (trend < -0.1) trendDisplay.innerHTML = "📉 Decreasing";
        else trendDisplay.innerHTML = "➡️ Stable";
      }
    }
  });

  const predictSgpaBtn = document.getElementById("predictSgpaBtn");
  if (predictSgpaBtn) {
    predictSgpaBtn.addEventListener("click", async () => {
      const inputs = document.querySelectorAll(".sgpa-input");
      const values = Array.from(inputs).map(
        (input) => parseFloat(input.value) || 0,
      );

      if (values.length === 0)
        return showToast("Please generate semester inputs first", "error");

      const output = document.getElementById("sgpaPredictionOutput");
      output.innerHTML = `
        <div class="skeleton" style="height: 40px; margin-bottom: 10px;"></div>
        <div class="skeleton" style="height: 6px; border-radius: 10px;"></div>
      `;

      try {
        // --- THIS WAS THE FIX: Updated to absolute URL ---
        const res = await fetch("http://localhost:18080/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sems: values }),
        });

        if (!res.ok) throw new Error("API responded with an error");

        const json = await res.json();

        if (json.success && json.data) {
          const predicted = json.data.predicted_cg_lr;
          const confidence = json.data.data_confidence;
          const category = json.data.lr_category;

          output.innerHTML = `
            <div class="predicted-value">${predicted.toFixed(2)}</div>
            <div class="confidence-bar"><span style="width: ${confidence}%"></span></div>
            <div class="confidence-text">Confidence ${Math.round(confidence)}% • ${category}</div>
          `;
          showToast(
            `Backend ML Prediction: ${predicted.toFixed(2)} CGPA`,
            "success",
          );
        } else {
          throw new Error("Invalid format returned from API");
        }
      } catch (err) {
        output.innerHTML = `<div class="predicted-value text-red">Error</div>`;
        showToast("Prediction failed. Check backend connection.", "error");
        console.error(err);
      }
    });
  }

  // Keyboard Navigation
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      globalSearch?.focus();
    }
    if (e.key === "Escape" && document.activeElement === globalSearch) {
      globalSearch.value = "";
      globalSearch.blur();
    }
    if (currentPage === "students") {
      if (e.key === "ArrowLeft" && currentPageTable > 1) {
        currentPageTable--;
        renderTable();
        showToast(`Page ${currentPageTable}`, "info");
      }
      if (e.key === "ArrowRight") {
        const maxPage = Math.ceil(filteredStudents.length / rowsPerPage);
        if (currentPageTable < maxPage) {
          currentPageTable++;
          renderTable();
          showToast(`Page ${currentPageTable}`, "info");
        }
      }
    }
  });

  const toolbar = document.querySelector(".table-toolbar");
  if (toolbar && !toolbar.querySelector(".export-btn")) {
    const exportBtn = document.createElement("button");
    exportBtn.className = "btn-outline ripple export-btn";
    exportBtn.style.marginLeft = "auto";
    exportBtn.innerHTML = "📥 Export CSV";
    exportBtn.addEventListener("click", exportToCSV);
    toolbar.appendChild(exportBtn);
  }

  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (currentPage === "analytics") drawCharts();
    }, 200);
  });

  document.addEventListener("click", (e) => {
    const rippleElement = e.target.closest(".ripple");
    if (rippleElement) {
      const ripple = document.createElement("span");
      ripple.className = "ripple-effect";
      const rect = rippleElement.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.cssText = `width: ${size}px; height: ${size}px; left: ${x}px; top: ${y}px; position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.3); transform: scale(0); animation: ripple-animation 0.6s ease-out;`;

      const existingRipple = rippleElement.querySelector(".ripple-effect");
      if (existingRipple) existingRipple.remove();

      rippleElement.style.position = "relative";
      rippleElement.style.overflow = "hidden";
      rippleElement.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    }
  });

  const style = document.createElement("style");
  style.textContent = `@keyframes ripple-animation { to { transform: scale(4); opacity: 0; } }`;
  document.head.appendChild(style);

  // --- Bootstrap Initialization ---
  async function initialize() {
    // 1. Fetch data from backend first
    const success = await fetchUsersAPI();

    // 2. Initialize UI
    updateMetrics();
    renderTable();

    const hash = window.location.hash.slice(1);
    if (
      hash &&
      ["dashboard", "students", "prediction", "analytics"].includes(hash)
    ) {
      switchPage(hash);
    } else {
      switchPage("dashboard");
    }

    setTimeout(drawCharts, 100);

    if (success) {
      showToast("Live Dashboard Ready • Connected to API", "success");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }

  window.studentAnalytics = {
    refreshData: async () => {
      await fetchUsersAPI();
      updateMetrics();
      renderTable();
      if (currentPage === "analytics") drawCharts();
    },
    exportCSV: exportToCSV,
    switchPage: switchPage,
  };
})();
