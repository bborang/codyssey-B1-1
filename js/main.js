"use strict";

// DOM 선택 → 이벤트 연결 → 상태 변경 → render 함수로 화면 반영.
const root = document.documentElement;
const header = document.querySelector(".site-header");
const menu = document.querySelector("#nav-menu");
const menuButton = document.querySelector("#menu-toggle");
const themeButton = document.querySelector("#theme-toggle");
const topButton = document.querySelector("#scroll-top");
const navLinks = document.querySelectorAll("#nav-menu a");
const desktopQuery = window.matchMedia("(min-width: 768px)");
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const THEME_KEY = "jiyeon-portfolio-theme";
const HEADER_SCROLL = 60;
const TOP_BUTTON_SCROLL = 300;

const state = {
  menuOpen: false,
  theme: "light",
  scrolled: false,
  showTopButton: false,
};

// 브라우저가 저장소 접근을 막아도 현재 화면의 테마 전환은 동작한다.
try {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "dark" || savedTheme === "light") {
    state.theme = savedTheme;
  }
} catch {
  state.theme = "light";
}

const renderTheme = () => {
  const isDark = state.theme === "dark";
  root.dataset.theme = state.theme;
  themeButton.setAttribute("aria-pressed", String(isDark));
  themeButton.setAttribute("aria-label", isDark ? "라이트 모드 켜기" : "다크 모드 켜기");
  themeButton.textContent = isDark ? "☀" : "◐";
};

const renderMenu = () => {
  menu.classList.toggle("active", state.menuOpen);
  menuButton.setAttribute("aria-expanded", String(state.menuOpen));
  menuButton.setAttribute("aria-label", state.menuOpen ? "메뉴 닫기" : "메뉴 열기");
  menuButton.textContent = state.menuOpen ? "×" : "☰";
};

const closeMenu = () => {
  state.menuOpen = false;
  renderMenu();
};

menuButton.addEventListener("click", () => {
  state.menuOpen = !state.menuOpen;
  renderMenu();
});

navLinks.forEach((link) => {
  // 앵커의 기본 동작을 유지해서 주소의 해시와 키보드 탐색도 함께 동작한다.
  link.addEventListener("click", closeMenu);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.menuOpen) {
    closeMenu();
    menuButton.focus();
  }
});

document.addEventListener("click", (event) => {
  if (state.menuOpen && !header.contains(event.target)) closeMenu();
});

// 화면 크기를 바꾸었을 때 모바일 메뉴의 이전 상태가 남지 않도록 초기화한다.
desktopQuery.addEventListener("change", () => {
  const focused = document.activeElement;
  closeMenu();
  if (desktopQuery.matches && focused === menuButton) {
    navLinks[0].focus();
  } else if (!desktopQuery.matches && menu.contains(focused)) {
    menuButton.focus();
  }
});

themeButton.addEventListener("click", () => {
  state.theme = state.theme === "light" ? "dark" : "light";
  renderTheme();
  try {
    localStorage.setItem(THEME_KEY, state.theme);
  } catch {
    // 저장 불가 환경에서는 이번 방문 동안만 선택한 테마를 유지한다.
  }
});

const renderScroll = () => {
  header.classList.toggle("scrolled", state.scrolled);
  topButton.hidden = !state.showTopButton;
};

const updateScroll = () => {
  state.scrolled = window.scrollY >= HEADER_SCROLL;
  state.showTopButton = window.scrollY >= TOP_BUTTON_SCROLL;
  renderScroll();
};

window.addEventListener("scroll", updateScroll, { passive: true });
topButton.addEventListener("click", () => {
  // 이동 후 버튼이 숨겨져도 키보드 포커스는 페이지 시작에 남는다.
  document.querySelector(".logo").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: motionQuery.matches ? "instant" : "smooth" });
});

// 섹션 전체 대신 작은 제목·카드를 관찰하여 긴 모바일 섹션도 등장할 수 있게 한다.
const revealTargets = document.querySelectorAll(".section-heading, .profile, .skill-card, .award");
let revealObserver;

const setupReveal = () => {
  if (revealObserver) revealObserver.disconnect();
  revealTargets.forEach((element) => element.classList.remove("reveal"));
  if (motionQuery.matches || !("IntersectionObserver" in window)) return;

  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(({ isIntersecting, target }) => {
      if (isIntersecting) {
        target.classList.add("is-visible");
        revealObserver.unobserve(target);
      }
    });
  }, { threshold: 0.2 });

  revealTargets.forEach((element) => {
    element.classList.add("reveal");
    revealObserver.observe(element);
  });
};

renderTheme();
renderMenu();
updateScroll();
root.classList.add("interactions-ready");
menuButton.hidden = false;
themeButton.hidden = false;
setupReveal();
motionQuery.addEventListener("change", setupReveal);

// 3. API 요청 → 프로젝트 상태 → 카드 또는 상태 메시지 렌더링.
const projectList = document.querySelector("#project-list");
const projectStatus = document.querySelector("#project-status");
const retryButton = document.querySelector("#retry-projects");
const projectState = { status: "idle", repos: [], error: "" };

// 외부 데이터가 HTML로 해석되지 않도록 텍스트를 이스케이프한다.
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));

const renderProjects = () => {
  const { status, repos, error } = projectState;
  projectList.setAttribute("aria-busy", String(status === "loading"));
  retryButton.hidden = status !== "error";
  retryButton.disabled = status === "loading";
  projectList.innerHTML = "";
  projectStatus.hidden = false;

  if (status === "loading") {
    projectStatus.textContent = "프로젝트를 불러오는 중입니다…";
  } else if (status === "error") {
    projectStatus.textContent = error;
  } else if (repos.length === 0) {
    projectStatus.textContent = "표시할 프로젝트가 없습니다.";
  } else {
    projectStatus.textContent = `${repos.length}개의 공개 프로젝트를 불러왔습니다.`;
    projectList.innerHTML = repos.map(({ name, description, language, stargazers_count }) => `
      <article class="project-card">
        <p class="eyebrow">${escapeHTML(language || "언어 정보 없음")}</p>
        <h3><a href="https://github.com/bborang/${encodeURIComponent(name)}" target="_blank" rel="noopener noreferrer">${escapeHTML(name)} ↗</a></h3>
        <p class="project-description">${escapeHTML(description || "등록된 프로젝트 설명이 없습니다.")}</p>
        <p class="project-meta">GitHub · 스타 ${escapeHTML(stargazers_count ?? 0)}</p>
      </article>
    `).join("");
  }
};

const loadProjects = async () => {
  if (projectState.status === "loading") return;
  projectState.status = "loading";
  projectState.error = "";
  renderProjects();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch("https://api.github.com/users/bborang/repos?sort=updated&per_page=100", {
      signal: controller.signal,
      headers: { Accept: "application/vnd.github+json" },
    });
    // fetch는 HTTP 403/404에서도 resolve되므로 상태 코드를 직접 확인한다.
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        throw new Error("프로젝트를 불러올 수 없습니다. GitHub 요청이 제한되었습니다. 잠시 후 다시 시도해 주세요.");
      }
      throw new Error("프로젝트를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.");
    }
    const repos = await response.json();
    if (!Array.isArray(repos) || !repos.every((repo) => repo && typeof repo.name === "string")) {
      throw new Error("프로젝트를 불러올 수 없습니다. 응답 형식을 확인할 수 없습니다.");
    }
    projectState.repos = repos;
    projectState.status = repos.length === 0 ? "empty" : "success";
  } catch (error) {
    projectState.repos = [];
    projectState.status = "error";
    projectState.error = error.name === "AbortError"
      ? "프로젝트를 불러올 수 없습니다. 응답 시간이 초과되었습니다. 다시 시도해 주세요."
      : error.message.startsWith("프로젝트를 불러올 수 없습니다.")
        ? error.message
        : "프로젝트를 불러올 수 없습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.";
  } finally {
    clearTimeout(timeout);
    renderProjects();
  }
};

retryButton.addEventListener("click", async () => {
  await loadProjects();
  // 재시도 버튼이 사라진 뒤에도 키보드 사용자가 결과를 이어서 읽을 수 있다.
  projectStatus.setAttribute("tabindex", "-1");
  projectStatus.focus({ preventScroll: true });
});
loadProjects();

// 4. 폼 입력 → 유효성 상태 → 필드별 오류와 성공 메시지.
const contactForm = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");
const fields = [...contactForm.querySelectorAll("input, textarea")];
const formState = { errors: {}, success: false };

const validateField = (field) => {
  const value = field.value.trim();
  if (!value) {
    return { name: "이름을 입력해 주세요.", email: "이메일을 입력해 주세요.", message: "메시지를 입력해 주세요." }[field.name];
  }
  if (field.name === "email" && (field.validity.typeMismatch || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) {
    return "올바른 이메일 주소를 입력해 주세요. 예: hello@example.com";
  }
  return "";
};

const renderForm = () => {
  fields.forEach((field) => {
    const error = formState.errors[field.name] || "";
    document.querySelector(`#${field.id}-error`).textContent = error;
    field.setAttribute("aria-invalid", String(Boolean(error)));
  });
  formStatus.textContent = formState.success
    ? "입력이 정상적으로 확인되었습니다. 실제 메시지는 전송되지 않았습니다. 연락은 이메일을 이용해 주세요."
    : "";
};

fields.forEach((field) => {
  field.addEventListener("input", () => {
    formState.success = false;
    // 첫 제출 전에는 입력을 시작한 필드만 검사한다.
    formState.errors[field.name] = validateField(field);
    renderForm();
  });
});

contactForm.addEventListener("submit", (event) => {
  event.preventDefault();
  fields.forEach((field) => {
    formState.errors[field.name] = validateField(field);
  });
  const invalidField = fields.find((field) => formState.errors[field.name]);
  formState.success = !invalidField;
  renderForm();
  if (invalidField) invalidField.focus();
});

// 이벤트 연결 후 기본 검증 팝업 대신 필드 옆 오류를 사용한다.
contactForm.noValidate = true;
contactForm.querySelector('button[type="submit"]').disabled = false;
