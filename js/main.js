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

// 3단계에서 GitHub API 요청과 폼 유효성 검사를 추가한다.
