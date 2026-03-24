/**
 * 퀄리스포츠 제품 등록 서비스 - 공통 스크립트
 * 모든 페이지에서 공통적으로 사용되는 상수와 함수를 정의합니다.
 */


const API_URL = "/api/gas-proxy";
const RECAPTCHA_SITE_KEY = "6Lc0MIgsAAAAAAW9nXcixoBAARNh4-xwxWIXOkRi"; 

// Google reCAPTCHA v3 스크립트 동적 로드
const recaptchaScript = document.createElement('script');
recaptchaScript.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
document.head.appendChild(recaptchaScript);



// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    // Check saved preference or system preference
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark-mode');
        document.body.classList.add('dark-mode');
        updateThemeIcon(true);
    } else {
        document.documentElement.classList.remove('dark-mode');
        document.body.classList.remove('dark-mode');
        updateThemeIcon(false);
    }
    updateFooterLogo(document.body.classList.contains('dark-mode'));
}

function updateFooterLogo(isDark) {
    const logo = document.getElementById('footerLogo');
    if (logo) {
        logo.src = isDark ? './images/Xtron_x_Qualisports_Logo_White.png' : './images/Xtron_x_Qualisports_Logo_Black.png';
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    document.documentElement.classList.toggle('dark-mode', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
    updateFooterLogo(isDark);
}

function updateThemeIcon(isDark) {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.innerHTML = isDark ? '☀️' : '🌙';
        btn.setAttribute('aria-label', isDark ? '라이트 모드로 전환' : '다크 모드로 전환');
    }
}

// 모달 제어 함수
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

// Fetch Wrapper (재시도 로직 포함, 토큰 첨부 로직은 제거됨)
async function fetchWithRetry(url, options = {}, retries = 3, backoff = 1000) {


    try {
        // 수정된 url을 그대로 fetch에 넘겨줍니다.
        const response = await fetch(url, options);
        if (!response.ok) {
            // 400번대 에러(클라이언트 오류 및 보안 차단)는 재시도해도 의미가 없으므로 즉각 중지
            if (response.status >= 400 && response.status < 500) {
                let errorMsg = "서버 요청 권한이 없거나 잘못된 요청입니다.";
                try {
                    const errorJson = await response.json();
                    if (errorJson.message) errorMsg = errorJson.message;
                } catch (e) {}
                
                const err = new Error(errorMsg);
                err.status = response.status;
                throw err;
            }
            throw new Error("Server Busy");
        }
        const json = await response.json();
        return json;
    } catch (error) {
        // 이미 400번대 에러로 넘어온 객체(err.status가 있는 경우)는 재시도 건너뜀
        if (retries > 0 && !error.status) {
            const waitText = document.getElementById("waitText");
            if (waitText) waitText.innerText = `접속량이 많아 대기 중입니다... (${retries})`;

            // 글로벌 카운트 변수가 있다면 업데이트 (등록페이지용)
            if (window.GLOBAL_RETRY_COUNT !== undefined) {
                window.GLOBAL_RETRY_COUNT++;
                if (waitText) waitText.innerText = `접속량이 많아 대기 중입니다... (${window.GLOBAL_RETRY_COUNT}회 재시도)`;
            }

            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        } else {
            throw error;
        }
    }
}

// 보안 및 우클릭 방지 (문서 로드 시 자동 실행)
document.addEventListener('DOMContentLoaded', () => {
    initTheme(); // Initialize theme

    // Add Toggle Button Functionality if exists
    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleTheme);
    }

    document.addEventListener("contextmenu", e => e.preventDefault());
    document.addEventListener("dragstart", e => e.preventDefault());
    document.addEventListener("selectstart", e => e.preventDefault());

    document.addEventListener('keydown', function (e) {
        if (e.keyCode === 123 ||
            (e.ctrlKey && e.shiftKey && e.keyCode === 73) ||
            (e.ctrlKey && e.keyCode === 85)) {
            e.preventDefault();
            return false;
        }
    });
});