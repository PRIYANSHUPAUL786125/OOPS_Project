// script.js – modular, API‑ready, vanilla JS
(function () {
  "use strict";

  // ---------- MOCK DATASET ----------
  const mockStudents = [
    {
      registration_no: "2021CS101",
      wgpa: 7.5,
      performance_variance: 0.18,
      fail_count: 1,
      avg_gp: 7.0,
      last_gp: 7.8,
      gp_trend: 0.8,
      actual_cg: 7.2,
    },
    {
      registration_no: "2021CS102",
      wgpa: 9.1,
      performance_variance: 0.05,
      fail_count: 0,
      avg_gp: 9.0,
      last_gp: 9.3,
      gp_trend: 0.3,
      actual_cg: 9.2,
    },
    {
      registration_no: "2021CS103",
      wgpa: 5.2,
      performance_variance: 0.45,
      fail_count: 3,
      avg_gp: 5.0,
      last_gp: 4.8,
      gp_trend: -0.2,
      actual_cg: 5.0,
    },
    {
      registration_no: "2021CS104",
      wgpa: 8.0,
      performance_variance: 0.1,
      fail_count: 0,
      avg_gp: 8.1,
      last_gp: 8.4,
      gp_trend: 0.5,
      actual_cg: 8.3,
    },
    {
      registration_no: "2021CS105",
      wgpa: 6.8,
      performance_variance: 0.22,
      fail_count: 2,
      avg_gp: 6.5,
      last_gp: 6.9,
      gp_trend: 0.4,
      actual_cg: 6.7,
    },
    {
      registration_no: "2022EC201",
      wgpa: 4.9,
      performance_variance: 0.6,
      fail_count: 4,
      avg_gp: 4.3,
      last_gp: 4.1,
      gp_trend: -0.5,
      actual_cg: 4.2,
    },
    {
      registration_no: "2022EC202",
      wgpa: 8.7,
      performance_variance: 0.09,
      fail_count: 0,
      avg_gp: 8.5,
      last_gp: 8.9,
      gp_trend: 0.6,
      actual_cg: 8.8,
    },
    {
      registration_no: "2023ME301",
      wgpa: 7.1,
      performance_variance: 0.28,
      fail_count: 1,
      avg_gp: 6.9,
      last_gp: 7.3,
      gp_trend: 0.2,
      actual_cg: 7.0,
    },
  ];

  // ---------- STATE ----------
  let currentPage = "dashboard";
  let sidebarCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
  let darkMode = localStorage.getItem("theme") !== "light";
  let filteredStudents = [...mockStudents];
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

  // API simulation
  function fetchStudents() {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockStudents]), 800);
    });
  }

  // Simulated ML prediction
  function predictCGPA(features) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const { wgpa, perfVar, failCount, avgGp, lastGp, gpTrend } = features;
        let base = wgpa * 0.4 + avgGp * 0.3 + lastGp * 0.3;
        let penalty = failCount * 0.4 + perfVar * 2.5;
        let trendBonus = gpTrend * 1.2;
        let predicted = Math.min(10, Math.max(0, base - penalty + trendBonus));
        let confidence = Math.min(98, 75 + (10 - failCount * 3) + gpTrend * 10);
        resolve({
          predicted: +predicted.toFixed(2),
          confidence: Math.round(confidence),
        });
      }, 600);
    });
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

  // ---------- CORE FUNCTIONS ----------
  async function updateMetrics() {
    const grid = document.getElementById("metricsGrid");
    if (!grid) return;
    grid.innerHTML =
      '<div class="skeleton" style="height:120px;grid-column:span 4"></div>'.repeat(
        4,
      );

    const data = await fetchStudents();
    const total = data.length;
    const avgCg = data.reduce((a, b) => a + b.actual_cg, 0) / total;
    const maxCg = Math.max(...data.map((s) => s.actual_cg));
    const failRate = (
      (data.filter((s) => s.fail_count > 0).length / total) *
      100
    ).toFixed(1);

    const metrics = [
      { label: "Total Students", value: total, trend: "↑ 4%", up: true },
      {
        label: "Average CGPA",
        value: avgCg.toFixed(2),
        trend: "↑ 0.2",
        up: true,
      },
      { label: "Highest CGPA", value: maxCg.toFixed(2), trend: "—", up: null },
      {
        label: "Failure Rate",
        value: failRate + "%",
        trend: "↓ 1%",
        up: false,
      },
    ];

    grid.innerHTML = metrics
      .map(
        (m) => `
      <div class="metric-card">
        <div class="metric-label">${m.label}</div>
        <div class="metric-value" data-target="${m.value}">0</div>
        <div class="trend">${m.trend} ${m.up === true ? "📈" : m.up === false ? "📉" : ""}</div>
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
    let filtered = mockStudents.filter((s) =>
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

      mockStudents.forEach((s) => {
        const cg = s.actual_cg;
        if (cg < 5) ranges[0]++;
        else if (cg < 6) ranges[1]++;
        else if (cg < 7) ranges[2]++;
        else if (cg < 8) ranges[3]++;
        else ranges[4]++;
      });

      const maxCount = Math.max(...ranges, 1); // Prevent div by 0
      const barWidth = (width - 100) / 5;

      ctx.clearRect(0, 0, width, height);

      // Draw grid lines
      ctx.strokeStyle = darkMode ? "#334155" : "#e2e8f0";
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 5; i++) {
        const y = 30 + i * 30;
        ctx.beginPath();
        ctx.moveTo(50, y);
        ctx.lineTo(width - 30, y);
        ctx.stroke();
      }

      // Draw bars
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

      const passCount = mockStudents.filter((s) => s.fail_count === 0).length;
      const failCount = mockStudents.length - passCount;
      const total = mockStudents.length;

      ctx.clearRect(0, 0, size, size);

      // Pass segment
      ctx.beginPath();
      ctx.fillStyle = "#22c55e";
      ctx.arc(size / 2, size / 2, 70, 0, (passCount / total) * Math.PI * 2);
      ctx.lineTo(size / 2, size / 2);
      ctx.fill();

      // Fail segment
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

      // Center circle
      ctx.beginPath();
      ctx.fillStyle = darkMode ? "#0f172a" : "#ffffff";
      ctx.arc(size / 2, size / 2, 40, 0, Math.PI * 2);
      ctx.fill();

      // Text
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

      const sortedStudents = [...mockStudents].sort(
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
    const rows = mockStudents.map((s) => [
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

  // Theme and Sidebar Persistence
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

  // Navigation
  navItems.forEach((item) =>
    item.addEventListener("click", (e) => {
      e.preventDefault();
      switchPage(item.dataset.page);
    }),
  );

  // Search and Sort
  let searchTimeout;
  globalSearch?.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) return;
      const found = mockStudents.find((s) =>
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

  // ML Feature Prediction
  const predictFeatureBtn = document.getElementById("predictFeatureBtn");
  if (predictFeatureBtn) {
    predictFeatureBtn.addEventListener("click", async () => {
      const output = document.getElementById("featurePredictionOutput");
      const originalHTML = output.innerHTML;
      output.innerHTML = `
        <div class="skeleton" style="height: 40px; margin-bottom: 10px;"></div>
        <div class="skeleton" style="height: 6px; border-radius: 10px;"></div>
        <div class="skeleton" style="height: 20px; margin-top: 5px; width: 60%;"></div>
      `;

      const features = {
        wgpa: parseFloat(document.getElementById("wgpa")?.value) || 0,
        perfVar: parseFloat(document.getElementById("perfVar")?.value) || 0,
        failCount: parseInt(document.getElementById("failCount")?.value) || 0,
        avgGp: parseFloat(document.getElementById("avgGp")?.value) || 0,
        lastGp: parseFloat(document.getElementById("lastGp")?.value) || 0,
        gpTrend: parseFloat(document.getElementById("gpTrend")?.value) || 0,
      };

      try {
        const result = await predictCGPA(features);
        output.innerHTML = `
          <div class="predicted-value">${result.predicted}</div>
          <div class="confidence-bar"><span style="width: ${result.confidence}%"></span></div>
          <div class="confidence-text">Confidence ${result.confidence}%</div>
        `;
        showToast(`Prediction complete: CGPA ${result.predicted}`, "success");
      } catch (error) {
        output.innerHTML = originalHTML;
        showToast("Prediction failed. Please try again.", "error");
      }
    });
  }

  // SGPA Generator and Prediction
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
      showToast(`Generated ${count} semester inputs`, "info");
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

      setTimeout(() => {
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        const trend =
          values.length > 1 ? values[values.length - 1] - values[0] : 0;
        const predicted = Math.min(10, Math.max(0, avg + trend * 1.2));
        const confidence = Math.min(
          95,
          70 + values.length * 3 + (trend > 0 ? 10 : 0),
        );

        output.innerHTML = `
          <div class="predicted-value">${predicted.toFixed(2)}</div>
          <div class="confidence-bar"><span style="width: ${confidence}%"></span></div>
          <div class="confidence-text">Confidence ${Math.round(confidence)}%</div>
        `;
        showToast(`SGPA Prediction: ${predicted.toFixed(2)} CGPA`, "success");
      }, 800);
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

  // Export Button UI Injection
  const toolbar = document.querySelector(".table-toolbar");
  if (toolbar && !toolbar.querySelector(".export-btn")) {
    const exportBtn = document.createElement("button");
    exportBtn.className = "btn-outline ripple export-btn";
    exportBtn.style.marginLeft = "auto";
    exportBtn.innerHTML = "📥 Export CSV";
    exportBtn.addEventListener("click", exportToCSV);
    toolbar.appendChild(exportBtn);
  }

  // Window Resize (Charts)
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (currentPage === "analytics") drawCharts();
    }, 200);
  });

  // Ripple Effect
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

  // Initialize
  function initialize() {
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
    showToast("Dashboard ready • Student Analytics", "success");
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && currentPage === "dashboard") updateMetrics();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }

  window.studentAnalytics = {
    refreshData: updateMetrics,
    exportCSV: exportToCSV,
    switchPage: switchPage,
  };
})();
