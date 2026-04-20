/**
 * 제품 등록 내역 조회 페이지 로직
 */

document.addEventListener("DOMContentLoaded", function () {
    const btnSearch = document.getElementById("btnSearch");
    const nameInput = document.getElementById("nameInput");
    const phoneInput = document.getElementById("phoneInput");
    const resultContainer = document.getElementById("resultContainer");
    const msgBox = document.getElementById("msgBox");
    const countMsg = document.getElementById("countMsg");
    const loadingArea = document.getElementById("loadingArea");

    if (btnSearch) btnSearch.addEventListener("click", searchData);

    if (phoneInput) {
        phoneInput.addEventListener('input', function (e) {
            let val = e.target.value.replace(/[^0-9]/g, '');
            if (val.length > 3 && val.length <= 7) val = val.slice(0, 3) + "-" + val.slice(3);
            else if (val.length > 7) val = val.slice(0, 3) + "-" + val.slice(3, 7) + "-" + val.slice(7);
            e.target.value = val.slice(0, 13);
        });
    }

    // URL 파라미터 처리
    const urlParams = new URLSearchParams(window.location.search);
    const pName = urlParams.get('name');
    const pPhone = urlParams.get('phone');
    if (pName && pPhone) {
        nameInput.value = pName;
        phoneInput.value = pPhone;
        // [수정] 데이터 전파 시간 고려하여 1.5초 대기 후 조회
        setTimeout(searchData, 1500);
    }

    // [New] 커스텀 알림창 표시 함수
    function showAlert(message) {
        const modal = document.getElementById('systemAlert');
        const msgBox = document.getElementById('systemAlertMsg');
        const btn = document.getElementById('systemAlertBtn');
        if (modal && msgBox && btn) {
            msgBox.innerHTML = message.replace(/\n/g, "<br>");
            modal.style.display = 'flex';
            btn.onclick = function () { modal.style.display = 'none'; };
        } else {
            alert(message); // 만약 모달 요소가 없으면 기본 alert 사용
        }
    }

    let isSearching = false; // 중복 호출 방지 플래그

    function searchData() {
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();

        // [수정] 기본 alert 대신 커스텀 모달 사용
        if (!name || !phone) return showAlert("이름과 연락처를 모두 입력해주세요.");

        // 이미 조회 중이면 중복 호출 무시
        if (isSearching) return;
        isSearching = true;

        resultContainer.innerHTML = "";
        countMsg.style.display = "none";
        msgBox.style.display = "none";
        loadingArea.style.display = "flex";
        document.getElementById("waitText").innerText = "";
        btnSearch.disabled = true;
        btnSearch.style.backgroundColor = "#eee";

        getRecaptchaToken('searchData').then(token => {
            document.getElementById("waitText").innerText = "";
            const headers = { 'x-recaptcha-token': token };
            return fetchWithRetry(API_URL + "?type=search&name=" + encodeURIComponent(name) + "&phone=" + encodeURIComponent(phone), { headers }, 3);
        })
            .then(res => {
                loadingArea.style.display = "none";
                btnSearch.disabled = false;
                btnSearch.style.backgroundColor = ""; // 인라인 스타일 제거하여 CSS 기본값으로 복구
                isSearching = false;

                if (res.status === "success") {
                    const list = res.data;
                    resultContainer.innerHTML = ""; // 렌더링 직전 한번 더 초기화 (동시 호출 방어)
                    countMsg.style.display = "block";
                    countMsg.innerText = `총 ${list.length}건의 등록 내역이 있습니다.`;
                    list.forEach((item, index) => createCard(item, list.length - index, list.length));
                } else {
                    msgBox.style.display = "block";
                    msgBox.innerHTML = '<span class="error-text">❌ 일치하는 정보가 없습니다.</span>';
                }
            })
            .catch(e => {
                loadingArea.style.display = "none";
                btnSearch.disabled = false;
                btnSearch.style.backgroundColor = ""; // 인라인 스타일 제거하여 CSS 기본값으로 복구
                isSearching = false;
                if (e.message && (e.message.includes("reCAPTCHA") || e.message.includes("보안 토큰"))) {
                    showAlert(e.message);
                } else {
                    msgBox.style.display = "block";
                    msgBox.innerHTML = '<span class="error-text">서버 통신 오류가 발생했습니다.<br>잠시 후 다시 시도해주세요.</span>';
                }
            });
    }

    function createCard(data, index, total) {
        const year = data.year || "2026";
        const dateStr = formatDate(data.date);

        let tFrame = "1년", tMotor = "6개월", tCont = "6개월";
        if (year === "2026") { tFrame = "2년"; tMotor = "1년"; tCont = "6개월"; }

        let specialBadgeHTML = "";
        if (data.isSpecial) {
            specialBadgeHTML = `<span style="display:inline-block; margin-left:5px; padding:3px 6px; background:#e67e22; color:white; border-radius:4px; font-size:11px;">🏅 특별 보증 연장 적용됨</span>`;
        }

        let promoHTML = "";
        const regDate = new Date(data.date);
        const today = new Date();
        const diffDays = Math.ceil(Math.abs(today - regDate) / (1000 * 60 * 60 * 24));
        const HEAD_OFFICE_LINK = "https://www.qualisports.kr/product/detail.html?product_no=4644";

        if (year === "2026" && diffDays <= 14) {
            let targetLink = HEAD_OFFICE_LINK;
            if (data.isCredit && data.storeLink) targetLink = data.storeLink;

            const btnId = `promoBtn_${data.id}`;
            promoHTML = `<div id="${btnId}" class="promo-link" data-link="${targetLink}">🎉 특별 구매 혜택 바로가기 (D-${15 - diffDays})</div>`;

            setTimeout(() => {
                const btn = document.getElementById(btnId);
                if (btn) btn.addEventListener("click", function () { handlePromoClick(btn, data); });
            }, 0);
        }

        const cardHTML = `
            <div class="result-card">
            <span class="index-badge"># ${index} / ${total}</span>
            <div style="text-align:center;"><span class="status-badge">✅ 제품 등록 완료</span></div>
            <div class="info-row"><span class="info-label">제품명</span><span class="info-value">${data.product}</span></div>
            <div class="info-row"><span class="info-label">차대번호</span><span class="info-value" style="color:#e74c3c;">${data.serial}</span></div>
            <div class="info-row"><span class="info-label">등록일자</span><span class="info-value">${dateStr}</span></div>
            <div class="info-row"><span class="info-label">구입매장</span><span class="info-value">${data.store}</span></div>
            <div class="warranty-section">
                <div class="warranty-title">
                    <span>🛡️ 제품 보증 기간 ${specialBadgeHTML}</span>
                    <span class="year-badge">${year}년형</span>
                </div>
                <div class="warranty-box">
                <div class="warranty-grid">
                    <div class="w-item"><strong>프레임:</strong> <span>${tFrame}</span></div>
                    <div class="w-item"><strong>모터:</strong> <span>${tMotor}</span></div>
                    <div class="w-item"><strong>컨트롤러:</strong> <span>${tCont}</span></div>
                    <div class="receipt-note">💡 모든 보증은 영수증 날짜 기준입니다.</div>
                </div>
                </div>
            </div>
            ${promoHTML}
            </div>
        `;
        resultContainer.insertAdjacentHTML('beforeend', cardHTML);
    }

    function handlePromoClick(btnElement, data) {
        const targetLink = btnElement.getAttribute("data-link");
        btnElement.innerText = "혜택 페이지로 이동 중... 🔄";
        btnElement.style.backgroundColor = "#ccc";
        btnElement.style.pointerEvents = "none";

        const logData = {
            type: "log_click",
            name: data.name,
            phone: data.phone,
            regId: data.regId || data.id,
            storeName: data.store,
            storeCode: data.storeCode,
            model: data.product
        };

        getRecaptchaToken('promoClick').then(token => {
            return fetchWithRetry(API_URL, {
                method: "POST", 
                headers: { 
                    "Content-Type": "text/plain;charset=utf-8",
                    "x-recaptcha-token": token
                }, 
                body: JSON.stringify(logData)
            }, 2, 500);
        })
            .then(() => { window.open(targetLink, "_blank"); })
            .catch(() => { window.open(targetLink, "_blank"); })
            .finally(() => {
                // 새 창으로 이동 후 버튼을 다시 클릭 가능 상태로 복원
                setTimeout(() => {
                    btnElement.innerText = "🎉 특별 구매 혜택 바로가기";
                    btnElement.style.backgroundColor = "";
                    btnElement.style.pointerEvents = "auto";
                }, 1000);
            });
    }

    function formatDate(d) {
        if (!d) return "-";
        const date = new Date(d);
        return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, '0') + "-" + String(date.getDate()).padStart(2, '0');
    }
});