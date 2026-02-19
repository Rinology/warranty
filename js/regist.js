/**
 * 제품 등록 및 보증 연장 페이지 로직 (Stepper 적용)
 */

// 전역 변수 설정
const MAX_FILE_SIZE = 3 * 1024 * 1024;
let ALL_STORES = [];
let STORE_DATA_MAP = {};
let CURRENT_STEP = 1;
// 차대번호 인증 상태 (false: 미인증, true: 인증완료)
let IS_SERIAL_VERIFIED = false;
window.GLOBAL_RETRY_COUNT = 0;

// 시스템 알림창 표시
function showAlert(message, callback) {
    const modal = document.getElementById('systemAlert');
    const msgBox = document.getElementById('systemAlertMsg');
    const btn = document.getElementById('systemAlertBtn');
    if (modal && msgBox && btn) {
        msgBox.innerHTML = message.replace(/\n/g, "<br>");
        modal.style.display = 'flex';
        btn.onclick = function () { modal.style.display = 'none'; if (callback) callback(); };
    } else {
        alert(message);
        if (callback) callback();
    }
}

// 초기화 및 이벤트 리스너 설정
window.addEventListener("pageshow", function (event) {
    if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
        // 뒤로가기 등으로 돌아왔을 때 안전하게 새로고침
        window.location.reload();
    }
});

document.addEventListener("DOMContentLoaded", function () {
    // 1. 초기 데이터 로드 (제품 목록, 매장 목록)
    fetchWithRetry(API_URL, {}, 3).then(data => {
        const productSelect = document.getElementById("productSelect");
        if (productSelect) updateSelectOptions(productSelect, data.products, "제품 모델 선택");
        ALL_STORES = data.stores;
        STORE_DATA_MAP = {};
        data.stores.forEach(store => { STORE_DATA_MAP[store.name] = store; });
        const storeInput = document.getElementById("storeInput");
        if (storeInput) storeInput.placeholder = "매장명, 대리점명, 주소 검색";
    }).catch(err => console.error("데이터 로딩 실패"));

    // 2. 약관 전체 동의 로직
    const allAgree = document.getElementById("allAgree");
    const agreeItems = document.querySelectorAll(".agree-item");
    if (allAgree) {
        allAgree.addEventListener("change", function () {
            agreeItems.forEach(item => item.checked = allAgree.checked);
        });
    }
    agreeItems.forEach(item => {
        item.addEventListener("change", function () {
            const allChecked = Array.from(agreeItems).every(i => i.checked);
            if (allAgree) allAgree.checked = allChecked;
        });
    });

    // 3. 파일 업로드 미리보기 및 체크
    const receiptFile = document.getElementById("receiptFile");
    const previewImg = document.getElementById("imgPreview");
    if (receiptFile) {
        receiptFile.addEventListener("change", function () {
            if (this.files.length > 0) {
                if (this.files[0].size > MAX_FILE_SIZE) {
                    showAlert("❌ 파일 용량이 3MB를 초과합니다!\n용량을 줄여서 다시 올려주세요.");
                    this.value = ""; previewImg.style.display = "none"; return;
                }
                const reader = new FileReader();
                reader.onload = function (e) { previewImg.src = e.target.result; previewImg.style.display = "block"; }
                reader.readAsDataURL(this.files[0]);
            } else { previewImg.style.display = "none"; }
        });
    }

    // 4. 매장 검색 로직
    const storeInput = document.getElementById("storeInput");
    const storeCodeInput = document.getElementById("storeCode");
    const suggestions = document.getElementById("suggestions");
    const infoDisplay = document.getElementById("storeInfoDisplay");

    if (storeInput) {
        storeInput.addEventListener("input", function () {
            const keyword = this.value.toLowerCase().trim();
            suggestions.innerHTML = ""; infoDisplay.style.display = "none";
            if (keyword.length === 0) { suggestions.style.display = "none"; return; }

            const matched = ALL_STORES.filter(store => {
                return store.name.toLowerCase().includes(keyword) ||
                    (store.alias && store.alias.toLowerCase().includes(keyword)) ||
                    (store.addr && store.addr.toLowerCase().includes(keyword)) ||
                    (store.agency && store.agency.toLowerCase().includes(keyword));
            });

            if (matched.length > 0) {
                suggestions.style.display = "block";
                matched.forEach(store => {
                    const li = document.createElement("li");
                    li.innerText = store.agency ? `${store.name} (${store.agency})` : store.name;
                    li.addEventListener("click", function () { selectStore(store); });
                    suggestions.appendChild(li);
                });
            } else {
                suggestions.style.display = "block";
                const li = document.createElement("li");
                li.innerText = "검색 결과가 없습니다.";
                li.className = "no-result-item";
                suggestions.appendChild(li);
            }
        });
    }

    function selectStore(storeObj) {
        storeInput.value = storeObj.name;
        storeCodeInput.value = storeObj.code;
        suggestions.style.display = "none";
        infoDisplay.style.display = "block";
        infoDisplay.innerHTML = `📍 <b>주소:</b> ${storeObj.addr || "없음"}<br>📞 <b>연락처:</b> ${storeObj.phone || "없음"}`;
        storeInput.style.border = "1px solid #ccc";
    }

    document.addEventListener("click", function (e) {
        if (storeInput && !storeInput.contains(e.target) && suggestions && !suggestions.contains(e.target)) {
            suggestions.style.display = "none";
        }
    });

    // 5. 연락처 자동 하이픈
    const phoneInput = document.getElementById("userPhone");
    if (phoneInput) {
        phoneInput.addEventListener('input', function (e) {
            let val = e.target.value.replace(/[^0-9]/g, '');
            if (val.length > 3 && val.length <= 7) val = val.slice(0, 3) + "-" + val.slice(3);
            else if (val.length > 7) val = val.slice(0, 3) + "-" + val.slice(3, 7) + "-" + val.slice(7);
            e.target.value = val.slice(0, 13);
        });
    }

    // 6. 차대번호 조회 및 초기화
    const serialInput = document.getElementById("serialNo");
    const serialError = document.getElementById("serialError");
    const stepBadge = document.getElementById("stepBadge");
    const btnCheckSerial = document.getElementById("btnCheckSerial");
    const btnStep2Next = document.getElementById("btnStep2Next"); // Step 2 다음 버튼

    if (btnCheckSerial) btnCheckSerial.addEventListener("click", runSerialCheck);

    if (serialInput) {
        // 입력값 변경 시 인증 상태 초기화
        serialInput.addEventListener("input", function () {
            IS_SERIAL_VERIFIED = false;
            // 다음 단계 버튼 비활성화 (인증 필요)
            if (btnStep2Next) {
                btnStep2Next.disabled = true;
                btnStep2Next.innerHTML = '먼저 조회해주세요 <span class="arrow">→</span>';
                btnStep2Next.style.backgroundColor = "var(--p-border)";
                btnStep2Next.style.color = "var(--p-text-ghost)";
                btnStep2Next.style.cursor = "not-allowed";
            }
            serialError.style.display = "none";

            // 입력창 하이라이트 복구 (시각적 유도)
            this.classList.add("highlight-input");
            if (stepBadge) stepBadge.style.display = "block";
        });

        serialInput.addEventListener("keypress", function (e) { if (e.key === 'Enter') { e.preventDefault(); runSerialCheck(); } });
    }

    function runSerialCheck() {
        const val = serialInput.value.trim();
        if (val.length < 1) {
            showAlert("차대번호를 입력해주세요.");
            return;
        }

        serialError.style.display = "block";
        serialError.style.color = "var(--p-primary)";
        serialError.innerText = "확인 중...";

        // 버튼 로딩 상태
        btnCheckSerial.disabled = true;
        btnCheckSerial.innerText = "...";

        fetchWithRetry(API_URL + "?type=check&no=" + val, {}, 2).then(d => {
            btnCheckSerial.disabled = false;
            btnCheckSerial.innerText = "조회";

            if (d.status === "ok") {
                IS_SERIAL_VERIFIED = true;
                serialError.style.color = "var(--p-secondary)";
                serialError.innerText = `✅ 확인되었습니다. (${d.model})`;

                // 모델 자동 선택
                const select = document.getElementById("productSelect");
                if (d.model && select) select.value = d.model;

                // 하이라이트 제거
                serialInput.classList.remove("highlight-input");
                if (stepBadge) stepBadge.style.display = "none";

                // 다음 단계 버튼 활성화
                if (btnStep2Next) {
                    btnStep2Next.disabled = false;
                    btnStep2Next.innerHTML = '인증 완료! 다음 단계로 <span class="arrow">→</span>';
                    btnStep2Next.style.backgroundColor = "var(--p-primary)";
                    btnStep2Next.style.color = "#fff";
                    btnStep2Next.style.cursor = "pointer";
                }
            }
            else {
                IS_SERIAL_VERIFIED = false;
                serialError.style.color = "#e74c3c";
                serialError.innerText = "❌ " + d.message;
                // 실패 시 다음 버튼 비활성화 유지
                if (btnStep2Next) {
                    btnStep2Next.disabled = true;
                    btnStep2Next.innerHTML = '조회 실패 <span class="arrow">→</span>';
                    btnStep2Next.style.backgroundColor = "var(--p-border)";
                    btnStep2Next.style.color = "var(--p-text-ghost)";
                }
            }
        }).catch(e => {
            btnCheckSerial.disabled = false;
            btnCheckSerial.innerText = "조회";
            serialError.innerText = "서버 통신 오류. 다시 시도해주세요.";
        });
    }

    // 7. 등록 신청 버튼 (최종)
    const submitBtn = document.querySelector(".submit-btn");
    if (submitBtn) {
        submitBtn.addEventListener("click", submitForm);
    }

    // 8. 상단 뒤로가기 버튼 로직
    const topBackBtn = document.getElementById("topBackBtn");
    if (topBackBtn) {
        topBackBtn.addEventListener("click", function (e) {
            e.preventDefault();
            if (CURRENT_STEP === 1) {
                // 1단계에서는 메인으로 이동 (또는 history.back)
                location.href = './index.html';
            } else {
                // 그 외 단계에서는 이전 단계로 이동
                showStep(CURRENT_STEP - 1);
            }
        });
    }
});

/**
 * Stepper Navigation System
 */
window.nextStep = function (targetStep) {
    // 1단계 -> 2단계 이동 시 유효성 검사 (약관)
    if (targetStep === 2) {
        if (!validateStep1()) return;
    }
    // 2단계 -> 3단계 이동 시 유효성 검사 (차대번호)
    if (targetStep === 3) {
        if (!validateStep2()) return;
    }

    showStep(targetStep);
}

function showStep(step) {
    // 모든 스텝 숨기기
    document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active'));
    // 대상 스텝 보이기
    document.getElementById('step' + step).classList.add('active');

    // 인디케이터 업데이트
    updateStepperIndicator(step);

    // 현재 스텝 업데이트
    CURRENT_STEP = step;

    // 스크롤 최상단으로 (UX)
    window.scrollTo(0, 0);
}

function updateStepperIndicator(step) {
    // 모든 탭 초기화
    document.querySelectorAll('.step-item').forEach(el => {
        el.classList.remove('active', 'complete');
    });

    for (let i = 1; i <= 3; i++) {
        const item = document.getElementById('step' + i + '-tab');
        if (i < step) {
            item.classList.add('complete');
        } else if (i === step) {
            item.classList.add('active');
        }
    }
}

// Step 1 Validation: 약관 동의
function validateStep1() {
    const privacy = document.getElementById("privacyAgree").checked;
    const third = document.getElementById("thirdPartyAgree").checked;
    const transfer = document.getElementById("transferAgree").checked;

    if (!privacy) { showAlert("개인정보 수집 및 이용에 동의해주세요."); return false; }
    if (!third) { showAlert("개인정보 제3자 제공에 동의해주세요."); return false; }
    if (!transfer) { showAlert("개인정보 국외 이전 동의가 필요합니다."); return false; }
    return true;
}

// Step 2 Validation: 차대번호 인증
function validateStep2() {
    const serialNo = document.getElementById("serialNo").value.trim();
    if (!serialNo) { showAlert("차대번호를 입력해주세요."); return false; }
    if (!IS_SERIAL_VERIFIED) { showAlert("차대번호 '조회' 버튼을 눌러 정품 인증을 완료해주세요."); return false; }
    return true;
}

// Helper Functions
function updateSelectOptions(el, items, defText) {
    el.innerHTML = "";
    const opt = document.createElement("option");
    opt.value = ""; opt.text = defText; opt.disabled = true; opt.selected = true; opt.hidden = true;
    el.add(opt);
    if (items) {
        items.forEach(i => { const o = document.createElement("option"); o.value = i; o.text = i; el.add(o); });
    }
}

function setButtonState(e) {
    const submitBtn = document.querySelector(".submit-btn");
    if (submitBtn) {
        submitBtn.disabled = !e;
    }
}

// 최종 폼 제출 Logic
function submitForm() {
    const userName = document.getElementById("userName").value;
    const userPhone = document.getElementById("userPhone").value;
    const product = document.getElementById("productSelect").value;
    const storeName = document.getElementById("storeInput").value;
    const storeCode = document.getElementById("storeCode").value;
    const serialNo = document.getElementById("serialNo").value;

    // 약관 상태 재확인
    const marketingAgree = document.getElementById("marketingAgree").checked;
    const transferAgree = document.getElementById("transferAgree").checked;

    const fileInput = document.getElementById("receiptFile");

    // 최종 유효성 검사 (Step 3) - 다시 한 번 체크
    if (!userName) return showAlert("이름을 입력해주세요.");
    if (!userPhone) return showAlert("전화번호를 입력해주세요.");
    if (!product) return showAlert("제품 모델을 선택해주세요.");
    if (!storeName || !storeCode) return showAlert("구입 매장을 목록에서 정확히 선택해주세요.");
    if (fileInput.files.length === 0) return showAlert("구매 영수증은 필수 항목입니다.");
    if (fileInput.files[0].size > MAX_FILE_SIZE) return showAlert("파일 용량이 3MB를 초과합니다.");

    // 제출 시작
    setButtonState(false);
    document.getElementById("loadingArea").style.display = "flex";
    document.getElementById("waitText").innerText = "잠시만 기다려주세요.";
    window.GLOBAL_RETRY_COUNT = 0;

    // 데이터 패키징
    const formData = {
        userName, userPhone, product, storeName, storeCode, serialNo,
        marketingConsent: marketingAgree,
        transferConsent: transferAgree
    };

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        formData.fileName = file.name;
        formData.mimeType = file.type;
        formData.fileData = e.target.result.split(",")[1];

        fetchWithRetry(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(formData)
        }, 5, 1000)
            .then(res => {
                if (res.result === "success") {
                    showAlert("✅ 제품 등록이 완료되었습니다!\n등록 내역 확인 페이지로 자동 이동합니다.", function () {
                        window.location.href = "./product_check.html?name=" + encodeURIComponent(formData.userName) + "&phone=" + encodeURIComponent(formData.userPhone);
                    });
                } else if (res.message.includes("이미 등록된 제품") && window.GLOBAL_RETRY_COUNT > 0) {
                    // 재시도 메커니즘에 의해 성공한 경우
                    showAlert("✅ (재접속 성공) 제품 등록이 완료되었습니다!\n등록 내역 확인 페이지로 자동 이동합니다.", function () {
                        window.location.href = "./product_check.html?name=" + encodeURIComponent(formData.userName) + "&phone=" + encodeURIComponent(formData.userPhone);
                    });
                } else {
                    showAlert("오류 발생: " + res.message);
                    setButtonState(true);
                    document.getElementById("loadingArea").style.display = "none";
                }
            }).catch(e => {
                showAlert("접속자가 많아 등록에 실패했습니다.\n잠시 후 다시 시도해주세요.");
                setButtonState(true);
                document.getElementById("loadingArea").style.display = "none";
            });
    };
    reader.readAsDataURL(file);
}