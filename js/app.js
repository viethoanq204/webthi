(() => {
  "use strict";

  const config = window.CA4_CONFIG;
  const sb = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  const app = document.getElementById("app");
  const modalRoot = document.getElementById("modal-root");
  const toastRoot = document.getElementById("toast-root");

  const state = {
    session: null,
    profile: null,
    folders: [],
    exams: [],
    adminUsers: [],
    activeExam: null,
    activeAttempt: null,
    answers: {},
    flags: new Set(),
    currentQuestion: 1,
    result: null,
    timerId: null,
    autosaveId: null,
    guardActive: false,
    guardBusy: false,
    ignoreGuardUntil: 0,
    pendingRoute: null,
  };

  const icons = {
    menu: '<svg class="icon" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    home: '<svg class="icon" viewBox="0 0 24 24"><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
    file: '<svg class="icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></svg>',
    users: '<svg class="icon" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    folder: '<svg class="icon" viewBox="0 0 24 24"><path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    rules: '<svg class="icon" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path d="M8 7h8M8 11h8"/></svg>',
    logout: '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M10 17l5-5-5-5M15 12H3M15 3h5a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-5"/></svg>',
    plus: '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    search: '<svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
    clock: '<svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    repeat: '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/></svg>',
    edit: '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></svg>',
    trash: '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></svg>',
    share: '<svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></svg>',
    upload: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></svg>',
    close: '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    alert: '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M10.3 3.8 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/></svg>',
    check: '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
    download: '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
    chevronLeft: '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>',
    chevronRight: '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
    flag: '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M5 22V4M5 4h11l-1 4 1 4H5"/></svg>',
    eye: '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/></svg>',
    key: '<svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="8" cy="15" r="5"/><path d="m12 11 8-8M16 7l3 3M14 9l3 3"/></svg>',
  };

  function esc(value = "") {
    return String(value).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
  }

  function toast(message, type = "") {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    toastRoot.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  function openModal(title, content, { large = false } = {}) {
    modalRoot.innerHTML = `<div class="modal-backdrop" data-close-modal>
      <section class="modal ${large ? "modal-lg" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header class="modal-head"><h2 id="modal-title">${esc(title)}</h2><button class="close-btn" data-close-modal aria-label="Đóng">${icons.close}</button></header>
        <div class="modal-body">${content}</div>
      </section>
    </div>`;
    modalRoot.querySelector(".modal").addEventListener("click", (e) => e.stopPropagation());
    modalRoot.querySelectorAll("[data-close-modal]").forEach((el) => el.addEventListener("click", () => closeModal()));
  }

  function closeModal() { modalRoot.innerHTML = ""; }

  async function api(action, payload = {}) {
    const { data, error } = await sb.functions.invoke(config.functionName, { body: { action, ...payload } });
    if (error) {
      let serverMessage = data?.error || "";
      if (!serverMessage && error.context instanceof Response) {
        try { serverMessage = (await error.context.clone().json())?.error || ""; } catch { /* Phản hồi không phải JSON. */ }
      }
      throw new Error(serverMessage || error.message || "Không thể kết nối máy chủ.");
    }
    if (!data?.ok) throw new Error(data?.error || "Yêu cầu không thành công.");
    return data.data;
  }

  function initials(name) {
    return String(name || "U").trim().split(/\s+/).slice(-2).map((x) => x[0]).join("").toUpperCase();
  }

  function route() {
    const raw = location.hash.replace(/^#\/?/, "");
    const parts = raw.split("/").filter(Boolean);
    return { name: parts[0] || "home", id: parts[1] || null };
  }

  function go(path) { location.hash = `#/${path.replace(/^\//, "")}`; }

  function formatDate(value) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
  }

  function roleLabel(role) { return role === "admin" ? "Quản trị viên" : "Học viên"; }

  async function loadProfile() {
    const { data, error } = await sb.from("profiles").select("id,email,display_name,role,active,is_root").eq("id", state.session.user.id).single();
    if (error) throw new Error("Không tìm thấy hồ sơ tài khoản. Hãy hoàn tất thiết lập Supabase.");
    if (!data.active) {
      await sb.auth.signOut();
      throw new Error("Tài khoản đã bị khóa.");
    }
    state.profile = data;
  }

  async function initialize() {
    const { data } = await sb.auth.getSession();
    state.session = data.session;
    if (state.session) {
      try { await loadProfile(); } catch (error) { toast(error.message, "error"); state.session = null; }
    }
    window.addEventListener("hashchange", renderRoute);
    sb.auth.onAuthStateChange((_event, session) => { state.session = session; });
    renderRoute();
  }

  function renderLogin() {
    const current = route();
    if (current.name === "exam" && current.id) state.pendingRoute = `exam/${current.id}`;
    document.body.className = "";
    app.innerHTML = `<main class="login-page">
      <section class="login-panel"><div class="login-card">
        <div class="login-identity"><img src="assets/brand-mark.svg" alt="Biểu trưng CA4 Exam"><div><strong>CA4 Exam</strong><span>Hệ thống ôn thi Văn bằng 2 Công an</span></div></div>
        <h2>Đăng nhập</h2><p>Sử dụng tài khoản được quản trị viên cấp để tiếp tục.</p>
        <form class="login-form" id="login-form">
          <div class="field"><label for="login-email">Tài khoản</label><input class="input" id="login-email" type="email" autocomplete="username" placeholder="Nhập tên tài khoản" required></div>
          <div class="field"><label for="login-password">Mật khẩu</label><div class="password-wrap"><input class="input" id="login-password" type="password" autocomplete="current-password" placeholder="Nhập mật khẩu" required><button class="password-toggle" type="button" id="toggle-password" aria-label="Hiện mật khẩu">${icons.eye}</button></div></div>
          <button class="btn btn-primary login-submit" type="submit">Đăng nhập</button>
        </form>
        <div class="login-note">${icons.alert}<span>Hệ thống không hỗ trợ đăng ký công khai. Liên hệ quản trị viên nếu bạn chưa có tài khoản.</span></div>
      </div></section>
    </main>`;
    document.getElementById("toggle-password").addEventListener("click", () => {
      const input = document.getElementById("login-password");
      input.type = input.type === "password" ? "text" : "password";
    });
    document.getElementById("login-form").addEventListener("submit", handleLogin);
  }

  async function handleLogin(event) {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true; button.textContent = "Đang đăng nhập…";
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      toast("Tài khoản hoặc mật khẩu không đúng.", "error");
      button.disabled = false; button.textContent = "Đăng nhập";
      return;
    }
    state.session = data.session;
    try {
      await loadProfile();
      const destination = state.pendingRoute || "home";
      state.pendingRoute = null;
      go(destination);
      renderRoute();
    } catch (err) {
      toast(err.message, "error");
      await sb.auth.signOut();
      button.disabled = false; button.textContent = "Đăng nhập";
    }
  }

  async function logout() {
    cleanupExam();
    await sb.auth.signOut();
    state.session = null; state.profile = null;
    location.hash = "";
    renderLogin();
  }

  function shell(pageTitle, content, active = "home") {
    const isAdmin = state.profile.role === "admin";
    const nav = [
      ["home", "Bài kiểm tra", icons.home],
      ...(isAdmin ? [
        ["admin-exams", "Quản lý bài kiểm tra", icons.file],
        ["admin-folders", "Quản lý thư mục", icons.folder],
        ["admin-users", "Quản lý tài khoản", icons.users],
        ["format", "Quy định file đề", icons.rules],
      ] : []),
    ];
    document.body.className = "";
    app.innerHTML = `<div class="app-shell">
      <div class="sidebar-scrim hidden" id="sidebar-scrim"></div>
      <aside class="sidebar" id="sidebar">
        <div class="brand-lockup"><img src="assets/brand-mark.svg" alt=""><div><strong>CA4 Exam</strong><span>${isAdmin ? "Khu vực quản trị" : "Không gian luyện thi"}</span></div></div>
        <nav class="nav">${nav.map(([key,label,icon]) => `<a class="nav-link ${active === key ? "active" : ""}" href="#/${key}">${icon}<span>${label}</span></a>`).join("")}</nav>
        <div class="sidebar-user"><div class="avatar">${esc(initials(state.profile.display_name))}</div><div><strong>${esc(state.profile.display_name)}</strong><span>${roleLabel(state.profile.role)}</span></div><button class="logout-btn" data-logout aria-label="Đăng xuất">${icons.logout}</button></div>
      </aside>
      <main class="main"><header class="topbar"><div class="topbar-title"><button class="icon-btn mobile-menu" id="mobile-menu" aria-label="Mở menu">${icons.menu}</button><h1>${esc(pageTitle)}</h1></div><div class="topbar-actions"><span class="status status-published"><span class="desktop-label">Đã kết nối</span></span></div></header><div class="content">${content}</div></main>
    </div>`;
    document.querySelectorAll("[data-logout]").forEach((el) => el.addEventListener("click", logout));
    const menu = document.getElementById("mobile-menu");
    const sidebar = document.getElementById("sidebar");
    const scrim = document.getElementById("sidebar-scrim");
    if (menu) menu.addEventListener("click", () => { sidebar.classList.add("open"); scrim.classList.remove("hidden"); });
    if (scrim) scrim.addEventListener("click", () => { sidebar.classList.remove("open"); scrim.classList.add("hidden"); });
  }

  async function renderRoute() {
    const current = route();
    if (state.guardActive && current.name !== "exam") {
      const code = state.activeExam?.share_code;
      if (code) history.replaceState(null, "", `#/exam/${code}`);
      registerViolation("Bạn vừa cố rời khỏi màn hình làm bài.");
      return;
    }
    cleanupPageOnly();
    if (!state.session) return renderLogin();
    if (!state.profile) {
      try { await loadProfile(); } catch (error) { toast(error.message, "error"); return renderLogin(); }
    }
    if (current.name.startsWith("admin") && state.profile.role !== "admin") return go("home");
    try {
      if (current.name === "exam" && current.id) return renderExamEntry(current.id);
      if (current.name === "admin-exams") return renderAdminExams();
      if (current.name === "admin-folders") return renderAdminFolders();
      if (current.name === "admin-users") return renderAdminUsers();
      if (current.name === "format") return renderFormatGuide();
      return renderDashboard();
    } catch (error) {
      toast(error.message || "Không thể tải dữ liệu.", "error");
    }
  }

  function cleanupPageOnly() {
    closeModal();
    document.removeEventListener("keydown", examKeyGuard);
  }

  async function loadCatalog(admin = false) {
    if (admin) {
      const data = await api("admin-list-catalog");
      state.folders = data.folders || [];
      state.exams = data.exams || [];
      state.adminUsers = data.students || [];
      return;
    }
    const [{ data: folders, error: folderError }, { data: exams, error: examError }] = await Promise.all([
      sb.from("folders").select("id,name,sort_order").order("sort_order").order("name"),
      sb.from("exam_catalog").select("*").order("created_at", { ascending: false }),
    ]);
    if (folderError || examError) throw new Error("Không thể tải danh sách bài kiểm tra.");
    state.folders = folders || [];
    state.exams = exams || [];
  }

  function examStatus(status, assignedCount = 0, admin = false) {
    if (status === "assigned") {
      return {
        className: "status-assigned",
        label: admin ? `Đã giao · ${assignedCount} học viên` : "Được giao",
      };
    }
    if (status === "published") return { className: "status-published", label: "Công bố" };
    return { className: "status-draft", label: "Bản nháp" };
  }

  function examCard(exam, admin = false) {
    const remaining = exam.max_attempts === 0 ? "Không giới hạn" : `${Math.max(0, exam.max_attempts - Number(exam.used_attempts || 0))} lượt còn lại`;
    const status = examStatus(exam.status, Number(exam.assigned_count || exam.assigned_user_ids?.length || 0), admin);
    return `<article class="exam-card" data-title="${esc((exam.title || "").toLowerCase())}" data-status="${esc(exam.status)}">
      <div class="exam-card-top"><div class="exam-number">CA4</div><span class="status ${status.className}">${esc(status.label)}</span></div>
      <h3>${esc(exam.title)}</h3><p>${esc(exam.description || "Bài kiểm tra theo cấu trúc CA4 gồm 60 câu.")}</p>
      <div class="exam-meta"><span>${icons.clock}${exam.duration_minutes} phút</span><span>${icons.repeat}${remaining}</span><span>${icons.file}60 câu</span></div>
      <div class="exam-card-actions">
        ${admin ? `<button class="btn btn-secondary btn-small" data-edit-exam="${exam.id}">${icons.edit}Sửa</button><button class="btn btn-secondary btn-small" data-share="${exam.share_code}">${icons.share}</button><button class="btn btn-danger btn-small" data-delete-exam="${exam.id}">${icons.trash}</button>` : `<a class="btn btn-primary btn-small" href="#/exam/${exam.share_code}">Làm bài</a><button class="btn btn-secondary btn-small" data-share="${exam.share_code}">${icons.share}Chia sẻ</button>`}
      </div>
    </article>`;
  }

  function catalogSections(exams, admin = false) {
    if (!exams.length) return `<div class="empty"><div class="empty-icon">${icons.file}</div><h3>Chưa có bài kiểm tra</h3><p>${admin ? "Tải file đề đúng định dạng để tạo bài kiểm tra đầu tiên." : "Chưa có bài công khai hoặc bài được giao cho bạn."}</p></div>`;
    const folderMap = new Map(state.folders.map((folder) => [folder.id, folder.name]));
    const groups = new Map();
    exams.forEach((exam) => {
      const key = exam.folder_id || "none";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(exam);
    });
    return [...groups.entries()].map(([folderId, items]) => `<section class="folder-section"><h3 class="folder-title">${icons.folder}${esc(folderMap.get(folderId) || "Chưa phân loại")} <span>${items.length} bài</span></h3><div class="exam-grid">${items.map((exam) => examCard(exam, admin)).join("")}</div></section>`).join("");
  }

  async function renderDashboard() {
    shell("Bài kiểm tra", `<div class="page-heading"><div><h2>Chào ${esc(state.profile.display_name)}</h2><p>Chọn bài kiểm tra và bắt đầu khi bạn đã sẵn sàng.</p></div></div><div id="catalog-loading" class="empty"><div class="empty-icon">${icons.clock}</div><h3>Đang tải bài kiểm tra</h3></div>`, "home");
    await loadCatalog(false);
    const available = state.exams;
    const assigned = available.filter((x) => x.status === "assigned").length;
    const limited = available.filter((x) => x.max_attempts > 0).length;
    document.querySelector(".content").innerHTML = `<div class="page-heading"><div><h2>Chào ${esc(state.profile.display_name)}</h2><p>Chọn bài kiểm tra và bắt đầu khi bạn đã sẵn sàng.</p></div></div>
      <div class="stats"><div class="stat-card"><span>Bài có thể làm</span><strong>${available.length}</strong><div class="stat-line"></div></div><div class="stat-card"><span>Bài được giao riêng</span><strong>${assigned}</strong><div class="stat-line"></div></div><div class="stat-card"><span>Bài giới hạn lượt</span><strong>${limited}</strong><div class="stat-line"></div></div></div>
      <div class="toolbar"><div class="search">${icons.search}<input class="input" id="catalog-search" placeholder="Tìm bài kiểm tra"></div><select class="select filter-select" id="folder-filter"><option value="">Tất cả thư mục</option>${state.folders.map((f) => `<option value="${f.id}">${esc(f.name)}</option>`).join("")}</select></div>
      <div id="catalog">${catalogSections(available)}</div>`;
    bindCatalogControls(false);
  }

  function bindCatalogControls(admin) {
    const search = document.getElementById("catalog-search");
    const folder = document.getElementById("folder-filter");
    const apply = () => {
      const query = (search?.value || "").trim().toLowerCase();
      const folderId = folder?.value || "";
      const filtered = state.exams.filter((x) => (!query || x.title.toLowerCase().includes(query)) && (!folderId || x.folder_id === folderId));
      document.getElementById("catalog").innerHTML = catalogSections(filtered, admin);
      bindCardActions(admin);
    };
    search?.addEventListener("input", apply);
    folder?.addEventListener("change", apply);
    bindCardActions(admin);
  }

  function bindCardActions(admin) {
    document.querySelectorAll("[data-share]").forEach((button) => button.addEventListener("click", () => shareExam(button.dataset.share)));
    if (!admin) return;
    document.querySelectorAll("[data-edit-exam]").forEach((button) => button.addEventListener("click", () => openEditExam(button.dataset.editExam)));
    document.querySelectorAll("[data-delete-exam]").forEach((button) => button.addEventListener("click", () => confirmDeleteExam(button.dataset.deleteExam)));
  }

  async function shareExam(code) {
    const url = `${location.origin}${location.pathname}#/exam/${code}`;
    try { await navigator.clipboard.writeText(url); toast("Đã sao chép link bài kiểm tra.", "success"); }
    catch { openModal("Link bài kiểm tra", `<div class="field"><label>Đường dẫn</label><input class="input" value="${esc(url)}" readonly></div>`); }
  }

  async function renderAdminExams() {
    shell("Quản lý bài kiểm tra", `<div class="empty"><div class="empty-icon">${icons.clock}</div><h3>Đang tải dữ liệu</h3></div>`, "admin-exams");
    await loadCatalog(true);
    document.querySelector(".content").innerHTML = `<div class="page-heading"><div><h2>Quản lý bài kiểm tra</h2><p>Tạo đề từ file chuẩn, công bố rộng rãi hoặc giao cho từng nhóm học viên.</p></div><div class="heading-actions"><button class="btn btn-primary" id="import-exam">${icons.upload}Tải đề lên</button></div></div>
      <div class="toolbar"><div class="search">${icons.search}<input class="input" id="catalog-search" placeholder="Tìm bài kiểm tra"></div><select class="select filter-select" id="folder-filter"><option value="">Tất cả thư mục</option>${state.folders.map((f) => `<option value="${f.id}">${esc(f.name)}</option>`).join("")}</select></div>
      <div id="catalog">${catalogSections(state.exams, true)}</div>`;
    document.getElementById("import-exam").addEventListener("click", openImportExam);
    bindCatalogControls(true);
  }

  function openEditExam(id) {
    const exam = state.exams.find((x) => x.id === id);
    if (!exam) return;
    const selectedIds = new Set(exam.assigned_user_ids || []);
    const students = [...state.adminUsers].sort((a, b) => Number(b.active) - Number(a.active) || a.display_name.localeCompare(b.display_name, "vi"));
    const studentRows = students.length ? students.map((student) => `<label class="assignee-row ${student.active ? "" : "is-disabled"}" data-assignee-search="${esc(`${student.display_name} ${student.email}`.toLowerCase())}">
      <input type="checkbox" name="assigned_user_ids" value="${student.id}" ${selectedIds.has(student.id) && student.active ? "checked" : ""} ${student.active ? "" : "disabled"}>
      <span class="assignee-check">${icons.check}</span><span class="assignee-person"><strong>${esc(student.display_name)}</strong><small>${esc(student.email)}</small></span>
      <span class="assignee-state ${student.active ? "active" : "locked"}">${student.active ? "Hoạt động" : "Đã khóa"}</span>
    </label>`).join("") : `<div class="assignee-empty">Chưa có tài khoản học viên để giao bài.</div>`;
    openModal("Sửa bài kiểm tra", `<form id="edit-exam-form"><div class="form-grid">
      <div class="field span-2"><label>Tên bài kiểm tra</label><input class="input" name="title" value="${esc(exam.title)}" required maxlength="160"></div>
      <div class="field span-2"><label>Mô tả</label><textarea class="textarea" name="description" maxlength="500">${esc(exam.description || "")}</textarea></div>
      <div class="field"><label>Thời gian (phút)</label><input class="input" name="duration_minutes" type="number" min="1" max="300" value="${exam.duration_minutes}" required></div>
      <div class="field"><label>Số lượt làm</label><input class="input" name="max_attempts" type="number" min="0" max="1000" value="${exam.max_attempts}" required><span class="field-help">Nhập 0 để không giới hạn.</span></div>
      <div class="field"><label>Thư mục</label><select class="select" name="folder_id"><option value="">Chưa phân loại</option>${state.folders.map((f) => `<option value="${f.id}" ${f.id === exam.folder_id ? "selected" : ""}>${esc(f.name)}</option>`).join("")}</select></div>
      <div class="field"><label>Phạm vi bài kiểm tra</label><select class="select" name="status" id="exam-status"><option value="draft" ${exam.status === "draft" ? "selected" : ""}>Bản nháp</option><option value="published" ${exam.status === "published" ? "selected" : ""}>Công bố cho mọi học viên</option><option value="assigned" ${exam.status === "assigned" ? "selected" : ""}>Giao theo học viên</option></select></div>
      <section class="assignment-panel span-2 ${exam.status === "assigned" ? "" : "hidden"}" id="assignment-panel">
        <div class="assignment-head"><div><strong>Chọn học viên nhận bài</strong><span id="assignment-summary">Đã chọn 0 học viên</span></div><div class="assignment-actions"><button type="button" class="text-btn" id="select-all-students">Chọn tất cả</button><button type="button" class="text-btn" id="clear-students">Bỏ chọn</button></div></div>
        <div class="assignment-search">${icons.search}<input class="input" id="student-search" type="search" placeholder="Tìm theo họ tên hoặc email" autocomplete="off"></div>
        <div class="assignee-list" id="assignee-list">${studentRows}</div>
        <p class="assignment-note">Chỉ tài khoản đang hoạt động mới được chọn. Tất cả học viên dùng chung thời gian và số lượt làm đã đặt cho bài.</p>
      </section>
    </div><div class="form-actions"><button class="btn btn-secondary" type="button" data-close-modal>Hủy</button><button class="btn btn-primary" type="submit">Lưu thay đổi</button></div></form>`, { large: true });
    modalRoot.querySelector("[data-close-modal]").addEventListener("click", closeModal);
    const statusSelect = document.getElementById("exam-status");
    const assignmentPanel = document.getElementById("assignment-panel");
    const activeChecks = () => [...document.querySelectorAll('input[name="assigned_user_ids"]:not(:disabled)')];
    const updateAssignmentSummary = () => {
      const count = activeChecks().filter((input) => input.checked).length;
      document.getElementById("assignment-summary").textContent = `Đã chọn ${count} học viên`;
    };
    statusSelect.addEventListener("change", () => assignmentPanel.classList.toggle("hidden", statusSelect.value !== "assigned"));
    document.getElementById("student-search")?.addEventListener("input", (event) => {
      const query = event.target.value.trim().toLowerCase();
      document.querySelectorAll("[data-assignee-search]").forEach((row) => row.classList.toggle("hidden", query && !row.dataset.assigneeSearch.includes(query)));
    });
    document.getElementById("select-all-students")?.addEventListener("click", () => { activeChecks().forEach((input) => { input.checked = true; }); updateAssignmentSummary(); });
    document.getElementById("clear-students")?.addEventListener("click", () => { activeChecks().forEach((input) => { input.checked = false; }); updateAssignmentSummary(); });
    activeChecks().forEach((input) => input.addEventListener("change", updateAssignmentSummary));
    updateAssignmentSummary();
    document.getElementById("edit-exam-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      const button = event.submitter; button.disabled = true;
      try {
        const status = fd.get("status");
        const assignedUserIds = status === "assigned" ? fd.getAll("assigned_user_ids") : [];
        if (status === "assigned" && assignedUserIds.length === 0) throw new Error("Hãy chọn ít nhất một học viên để giao bài.");
        await api("admin-update-exam", { examId: id, patch: { title: fd.get("title"), description: fd.get("description"), duration_minutes: Number(fd.get("duration_minutes")), max_attempts: Number(fd.get("max_attempts")), folder_id: fd.get("folder_id") || null, status, assigned_user_ids: assignedUserIds } });
        closeModal(); toast("Đã cập nhật bài kiểm tra.", "success"); renderAdminExams();
      } catch (error) { toast(error.message, "error"); button.disabled = false; }
    });
  }

  function confirmDeleteExam(id) {
    const exam = state.exams.find((x) => x.id === id);
    openModal("Xóa bài kiểm tra", `<p style="margin:0;color:var(--muted);font-size:.82rem;line-height:1.7">Bạn có chắc muốn xóa “${esc(exam?.title || "bài kiểm tra này")}”? Dữ liệu đề và số lượt đã dùng sẽ bị xóa.</p><div class="form-actions"><button class="btn btn-secondary" data-close-modal>Hủy</button><button class="btn btn-danger" id="confirm-delete-exam">Xóa bài</button></div>`);
    modalRoot.querySelector("[data-close-modal]").addEventListener("click", closeModal);
    document.getElementById("confirm-delete-exam").addEventListener("click", async (event) => {
      event.currentTarget.disabled = true;
      try { await api("admin-delete-exam", { examId: id }); closeModal(); toast("Đã xóa bài kiểm tra.", "success"); renderAdminExams(); }
      catch (error) { toast(error.message, "error"); event.currentTarget.disabled = false; }
    });
  }

  function openImportExam() {
    openModal("Tạo bài kiểm tra từ file", `<form id="import-form">
      <div class="upload-box" id="upload-box">${icons.upload}<strong>Chọn file đề CA4</strong><span>Chỉ nhận file .xlsx theo phiên bản ${esc(config.formatVersion)}</span><input id="exam-file" type="file" accept=".xlsx" required></div>
      <div id="import-result"></div>
      <div class="form-actions"><button class="btn btn-secondary" type="button" data-close-modal>Hủy</button><button class="btn btn-primary" id="create-exam-button" type="submit" disabled>Tạo bài kiểm tra</button></div>
    </form>`, { large: true });
    modalRoot.querySelector("[data-close-modal]").addEventListener("click", closeModal);
    const input = document.getElementById("exam-file");
    const box = document.getElementById("upload-box");
    let parsed = null;
    ["dragenter", "dragover"].forEach((name) => box.addEventListener(name, () => box.classList.add("dragging")));
    ["dragleave", "drop"].forEach((name) => box.addEventListener(name, () => box.classList.remove("dragging")));
    input.addEventListener("change", async () => {
      if (!input.files[0]) return;
      try {
        parsed = await parseExamWorkbook(input.files[0]);
        const errors = validateExamPayload(parsed);
        renderImportValidation(input.files[0].name, parsed, errors);
        document.getElementById("create-exam-button").disabled = errors.length > 0;
      } catch (error) {
        parsed = null;
        renderImportValidation(input.files[0].name, null, [error.message]);
        document.getElementById("create-exam-button").disabled = true;
      }
    });
    document.getElementById("import-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!parsed) return;
      const button = event.submitter; button.disabled = true; button.textContent = "Đang tạo…";
      try {
        await api("admin-import-exam", { exam: parsed });
        closeModal(); toast("Đã tạo bài kiểm tra.", "success"); renderAdminExams();
      } catch (error) { toast(error.message, "error"); button.disabled = false; button.textContent = "Tạo bài kiểm tra"; }
    });
  }

  async function parseExamWorkbook(file) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const required = ["THONG_TIN", "TINH_HUONG", "CAU_HOI"];
    required.forEach((name) => { if (!workbook.SheetNames.includes(name)) throw new Error(`Thiếu sheet ${name}.`); });
    const metaRows = XLSX.utils.sheet_to_json(workbook.Sheets.THONG_TIN, { header: 1, defval: "" });
    const meta = {};
    metaRows.slice(1).forEach((row) => { if (row[0]) meta[String(row[0]).trim()] = row[1]; });
    const passageRows = XLSX.utils.sheet_to_json(workbook.Sheets.TINH_HUONG, { defval: "" });
    const questionRows = XLSX.utils.sheet_to_json(workbook.Sheets.CAU_HOI, { defval: "" });
    const passages = passageRows.map((row) => ({ group_code: String(row.ma_nhom || "").trim().toUpperCase(), content: String(row.noi_dung_tinh_huong || "").trim() }));
    const questions = questionRows.filter((row) => row.so_cau !== "").map((row) => {
      const kind = String(row.loai_cau || "").trim().toUpperCase();
      const correct = String(row.dap_an_dung || "").trim();
      return {
        number: Number(row.so_cau),
        kind,
        group_code: String(row.ma_nhom || "").trim().toUpperCase() || null,
        stem: String(row.noi_dung || "").trim(),
        options: { A: String(row.phuong_an_a || "").trim(), B: String(row.phuong_an_b || "").trim(), C: String(row.phuong_an_c || "").trim(), D: String(row.phuong_an_d || "").trim() },
        correct_answer: kind === "NGAN" ? correct : correct.toUpperCase(),
        accepted_answers: String(row.dap_an_tuong_duong || "").split("||").map((x) => x.trim()).filter(Boolean),
        explanation: String(row.loi_giai || "").trim(),
        topic: String(row.chu_de || "").trim(),
        level: String(row.muc_do || "").trim().toUpperCase(),
        points: Number(row.diem),
      };
    });
    return {
      format_version: String(meta.format_version || "").trim(),
      title: String(meta.ten_bai_kiem_tra || "").trim(),
      description: String(meta.mo_ta || "").trim(),
      duration_minutes: Number(meta.thoi_gian_phut),
      max_attempts: Number(meta.so_luot_lam),
      folder_name: String(meta.thu_muc || "").trim(),
      status: String(meta.trang_thai || "draft").trim().toLowerCase(),
      passages,
      questions,
    };
  }

  function validateExamPayload(exam) {
    const errors = [];
    if (exam.format_version !== config.formatVersion) errors.push(`format_version phải là ${config.formatVersion}.`);
    if (!exam.title) errors.push("Chưa nhập tên bài kiểm tra.");
    if (!Number.isInteger(exam.duration_minutes) || exam.duration_minutes < 1 || exam.duration_minutes > 300) errors.push("Thời gian phải là số nguyên từ 1 đến 300 phút.");
    if (!Number.isInteger(exam.max_attempts) || exam.max_attempts < 0) errors.push("Số lượt làm phải là số nguyên không âm.");
    if (!['draft', 'published'].includes(exam.status)) errors.push("Trạng thái chỉ nhận draft hoặc published.");
    if (exam.questions.length !== 60) errors.push(`File có ${exam.questions.length} câu; yêu cầu đúng 60 câu.`);
    const numbers = new Set(exam.questions.map((q) => q.number));
    for (let number = 1; number <= 60; number += 1) if (!numbers.has(number)) errors.push(`Thiếu câu ${number}.`);
    if (numbers.size !== exam.questions.length) errors.push("Có số câu bị trùng.");
    const passageMap = new Map(exam.passages.map((p) => [p.group_code, p.content]));
    if (!passageMap.get("N1")) errors.push("Thiếu nội dung tình huống N1.");
    if (!passageMap.get("N2")) errors.push("Thiếu nội dung tình huống N2.");
    const levels = { BIET: 0, HIEU: 0, VANDUNG: 0 };
    let totalPoints = 0;
    exam.questions.forEach((q) => {
      const prefix = `Câu ${q.number}: `;
      const expectedKind = q.number <= 48 ? "DON" : q.number <= 54 ? "NHOM" : "NGAN";
      if (q.kind !== expectedKind) errors.push(`${prefix}loại câu phải là ${expectedKind}.`);
      const expectedGroup = q.number >= 49 && q.number <= 51 ? "N1" : q.number >= 52 && q.number <= 54 ? "N2" : null;
      if (q.group_code !== expectedGroup) errors.push(`${prefix}mã nhóm không đúng cấu trúc.`);
      if (!q.stem) errors.push(`${prefix}thiếu nội dung câu hỏi.`);
      if (!Number.isFinite(q.points) || q.points <= 0) errors.push(`${prefix}điểm phải lớn hơn 0.`); else totalPoints += q.points;
      if (!(q.level in levels)) errors.push(`${prefix}mức độ phải là BIET, HIEU hoặc VANDUNG.`); else levels[q.level] += 1;
      if (expectedKind === "NGAN") {
        if (Object.values(q.options).some(Boolean)) errors.push(`${prefix}câu trả lời ngắn không được có phương án A–D.`);
        if (!q.correct_answer && !q.accepted_answers.length) errors.push(`${prefix}thiếu đáp án trả lời ngắn.`);
      } else {
        if (Object.values(q.options).some((x) => !x)) errors.push(`${prefix}phải có đủ bốn phương án A–D.`);
        if (new Set(Object.values(q.options).map((x) => x.toLocaleLowerCase("vi-VN"))).size !== 4) errors.push(`${prefix}các phương án không được trùng nhau.`);
        if (!/[ABCD]/.test(q.correct_answer) || q.correct_answer.length !== 1) errors.push(`${prefix}đáp án đúng phải là A, B, C hoặc D.`);
      }
    });
    if (levels.BIET !== 12 || levels.HIEU !== 18 || levels.VANDUNG !== 30) errors.push(`Tỷ lệ mức độ hiện là ${levels.BIET} Biết, ${levels.HIEU} Hiểu, ${levels.VANDUNG} Vận dụng; yêu cầu 12–18–30.`);
    if (Math.abs(totalPoints - 70) > 0.01) errors.push(`Tổng điểm hiện là ${totalPoints.toFixed(2)}; yêu cầu 70 điểm.`);
    return [...new Set(errors)];
  }

  function renderImportValidation(fileName, exam, errors) {
    const area = document.getElementById("import-result");
    const overview = exam ? `<div class="validation-row ok">${icons.check}<span><strong>${esc(fileName)}</strong><br>${exam.questions.length} câu · ${exam.duration_minutes || 0} phút · ${exam.title ? esc(exam.title) : "Chưa có tên"}</span></div>` : "";
    area.innerHTML = `<div class="validation-box">${overview}${errors.length ? errors.slice(0, 40).map((error) => `<div class="validation-row error">${icons.alert}<span>${esc(error)}</span></div>`).join("") : `<div class="validation-row ok">${icons.check}<span>File hợp lệ và sẵn sàng tạo bài kiểm tra.</span></div>`}</div>`;
  }

  async function renderAdminUsers() {
    shell("Quản lý tài khoản", `<div class="empty"><div class="empty-icon">${icons.clock}</div><h3>Đang tải tài khoản</h3></div>`, "admin-users");
    const data = await api("admin-list-users");
    state.adminUsers = data.users || [];
    document.querySelector(".content").innerHTML = `<div class="page-heading"><div><h2>Quản lý tài khoản</h2><p>Tài khoản mới chỉ có quyền làm bài. Hệ thống không cho tạo thêm quản trị viên.</p></div><div class="heading-actions"><button class="btn btn-primary" id="create-user">${icons.plus}Tạo tài khoản</button></div></div>
      <section class="panel"><div class="panel-head"><div><h3>Danh sách tài khoản</h3><p>${state.adminUsers.length} tài khoản trong hệ thống</p></div></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Họ tên</th><th>Tài khoản</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th style="text-align:right">Thao tác</th></tr></thead><tbody>${state.adminUsers.map(userRow).join("")}</tbody></table></div></section>`;
    document.getElementById("create-user").addEventListener("click", openCreateUser);
    bindUserActions();
  }

  function userRow(user) {
    return `<tr><td><span class="cell-primary">${esc(user.display_name)}</span>${user.is_root ? '<span class="cell-secondary">Tài khoản quản trị gốc</span>' : ""}</td><td>${esc(user.email)}</td><td>${roleLabel(user.role)}</td><td><span class="status ${user.active ? "status-published" : "status-locked"}">${user.active ? "Đang hoạt động" : "Đã khóa"}</span></td><td>${formatDate(user.created_at)}</td><td><div class="table-actions">${user.is_root ? "" : `<button class="action-btn" data-edit-user="${user.id}" aria-label="Sửa">${icons.edit}</button><button class="action-btn" data-reset-user="${user.id}" aria-label="Đặt lại mật khẩu">${icons.key}</button><button class="action-btn danger" data-delete-user="${user.id}" aria-label="Xóa">${icons.trash}</button>`}</div></td></tr>`;
  }

  function bindUserActions() {
    document.querySelectorAll("[data-edit-user]").forEach((el) => el.addEventListener("click", () => openEditUser(el.dataset.editUser)));
    document.querySelectorAll("[data-reset-user]").forEach((el) => el.addEventListener("click", () => openResetPassword(el.dataset.resetUser)));
    document.querySelectorAll("[data-delete-user]").forEach((el) => el.addEventListener("click", () => confirmDeleteUser(el.dataset.deleteUser)));
  }

  function openCreateUser() {
    openModal("Tạo tài khoản học viên", `<form id="create-user-form"><div class="form-grid">
      <div class="field span-2"><label>Họ và tên</label><input class="input" name="display_name" required maxlength="100" placeholder="Nguyễn Văn A"></div>
      <div class="field span-2"><label>Email đăng nhập</label><input class="input" name="email" type="email" required autocomplete="off" placeholder="hocvien@example.com"></div>
      <div class="field span-2"><label>Mật khẩu ban đầu</label><input class="input" name="password" type="password" minlength="8" required autocomplete="new-password"><span class="field-help">Tối thiểu 8 ký tự. Nên yêu cầu học viên đổi sau lần đăng nhập đầu tiên.</span></div>
    </div><div class="form-actions"><button class="btn btn-secondary" type="button" data-close-modal>Hủy</button><button class="btn btn-primary" type="submit">Tạo tài khoản</button></div></form>`);
    modalRoot.querySelector("[data-close-modal]").addEventListener("click", closeModal);
    document.getElementById("create-user-form").addEventListener("submit", async (event) => {
      event.preventDefault(); const fd = new FormData(event.currentTarget); const button = event.submitter; button.disabled = true;
      try { await api("admin-create-user", { user: { display_name: fd.get("display_name"), email: fd.get("email"), password: fd.get("password") } }); closeModal(); toast("Đã tạo tài khoản học viên.", "success"); renderAdminUsers(); }
      catch (error) { toast(error.message, "error"); button.disabled = false; }
    });
  }

  function openEditUser(id) {
    const user = state.adminUsers.find((x) => x.id === id); if (!user) return;
    openModal("Sửa tài khoản", `<form id="edit-user-form"><div class="form-grid">
      <div class="field span-2"><label>Họ và tên</label><input class="input" name="display_name" value="${esc(user.display_name)}" required maxlength="100"></div>
      <div class="field span-2"><label>Email đăng nhập</label><input class="input" name="email" type="email" value="${esc(user.email)}" required></div>
      <div class="field span-2"><label>Trạng thái</label><select class="select" name="active"><option value="true" ${user.active ? "selected" : ""}>Đang hoạt động</option><option value="false" ${!user.active ? "selected" : ""}>Khóa tài khoản</option></select></div>
    </div><div class="form-actions"><button class="btn btn-secondary" type="button" data-close-modal>Hủy</button><button class="btn btn-primary" type="submit">Lưu thay đổi</button></div></form>`);
    modalRoot.querySelector("[data-close-modal]").addEventListener("click", closeModal);
    document.getElementById("edit-user-form").addEventListener("submit", async (event) => {
      event.preventDefault(); const fd = new FormData(event.currentTarget); const button = event.submitter; button.disabled = true;
      try { await api("admin-update-user", { userId: id, patch: { display_name: fd.get("display_name"), email: fd.get("email"), active: fd.get("active") === "true" } }); closeModal(); toast("Đã cập nhật tài khoản.", "success"); renderAdminUsers(); }
      catch (error) { toast(error.message, "error"); button.disabled = false; }
    });
  }

  function openResetPassword(id) {
    const user = state.adminUsers.find((x) => x.id === id); if (!user) return;
    openModal("Đặt lại mật khẩu", `<form id="reset-password-form"><p style="margin-top:0;color:var(--muted);font-size:.8rem">Tạo mật khẩu mới cho ${esc(user.display_name)}.</p><div class="field"><label>Mật khẩu mới</label><input class="input" name="password" type="password" minlength="8" required autocomplete="new-password"></div><div class="form-actions"><button class="btn btn-secondary" type="button" data-close-modal>Hủy</button><button class="btn btn-primary" type="submit">Đặt lại mật khẩu</button></div></form>`);
    modalRoot.querySelector("[data-close-modal]").addEventListener("click", closeModal);
    document.getElementById("reset-password-form").addEventListener("submit", async (event) => {
      event.preventDefault(); const fd = new FormData(event.currentTarget); const button = event.submitter; button.disabled = true;
      try { await api("admin-reset-password", { userId: id, password: fd.get("password") }); closeModal(); toast("Đã đặt lại mật khẩu.", "success"); }
      catch (error) { toast(error.message, "error"); button.disabled = false; }
    });
  }

  function confirmDeleteUser(id) {
    const user = state.adminUsers.find((x) => x.id === id); if (!user) return;
    openModal("Xóa tài khoản", `<p style="margin:0;color:var(--muted);font-size:.82rem;line-height:1.7">Xóa vĩnh viễn tài khoản “${esc(user.display_name)}” (${esc(user.email)})?</p><div class="form-actions"><button class="btn btn-secondary" data-close-modal>Hủy</button><button class="btn btn-danger" id="confirm-delete-user">Xóa tài khoản</button></div>`);
    modalRoot.querySelector("[data-close-modal]").addEventListener("click", closeModal);
    document.getElementById("confirm-delete-user").addEventListener("click", async (event) => {
      event.currentTarget.disabled = true;
      try { await api("admin-delete-user", { userId: id }); closeModal(); toast("Đã xóa tài khoản.", "success"); renderAdminUsers(); }
      catch (error) { toast(error.message, "error"); event.currentTarget.disabled = false; }
    });
  }

  async function renderAdminFolders() {
    shell("Quản lý thư mục", `<div class="empty"><div class="empty-icon">${icons.clock}</div><h3>Đang tải thư mục</h3></div>`, "admin-folders");
    await loadCatalog(true);
    const countByFolder = state.exams.reduce((acc, exam) => { const key = exam.folder_id || "none"; acc[key] = (acc[key] || 0) + 1; return acc; }, {});
    document.querySelector(".content").innerHTML = `<div class="page-heading"><div><h2>Quản lý thư mục</h2><p>Sắp xếp đề luyện tập và đề thi thử theo từng nhóm.</p></div><div class="heading-actions"><button class="btn btn-primary" id="create-folder">${icons.plus}Tạo thư mục</button></div></div>
      <section class="panel"><div class="panel-head"><div><h3>Danh sách thư mục</h3><p>${state.folders.length} thư mục</p></div></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Tên thư mục</th><th>Thứ tự</th><th>Số bài</th><th style="text-align:right">Thao tác</th></tr></thead><tbody>${state.folders.map((folder) => `<tr><td class="cell-primary">${esc(folder.name)}</td><td>${folder.sort_order}</td><td>${countByFolder[folder.id] || 0}</td><td><div class="table-actions"><button class="action-btn" data-edit-folder="${folder.id}">${icons.edit}</button><button class="action-btn danger" data-delete-folder="${folder.id}">${icons.trash}</button></div></td></tr>`).join("")}</tbody></table></div></section>`;
    document.getElementById("create-folder").addEventListener("click", () => openFolderForm());
    document.querySelectorAll("[data-edit-folder]").forEach((el) => el.addEventListener("click", () => openFolderForm(el.dataset.editFolder)));
    document.querySelectorAll("[data-delete-folder]").forEach((el) => el.addEventListener("click", () => deleteFolder(el.dataset.deleteFolder)));
  }

  function openFolderForm(id = null) {
    const folder = id ? state.folders.find((x) => x.id === id) : null;
    openModal(folder ? "Sửa thư mục" : "Tạo thư mục", `<form id="folder-form"><div class="form-grid"><div class="field span-2"><label>Tên thư mục</label><input class="input" name="name" value="${esc(folder?.name || "")}" required maxlength="100" placeholder="Đề thi thử"></div><div class="field"><label>Thứ tự hiển thị</label><input class="input" name="sort_order" type="number" min="0" value="${folder?.sort_order || 0}" required></div></div><div class="form-actions"><button class="btn btn-secondary" type="button" data-close-modal>Hủy</button><button class="btn btn-primary" type="submit">${folder ? "Lưu thay đổi" : "Tạo thư mục"}</button></div></form>`);
    modalRoot.querySelector("[data-close-modal]").addEventListener("click", closeModal);
    document.getElementById("folder-form").addEventListener("submit", async (event) => {
      event.preventDefault(); const fd = new FormData(event.currentTarget); const button = event.submitter; button.disabled = true;
      try { await api("admin-save-folder", { folderId: id, folder: { name: fd.get("name"), sort_order: Number(fd.get("sort_order")) } }); closeModal(); toast(folder ? "Đã cập nhật thư mục." : "Đã tạo thư mục.", "success"); renderAdminFolders(); }
      catch (error) { toast(error.message, "error"); button.disabled = false; }
    });
  }

  function deleteFolder(id) {
    const folder = state.folders.find((x) => x.id === id);
    openModal("Xóa thư mục", `<p style="margin:0;color:var(--muted);font-size:.82rem;line-height:1.7">Xóa thư mục “${esc(folder?.name || "")}"? Các bài bên trong sẽ chuyển sang mục Chưa phân loại.</p><div class="form-actions"><button class="btn btn-secondary" data-close-modal>Hủy</button><button class="btn btn-danger" id="confirm-delete-folder">Xóa thư mục</button></div>`);
    modalRoot.querySelector("[data-close-modal]").addEventListener("click", closeModal);
    document.getElementById("confirm-delete-folder").addEventListener("click", async (event) => {
      event.currentTarget.disabled = true;
      try { await api("admin-delete-folder", { folderId: id }); closeModal(); toast("Đã xóa thư mục.", "success"); renderAdminFolders(); }
      catch (error) { toast(error.message, "error"); event.currentTarget.disabled = false; }
    });
  }

  function renderFormatGuide() {
    shell("Quy định file đề", `<div class="page-heading"><div><h2>Định dạng nhập đề CA4</h2><p>Phiên bản ${esc(config.formatVersion)} — cấu trúc được kiểm tra trước khi tạo bài.</p></div><div class="heading-actions"><a class="btn btn-secondary" href="docs/QUY_DINH_FORMAT_CA4.md" download>${icons.download}Tải quy định</a><a class="btn btn-primary" href="templates/CA4_mau_nhap_de.xlsx" download>${icons.download}Tải file mẫu</a></div></div>
      <div class="format-layout"><nav class="panel format-nav"><a href="#format-cau-truc">Cấu trúc đề</a><a href="#format-sheets">Các sheet</a><a href="#format-columns">Các cột dữ liệu</a><a href="#format-validation">Điều kiện hợp lệ</a><a href="#format-short">Trả lời ngắn</a></nav>
      <article class="panel format-doc"><h2 id="format-cau-truc">Cấu trúc bắt buộc</h2><table class="rule-table"><thead><tr><th>Phạm vi</th><th>Loại câu</th><th>Quy tắc</th></tr></thead><tbody><tr><td>C01–C48</td><td>Trắc nghiệm đơn</td><td>4 phương án A–D, một đáp án đúng</td></tr><tr><td>C49–C51</td><td>Nhóm N1</td><td>Dùng chung tình huống N1</td></tr><tr><td>C52–C54</td><td>Nhóm N2</td><td>Dùng chung tình huống N2</td></tr><tr><td>C55–C60</td><td>Trả lời ngắn</td><td>Không có phương án A–D</td></tr></tbody></table>
      <h3 id="format-sheets">Ba sheet bắt buộc</h3><p><code>THONG_TIN</code> chứa thông tin bài, <code>TINH_HUONG</code> chứa N1 và N2, <code>CAU_HOI</code> chứa đúng 60 câu.</p>
      <h3 id="format-columns">Quy ước dữ liệu</h3><p>Loại câu dùng <code>DON</code>, <code>NHOM</code>, <code>NGAN</code>. Mức độ dùng <code>BIET</code>, <code>HIEU</code>, <code>VANDUNG</code>. Các giá trị phải giữ nguyên, không tự đổi tên cột.</p>
      <h3 id="format-validation">Kiểm tra trước khi tạo</h3><ul><li>Đúng 60 câu, số câu liên tục và không trùng.</li><li>Đúng 12 câu Biết, 18 câu Hiểu và 30 câu Vận dụng.</li><li>Tổng điểm bằng 70.</li><li>Hai tình huống N1 và N2 không được để trống.</li><li>Mỗi câu trắc nghiệm có đủ bốn phương án khác nhau.</li></ul>
      <h3 id="format-short">Đáp án trả lời ngắn</h3><p>Ghi đáp án chính vào cột <code>dap_an_dung</code>. Các cách viết khác được chấp nhận ghi trong <code>dap_an_tuong_duong</code> và ngăn cách bằng <code>||</code>.</p></article></div>`, "format");
  }

  async function renderExamEntry(shareCode) {
    document.body.className = "";
    app.innerHTML = `<main class="brief-page"><section class="brief-card"><div class="brief-body"><div class="empty"><div class="empty-icon">${icons.clock}</div><h3>Đang chuẩn bị bài kiểm tra</h3></div></div></section></main>`;
    let data;
    try {
      data = await api("get-exam", { shareCode });
    } catch (error) {
      app.innerHTML = `<main class="brief-page"><section class="brief-card"><header class="brief-head"><img src="assets/brand-mark.svg" alt=""><div><h1>CA4 Exam</h1><p>Quyền truy cập bài kiểm tra</p></div></header><div class="brief-body"><div class="access-denied">${icons.alert}<div><h2>Không thể mở bài kiểm tra</h2><p>${esc(error.message || "Bạn không có quyền truy cập bài kiểm tra này.")}</p></div></div><div class="brief-actions"><a class="btn btn-primary" href="#/home">Về danh sách bài</a></div></div></section></main>`;
      return;
    }
    state.activeExam = data.exam;
    const exam = data.exam;
    const remaining = exam.max_attempts === 0 ? "Không giới hạn" : `${Math.max(0, exam.max_attempts - exam.used_attempts)} lượt`;
    app.innerHTML = `<main class="brief-page"><section class="brief-card"><header class="brief-head"><img src="assets/brand-mark.svg" alt=""><div><h1>CA4 Exam</h1><p>Lý luận Nhà nước và Pháp luật</p></div></header><div class="brief-body"><h2>${esc(exam.title)}</h2><p>${esc(exam.description || "Bài kiểm tra được xây dựng theo cấu trúc đề thi CA4 năm 2026.")}</p>
      <div class="brief-facts"><div class="brief-fact"><span>Số câu hỏi</span><strong>60 câu</strong></div><div class="brief-fact"><span>Thời gian</span><strong>${exam.duration_minutes} phút</strong></div><div class="brief-fact"><span>Lượt còn lại</span><strong>${remaining}</strong></div></div>
      <div class="brief-rules"><strong>Lưu ý trước khi bắt đầu:</strong><br>Bài thi mở ở chế độ toàn màn hình. Chuyển tab hoặc thoát toàn màn hình sẽ bị cảnh báo; cảnh báo lần thứ ba hệ thống tự nộp bài. Lượt làm được tính từ khi bạn nhấn Bắt đầu.</div>
      <div class="brief-actions"><a class="btn btn-secondary" href="#/home">Quay lại</a><button class="btn btn-primary" id="start-exam" ${exam.can_start ? "" : "disabled"}>${exam.can_start ? "Bắt đầu làm bài" : "Đã hết lượt làm"}</button></div></div></section></main>`;
    document.getElementById("start-exam")?.addEventListener("click", () => startExam(shareCode));
  }

  async function startExam(shareCode) {
    const button = document.getElementById("start-exam"); button.disabled = true; button.textContent = "Đang bắt đầu…";
    try {
      state.ignoreGuardUntil = Date.now() + 2200;
      if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen().catch(() => null);
      const data = await api("start-attempt", { shareCode });
      state.activeExam = data.exam;
      state.activeAttempt = data.attempt;
      state.answers = data.attempt.draft_answers || {};
      state.currentQuestion = 1;
      state.flags = new Set();
      state.guardActive = true;
      bindExamGuards();
      renderExamRunner();
      startExamTimers();
    } catch (error) { toast(error.message, "error"); button.disabled = false; button.textContent = "Bắt đầu làm bài"; }
  }

  function renderExamRunner() {
    document.body.className = "exam-mode";
    const exam = state.activeExam;
    app.innerHTML = `<main class="exam-app"><header class="exam-header"><div class="exam-brand"><img src="assets/brand-mark.svg" alt=""><div><strong>${esc(exam.title)}</strong><span>CA4 · 60 câu</span></div></div><div class="timer" id="timer"><span>Thời gian còn lại</span><strong>--:--:--</strong></div><div class="exam-head-right"><div class="warning-chip">${icons.alert}<span>Cảnh báo</span><strong id="warning-count">${state.activeAttempt.warning_count}/3</strong></div><button class="icon-btn question-drawer-btn" id="open-question-nav" aria-label="Danh sách câu">${icons.menu}</button></div></header>
      <div class="exam-body"><section class="exam-stage" id="exam-stage"><div class="question-wrap" id="question-wrap"></div></section><aside class="exam-nav" id="exam-nav"></aside></div></main>`;
    document.getElementById("open-question-nav").addEventListener("click", () => document.getElementById("exam-nav").classList.toggle("open"));
    renderCurrentQuestion();
    renderQuestionNav();
  }

  function currentQuestion() { return state.activeExam.questions.find((q) => q.number === state.currentQuestion); }

  function renderCurrentQuestion() {
    const q = currentQuestion(); if (!q) return;
    const passage = q.group_code ? state.activeExam.passages.find((p) => p.group_code === q.group_code) : null;
    const answer = state.answers[q.number] ?? "";
    const options = q.kind === "NGAN" ? `<div class="short-answer"><input class="input" id="short-answer" value="${esc(answer)}" maxlength="300" autocomplete="off" placeholder="Nhập câu trả lời"><span>Có thể nhập chữ hoặc số theo yêu cầu của câu hỏi.</span></div>` : `<div class="options">${Object.entries(q.options).map(([key, value]) => `<label class="option ${answer === key ? "selected" : ""}"><input type="radio" name="answer" value="${key}" ${answer === key ? "checked" : ""}><span class="option-key">${key}</span><span class="option-text">${esc(value)}</span></label>`).join("")}</div>`;
    document.getElementById("question-wrap").innerHTML = `<div class="question-layout ${passage ? "grouped" : ""}">${passage ? `<article class="passage-card"><span class="passage-label">Tình huống ${esc(passage.group_code)}</span><h2>Đọc tình huống và trả lời ba câu hỏi</h2><p>${esc(passage.content)}</p></article>` : ""}<article class="question-card"><header class="question-card-head"><span class="question-kicker">Câu ${String(q.number).padStart(2,"0")} / 60</span><span class="level-chip">${q.kind === "DON" ? "Trắc nghiệm đơn" : q.kind === "NHOM" ? `Câu hỏi nhóm ${q.group_code}` : "Trả lời ngắn"}</span></header><div class="question-content"><p class="stem">${esc(q.stem)}</p>${options}<footer class="question-footer"><button class="btn btn-secondary" id="prev-question" ${q.number === 1 ? "disabled" : ""}>${icons.chevronLeft}Câu trước</button><div><button class="btn btn-ghost" id="flag-question">${icons.flag}${state.flags.has(q.number) ? "Bỏ đánh dấu" : "Xem lại"}</button><button class="btn btn-primary" id="next-question">${q.number === 60 ? "Kiểm tra bài" : "Câu tiếp"}${icons.chevronRight}</button></div></footer></div></article></div>`;
    document.querySelectorAll('input[name="answer"]').forEach((input) => input.addEventListener("change", () => {
      state.answers[q.number] = input.value;
      document.querySelectorAll(".option").forEach((option) => option.classList.toggle("selected", option.querySelector("input").checked));
      renderQuestionNav();
    }));
    document.getElementById("short-answer")?.addEventListener("input", (event) => { state.answers[q.number] = event.target.value; renderQuestionNav(); });
    document.getElementById("prev-question").addEventListener("click", () => navigateQuestion(q.number - 1));
    document.getElementById("next-question").addEventListener("click", () => q.number === 60 ? openSubmitCheck() : navigateQuestion(q.number + 1));
    document.getElementById("flag-question").addEventListener("click", () => { state.flags.has(q.number) ? state.flags.delete(q.number) : state.flags.add(q.number); renderCurrentQuestion(); renderQuestionNav(); });
    document.getElementById("exam-stage").scrollTop = 0;
  }

  function navigateQuestion(number) {
    if (number < 1 || number > 60) return;
    state.currentQuestion = number;
    document.getElementById("exam-nav")?.classList.remove("open");
    renderCurrentQuestion(); renderQuestionNav();
  }

  function answeredCount() {
    return state.activeExam.questions.filter((q) => String(state.answers[q.number] ?? "").trim() !== "").length;
  }

  function renderQuestionNav() {
    const container = document.getElementById("exam-nav"); if (!container) return;
    const count = answeredCount();
    container.innerHTML = `<div class="nav-progress"><div class="nav-progress-row"><span>Tiến độ làm bài</span><strong>${count}/60</strong></div><div class="progress-bar"><span style="width:${count / 60 * 100}%"></span></div></div><div class="question-grid">${state.activeExam.questions.map((q) => `<button class="q-dot ${String(state.answers[q.number] ?? "").trim() ? "answered" : ""} ${state.currentQuestion === q.number ? "current" : ""} ${state.flags.has(q.number) ? "flagged" : ""}" data-question="${q.number}">${q.number}</button>`).join("")}</div><div class="legend"><span><i class="answered"></i>Đã trả lời</span><span><i class="current"></i>Đang xem</span><span><i></i>Chưa trả lời</span><span><i style="background:#df8e22;border-color:#df8e22"></i>Xem lại</span></div><div class="submit-block"><button class="btn btn-primary" id="submit-exam" ${count === 60 ? "" : "disabled"}>Nộp bài</button><p class="submit-note">${count === 60 ? "Kiểm tra lại trước khi nộp." : `Còn ${60 - count} câu chưa trả lời.`}</p></div>`;
    container.querySelectorAll("[data-question]").forEach((button) => button.addEventListener("click", () => navigateQuestion(Number(button.dataset.question))));
    document.getElementById("submit-exam").addEventListener("click", openSubmitCheck);
  }

  function openSubmitCheck() {
    const unanswered = state.activeExam.questions.filter((q) => !String(state.answers[q.number] ?? "").trim()).map((q) => q.number);
    if (unanswered.length) {
      openModal("Chưa thể nộp bài", `<p style="margin-top:0;color:var(--muted);font-size:.8rem;line-height:1.7">Bạn còn ${unanswered.length} câu chưa trả lời.</p><div class="question-grid">${unanswered.map((n) => `<button class="q-dot" data-jump="${n}">${n}</button>`).join("")}</div><div class="form-actions"><button class="btn btn-primary" data-close-modal>Tiếp tục làm bài</button></div>`);
      modalRoot.querySelector("[data-close-modal]").addEventListener("click", closeModal);
      modalRoot.querySelectorAll("[data-jump]").forEach((el) => el.addEventListener("click", () => { closeModal(); navigateQuestion(Number(el.dataset.jump)); }));
      return;
    }
    openModal("Xác nhận nộp bài", `<p style="margin:0;color:var(--muted);font-size:.82rem;line-height:1.7">Bạn đã trả lời đủ 60 câu. Sau khi nộp, bài làm sẽ được chấm và không thể thay đổi.</p><div class="form-actions"><button class="btn btn-secondary" data-close-modal>Kiểm tra lại</button><button class="btn btn-primary" id="confirm-submit">Nộp bài</button></div>`);
    modalRoot.querySelector("[data-close-modal]").addEventListener("click", closeModal);
    document.getElementById("confirm-submit").addEventListener("click", (event) => submitExam(null, event.currentTarget));
  }

  function startExamTimers() {
    clearInterval(state.timerId); clearInterval(state.autosaveId);
    const update = () => {
      const remaining = Math.max(0, new Date(state.activeAttempt.deadline_at).getTime() - Date.now());
      const totalSeconds = Math.ceil(remaining / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const timer = document.getElementById("timer");
      if (timer) { timer.querySelector("strong").textContent = `${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`; timer.classList.toggle("danger", totalSeconds <= 300); }
      if (remaining <= 0) submitExam("time", null);
    };
    update(); state.timerId = setInterval(update, 1000);
    state.autosaveId = setInterval(() => saveProgress().catch(() => null), 20000);
  }

  async function saveProgress() {
    if (!state.activeAttempt || !state.guardActive) return;
    await api("save-progress", { attemptId: state.activeAttempt.id, answers: state.answers });
  }

  async function submitExam(reason = null, button = null) {
    if (!state.activeAttempt || state.activeAttempt.submitting) return;
    state.activeAttempt.submitting = true;
    if (button) { button.disabled = true; button.textContent = "Đang chấm bài…"; }
    try {
      const result = await api("submit-attempt", { attemptId: state.activeAttempt.id, answers: state.answers, automaticReason: reason });
      state.result = result;
      cleanupExam();
      closeModal();
      if (document.fullscreenElement) { state.ignoreGuardUntil = Date.now() + 2000; await document.exitFullscreen().catch(() => null); }
      renderResult();
    } catch (error) {
      state.activeAttempt.submitting = false;
      toast(error.message, "error");
      if (button) { button.disabled = false; button.textContent = "Nộp bài"; }
    }
  }

  function bindExamGuards() {
    document.addEventListener("visibilitychange", visibilityGuard);
    window.addEventListener("blur", blurGuard);
    document.addEventListener("fullscreenchange", fullscreenGuard);
    document.addEventListener("copy", copyGuard);
    document.addEventListener("cut", copyGuard);
    document.addEventListener("contextmenu", copyGuard);
    document.addEventListener("keydown", examKeyGuard);
  }

  function unbindExamGuards() {
    document.removeEventListener("visibilitychange", visibilityGuard);
    window.removeEventListener("blur", blurGuard);
    document.removeEventListener("fullscreenchange", fullscreenGuard);
    document.removeEventListener("copy", copyGuard);
    document.removeEventListener("cut", copyGuard);
    document.removeEventListener("contextmenu", copyGuard);
    document.removeEventListener("keydown", examKeyGuard);
  }

  function visibilityGuard() { if (document.hidden) registerViolation("Bạn vừa rời khỏi tab làm bài."); }
  function blurGuard() { setTimeout(() => { if (!document.hasFocus()) registerViolation("Cửa sổ làm bài vừa mất tiêu điểm."); }, 500); }
  function fullscreenGuard() { if (!document.fullscreenElement) registerViolation("Bạn vừa thoát chế độ toàn màn hình."); }
  function copyGuard(event) { if (state.guardActive) { event.preventDefault(); toast("Không được sao chép nội dung trong khi làm bài.", "error"); } }
  function examKeyGuard(event) {
    if (!state.guardActive) return;
    const blocked = (event.ctrlKey || event.metaKey) && ["c", "x", "p", "s", "u"].includes(event.key.toLowerCase());
    if (blocked || event.key === "F12") { event.preventDefault(); toast("Phím tắt này bị khóa trong khi làm bài.", "error"); }
  }

  async function registerViolation(message) {
    if (!state.guardActive || state.guardBusy || Date.now() < state.ignoreGuardUntil || state.activeAttempt?.submitting) return;
    state.guardBusy = true;
    try {
      const data = await api("report-violation", { attemptId: state.activeAttempt.id, answers: state.answers });
      state.activeAttempt.warning_count = data.warning_count;
      const count = document.getElementById("warning-count"); if (count) count.textContent = `${data.warning_count}/3`;
      if (data.auto_submitted) {
        state.result = data.result; cleanupExam(); closeModal();
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => null);
        renderResult(); return;
      }
      openModal(`Cảnh báo ${data.warning_count}/3`, `<p style="margin:0;color:var(--muted);font-size:.82rem;line-height:1.7">${esc(message)} Nếu nhận đủ 3 cảnh báo, hệ thống sẽ tự động nộp bài.</p><div class="form-actions"><button class="btn btn-primary" id="continue-exam">Tiếp tục làm bài</button></div>`);
      document.getElementById("continue-exam").addEventListener("click", async () => {
        closeModal(); state.ignoreGuardUntil = Date.now() + 1800;
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen().catch(() => null);
      });
    } catch (error) { toast("Không thể ghi nhận cảnh báo. Hệ thống sẽ thử lại.", "error"); }
    finally { setTimeout(() => { state.guardBusy = false; }, 1200); }
  }

  function cleanupExam() {
    state.guardActive = false;
    clearInterval(state.timerId); clearInterval(state.autosaveId);
    state.timerId = null; state.autosaveId = null;
    unbindExamGuards();
    document.body.classList.remove("exam-mode");
  }

  function renderResult(filter = "all") {
    const result = state.result; if (!result) return go("home");
    const percent = Math.min(100, Math.max(0, result.score / result.total_points * 100));
    const filtered = result.review.filter((item) => filter === "all" || (filter === "correct" ? item.is_correct : !item.is_correct));
    document.body.className = "";
    app.innerHTML = `<main class="result-page"><header class="result-head"><div class="result-head-inner"><div><h1>Kết quả bài kiểm tra</h1><p>${esc(result.exam_title)}</p></div><a class="btn btn-secondary" href="#/home">Về danh sách bài</a></div></header><div class="result-content"><section class="score-panel"><div class="score-ring" style="--score:${percent}%"><div><strong>${Number(result.score).toFixed(2)}</strong><span>trên ${result.total_points} điểm</span></div></div><div class="score-copy"><h2>${result.correct_count >= 48 ? "Kết quả tốt" : result.correct_count >= 36 ? "Đã nắm được phần lớn nội dung" : "Cần ôn lại các phần còn sai"}</h2><p>Kết quả chỉ hiển thị trong phiên hiện tại. Hệ thống không lưu đáp án chi tiết sau khi bạn rời trang.</p><div class="score-stats"><div class="score-stat"><span>Trả lời đúng</span><strong>${result.correct_count}/60</strong></div><div class="score-stat"><span>Trả lời sai</span><strong>${60 - result.correct_count}/60</strong></div><div class="score-stat"><span>Lý do nộp</span><strong>${result.automatic_reason === "time" ? "Hết giờ" : result.automatic_reason === "violations" ? "3 cảnh báo" : "Chủ động"}</strong></div></div></div></section>
      <div class="review-toolbar"><h2>Xem lại từng câu</h2><div class="review-filters"><button class="filter-pill ${filter === "all" ? "active" : ""}" data-filter="all">Tất cả</button><button class="filter-pill ${filter === "correct" ? "active" : ""}" data-filter="correct">Câu đúng</button><button class="filter-pill ${filter === "wrong" ? "active" : ""}" data-filter="wrong">Câu sai</button></div></div><div class="review-list">${reviewList(filtered)}</div></div></main>`;
    document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => renderResult(button.dataset.filter)));
  }

  function reviewGroupCode(item) {
    if (item.group_code) return item.group_code;
    return state.activeExam?.questions?.find((question) => question.number === item.number)?.group_code || "";
  }

  function reviewList(items) {
    const parts = [];
    let index = 0;
    while (index < items.length) {
      const item = items[index];
      const groupCode = reviewGroupCode(item);
      if (!groupCode) {
        parts.push(reviewItem(item));
        index += 1;
        continue;
      }
      const groupItems = [];
      while (index < items.length && reviewGroupCode(items[index]) === groupCode) {
        groupItems.push(items[index]);
        index += 1;
      }
      parts.push(reviewGroup(groupCode, groupItems));
    }
    return parts.join("");
  }

  function reviewGroup(groupCode, visibleItems) {
    const passage = state.activeExam?.passages?.find((item) => item.group_code === groupCode);
    const allItems = state.result?.review?.filter((item) => reviewGroupCode(item) === groupCode) || visibleItems;
    const numbers = allItems.map((item) => Number(item.number)).filter(Number.isFinite).sort((a, b) => a - b);
    const first = numbers[0] || visibleItems[0]?.number || "";
    const last = numbers[numbers.length - 1] || visibleItems[visibleItems.length - 1]?.number || first;
    const correctCount = allItems.filter((item) => item.is_correct).length;
    const headingId = `review-group-${String(groupCode).replace(/[^a-z0-9_-]/gi, "")}`;
    return `<section class="review-group" aria-labelledby="${headingId}"><header class="review-passage"><div class="review-passage-copy"><div class="review-passage-meta"><span class="review-passage-label">Tình huống ${esc(groupCode)}</span><span class="review-passage-range">Câu ${first}–${last}</span></div><h3 id="${headingId}">Đọc lại tình huống dùng chung</h3>${passage?.content ? `<p>${esc(passage.content)}</p>` : ""}</div><div class="review-group-score" aria-label="${correctCount} trên ${allItems.length} câu đúng"><strong>${correctCount}/${allItems.length}</strong><span>câu đúng</span></div></header><div class="review-group-items">${visibleItems.map(reviewItem).join("")}</div></section>`;
  }

  function reviewItem(item) {
    return `<article class="review-item ${item.is_correct ? "correct" : "wrong"}"><div class="review-title"><span class="review-badge">${item.number}</span><p>${esc(item.stem)}</p></div><div class="review-answer"><div class="answer-box"><span>Bạn trả lời</span>${esc(item.user_answer_display || "Không trả lời")}</div><div class="answer-box"><span>Đáp án đúng</span>${esc(item.correct_answer_display)}</div></div>${item.explanation ? `<div class="review-explanation"><strong>Giải thích:</strong> ${esc(item.explanation)}</div>` : ""}</article>`;
  }

  app.innerHTML = `<div class="boot-screen"><img src="assets/brand-mark.svg" width="52" height="52" alt=""><div class="boot-line"><span></span></div><p>Đang mở hệ thống</p></div>`;
  initialize().catch((error) => { app.innerHTML = `<div class="boot-screen"><p>${esc(error.message)}</p></div>`; });
})();
