/**
 * 제품 등록 및 보증 연장 페이지 메인 로직
 */

document.addEventListener("DOMContentLoaded", function () {
    // 1. 상태 병합 및 초기화
    RegState.init();

    // 2. 초기 데이터 로드 (제품 목록, 매장 목록)
    RegAPI.fetchInitialData().then(data => {
        const productSelect = document.getElementById("productSelect");
        if (productSelect) RegUI.updateSelectOptions(productSelect, data.products, "제품 모델 선택");

        RegState.stores = data.stores;
        data.stores.forEach(store => { RegState.storeDataMap[store.name] = store; });

        const storeInput = document.getElementById("storeInput");
        if (storeInput) storeInput.placeholder = "매장명, 대리점명, 주소 검색";

        // 데이터 로드 후 저장된 상태 적용
        RegUI.applySavedState();
    }).catch(err => console.error("데이터 로딩 실패"));

    // 3. 이벤트 바인딩 - 약관 동의
    const allAgree = document.getElementById("allAgree");
    const agreeItems = document.querySelectorAll(".agree-item");
    if (allAgree) {
        allAgree.addEventListener("change", function () {
            agreeItems.forEach(item => item.checked = allAgree.checked);
            saveAgreeState();
        });
    }
    agreeItems.forEach(item => {
        item.addEventListener("change", function () {
            const allChecked = Array.from(agreeItems).every(i => i.checked);
            if (allAgree) allAgree.checked = allChecked;
            saveAgreeState();
        });
    });

    function saveAgreeState() {
        RegState.formData.service = document.getElementById("serviceAgree").checked;
        RegState.formData.privacy = document.getElementById("privacyAgree").checked;
        RegState.formData.thirdParty = document.getElementById("thirdPartyAgree").checked;
        RegState.formData.transfer = document.getElementById("transferAgree").checked;
        RegState.formData.marketing = document.getElementById("marketingAgree").checked;
        RegState.save();
    }

    // 4. 이벤트 바인딩 - 파일 업로드
    const receiptFile = document.getElementById("receiptFile");
    const previewImg = document.getElementById("imgPreview");
    const receiptPreviewBox = document.getElementById("step3ReceiptPreviewBox");

    if (receiptFile) {
        receiptFile.addEventListener("change", function () {
            if (this.files.length > 0) {
                if (this.files[0].size > Utils.MAX_FILE_SIZE) {
                    Utils.showAlert("❌ 파일 용량이 3MB를 초과합니다!\n용량을 줄여서 다시 올려주세요.");
                    this.value = "";
                    if (receiptPreviewBox) receiptPreviewBox.style.display = "none";
                    return;
                }
                const reader = new FileReader();
                reader.onload = function (e) {
                    previewImg.src = e.target.result;
                    previewImg.style.display = "block"; // CSS의 display:none 덮어쓰기
                    if (receiptPreviewBox) receiptPreviewBox.style.display = "block";
                }
                reader.readAsDataURL(this.files[0]);
            } else {
                if (receiptPreviewBox) receiptPreviewBox.style.display = "none";
            }
        });
    }

    // 5. 이벤트 바인딩 - 매장 검색
    const storeInput = document.getElementById("storeInput");
    const storeCodeInput = document.getElementById("storeCode");
    const suggestions = document.getElementById("suggestions");
    const infoDisplay = document.getElementById("storeInfoDisplay");

    if (storeInput) {
        storeInput.addEventListener("input", function () {
            RegUI.renderStoreSuggestions(this.value.toLowerCase().trim(), storeInput, storeCodeInput, suggestions, infoDisplay);
        });
    }

    document.addEventListener("click", function (e) {
        if (storeInput && !storeInput.contains(e.target) && suggestions && !suggestions.contains(e.target)) {
            suggestions.style.display = "none";
        }
    });

    // 6. 이벤트 바인딩 - 사용자 정보 (전화번호 하이픈 등)
    const phoneInput = document.getElementById("userPhone");
    if (phoneInput) {
        phoneInput.addEventListener('input', function (e) {
            e.target.value = Utils.formatPhone(e.target.value);
            RegState.formData.userPhone = e.target.value;
            RegState.save();
        });
    }

    // 일반 입력 필드 저장
    const saveInput = (id, key) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', function () {
            RegState.formData[key] = this.value;
            RegState.save();
        });
    };
    saveInput('userName', 'userName');
    saveInput('productSelect', 'product');

    // 7. 이벤트 바인딩 - 차대번호
    const serialInput = document.getElementById("serialNo");
    const serialCount = document.getElementById("serialCount");
    const serialError = document.getElementById("serialError");
    const stepBadge = document.getElementById("stepBadge");
    const btnCheckSerial = document.getElementById("btnCheckSerial");
    const btnStep2Next = document.getElementById("btnStep2Next");

    if (serialInput) {
        serialInput.addEventListener("input", function (e) {
            const sanitized = Utils.sanitizeNumeric(this.value);
            if (this.value !== sanitized) this.value = sanitized;

            RegState.formData.serialNo = sanitized;
            RegState.save();

            RegState.isSerialVerified = false;
            if (btnStep2Next) {
                btnStep2Next.disabled = true;
                btnStep2Next.innerHTML = '먼저 조회해주세요 <span class="arrow">→</span>';
                btnStep2Next.style.backgroundColor = "var(--p-border)";
                btnStep2Next.style.color = "var(--p-text-ghost)";
                btnStep2Next.style.cursor = "not-allowed";
            }
            if (serialError) serialError.style.display = "none";

            this.classList.add("highlight-input");
            if (stepBadge) stepBadge.style.display = "block";

            if (serialCount) {
                const len = sanitized.length;
                serialCount.innerText = `${len}자`;
                if (len === 0) {
                    serialCount.style.color = "#888"; serialCount.style.fontWeight = "normal";
                } else if (len < 13) {
                    serialCount.style.color = "#e03131"; serialCount.style.fontWeight = "bold";
                } else {
                    serialCount.style.color = "#2f6286"; serialCount.style.fontWeight = "bold";
                }
            }
        });

        serialInput.addEventListener("keypress", function (e) {
            if (e.key === 'Enter') { e.preventDefault(); runSerialCheck(); }
        });
    }

    if (btnCheckSerial) {
        btnCheckSerial.addEventListener("click", runSerialCheck);
    }


    // 차대번호 사진 첨부 로직 (Step 3 - 영수증 옆에 나란히 위치)
    const serialImageStep3 = document.getElementById("serialImageStep3");
    const step3SerialPreviewBox = document.getElementById("step3SerialPreviewBox");
    const step3SerialPreview = document.getElementById("step3SerialPreview");

    if (serialImageStep3) {
        serialImageStep3.addEventListener("change", async function (e) {
            if (this.files && this.files.length > 0) {
                const file = this.files[0];

                if (file.size > Utils.MAX_FILE_SIZE) {
                    Utils.showAlert("❌ 파일 용량이 3MB를 초과합니다!\n용량을 줄여서 다시 올려주세요.");
                    this.value = "";
                    return;
                }

                try {
                    // 압축하여 메모리 상태에 저장 (로컬스토리지 저장 안 함 — Base64는 용량이 큼서)
                    const compressedBase64 = await Utils.compressImage(file);
                    RegState.serialImageBase64 = compressedBase64;

                    // 썸네일 표출
                    if (step3SerialPreview && step3SerialPreviewBox) {
                        step3SerialPreview.src = compressedBase64;
                        step3SerialPreviewBox.style.display = "block";
                    }
                } catch (error) {
                    console.error("Image compression error:", error);
                    Utils.showAlert("사진 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
                }
            }
        });
    }

    function runSerialCheck() {
        const val = serialInput.value.trim();
        if (val.length < 1) return Utils.showAlert("차대번호를 입력해주세요.");

        serialError.style.display = "block";
        serialError.style.color = "var(--p-primary)";
        serialError.innerText = "확인 중...";
        btnCheckSerial.disabled = true;
        btnCheckSerial.innerText = "...";

        RegAPI.checkSerial(val).then(d => {
            btnCheckSerial.disabled = false;
            btnCheckSerial.innerText = "조회";

            if (d.status === "ok") {
                RegState.isSerialVerified = true;
                serialError.style.color = "var(--p-secondary)";
                serialError.innerText = `✅ 확인되었습니다. (${d.model})`;

                const select = document.getElementById("productSelect");
                if (d.model && select) {
                    select.value = d.model;
                    RegState.formData.product = d.model;
                    RegState.save();
                }

                serialInput.classList.remove("highlight-input");
                if (stepBadge) stepBadge.style.display = "none";

                if (btnStep2Next) {
                    btnStep2Next.disabled = false;
                    btnStep2Next.innerHTML = '인증 완료! 다음 단계로 <span class="arrow">→</span>';
                    btnStep2Next.style.backgroundColor = "var(--p-primary)";
                    btnStep2Next.style.color = "#fff";
                    btnStep2Next.style.cursor = "pointer";
                }
            } else {
                RegState.isSerialVerified = false;
                serialError.style.color = "#e74c3c";
                serialError.innerText = "❌ " + d.message;
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
            if (e.message && (e.message.includes("reCAPTCHA") || e.message.includes("보안 토큰"))) {
                serialError.innerText = "❌ " + e.message;
            } else if (e.status >= 400 && e.status < 500) {
                serialError.innerText = "❌ 조회 권한이 거부되었습니다.";
            } else {
                serialError.innerText = "서버 통신 오류. 다시 시도해주세요.";
            }
        });
    }

    // 8. 제출 로직
    const submitBtn = document.querySelector(".submit-btn");
    if (submitBtn) {
        submitBtn.addEventListener("click", async function () {
            const fileInput = document.getElementById("receiptFile");
            if (!RegValidation.final(fileInput)) return;

            // 차대번호 사진 첨부 여부 확인
            if (!RegState.serialImageBase64) {
                Utils.showAlert("차대번호 사진를 첨부해주세요.\n(영수증 오른쪽 차대번호 사진 란에 업로드)");
                return;
            }

            RegUI.setLoadingState(true);
            document.getElementById("waitText").innerText = "잠시만 기다려주세요.";
            window.GLOBAL_RETRY_COUNT = 0;

            const payload = { ...RegState.formData };
            payload.serviceConsent = payload.service;
            payload.marketingConsent = payload.marketing;
            payload.transferConsent = payload.transfer;

            // 차대번호 사진 Base64 헤더 제거 후 payload 삽입
            payload.serialImageData = RegState.serialImageBase64.split(",")[1];

            const file = fileInput.files[0];

            try {
                let fileDataStr = "";
                // 이미지는 압축(최대 너비 800px), PDF는 원본 그대로 Base64 변환
                if (file.type.startsWith('image/')) {
                    const compressedBase64 = await Utils.compressImage(file);
                    fileDataStr = compressedBase64.split(",")[1];
                } else {
                    fileDataStr = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = e => resolve(e.target.result.split(",")[1]);
                        reader.onerror = () => reject(new Error("파일 읽기 오류"));
                        reader.readAsDataURL(file);
                    });
                }

                payload.fileName = file.name;
                payload.mimeType = file.type;
                payload.fileData = fileDataStr;

                const res = await RegAPI.submitForm(payload);

                if (res.result === "success") {
                    RegState.clear();
                    RegState.serialImageBase64 = null; // 보내고 나면 메모리에서 정리
                    Utils.showAlert("✅ 제품 등록이 완료되었습니다!\n등록 내역 확인 페이지로 자동 이동합니다.", function () {
                        window.location.href = "./product_check.html?name=" + encodeURIComponent(payload.userName) + "&phone=" + encodeURIComponent(payload.userPhone);
                    });
                } else if (res.message && res.message.includes("이미 등록된 제품") && window.GLOBAL_RETRY_COUNT > 0) {
                    RegState.clear();
                    RegState.serialImageBase64 = null;
                    Utils.showAlert("✅ (재접속 성공) 제품 등록이 완료되었습니다!\n등록 내역 확인 페이지로 자동 이동합니다.", function () {
                        window.location.href = "./product_check.html?name=" + encodeURIComponent(payload.userName) + "&phone=" + encodeURIComponent(payload.userPhone);
                    });
                } else {
                    Utils.showAlert("오류 발생: " + res.message);
                    RegUI.setLoadingState(false);
                }

            } catch (e) {
                RegUI.setLoadingState(false);
                if (e.message && (e.message.includes("reCAPTCHA") || e.message.includes("보안 토큰"))) {
                    Utils.showAlert("보안 인증 실패:\n" + e.message);
                } else if (e.status >= 400 && e.status < 500) {
                    Utils.showAlert("❌ 비정상적인 접근이 감지되었거나 잘못된 요청입니다.\n(새로고침 후 다시 시도해주세요.)");
                } else {
                    Utils.showAlert("접속자가 많아 등록에 실패했습니다.\n잠시 후 다시 시도해주세요.");
                }
            }
        });
    }

    // 9. 네비게이션
    const topBackBtn = document.getElementById("topBackBtn");
    if (topBackBtn) {
        topBackBtn.addEventListener("click", function (e) {
            e.preventDefault();
            if (RegState.step === 1) {
                location.href = './index.html';
            } else {
                window.nextStep(RegState.step - 1);
            }
        });
    }
});

// 전역 스코프 함수 유지 (HTML 인라인 이벤트 처리를 위함)
window.nextStep = function (targetStep) {
    if (targetStep === 2 && !RegValidation.step1()) return;
    if (targetStep === 3 && !RegValidation.step2()) return;
    RegUI.showStep(targetStep);
}