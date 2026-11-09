// 전역 복사 함수 (HTML 인라인 이벤트에서 호출하기 위함)
window.copyAndGoKakao = function (e, serial) {
    e.preventDefault(); // 기본 링크 이동 방지
    const text = "입력한 차대번호 : " + serial;

    // 호환성을 위해 구형 방식(textarea) 사용 (가장 안정적이고 동기적으로 작동)
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        document.execCommand('copy');

        // 예쁜 커스텀 모달 띄우기
        const modal = document.getElementById('customCopyModal');
        const btnGoKakao = document.getElementById('btnGoKakao');
        const btnCloseModal = document.getElementById('btnCloseModal');

        if (modal && btnGoKakao) {
            modal.style.display = 'flex';

            // 카카오톡 이동 버튼
            btnGoKakao.onclick = function () {
                modal.style.display = 'none';
                window.open('http://pf.kakao.com/_xhxhRZxl/chat', '_blank');
            };

            // 닫기(X) 버튼
            if (btnCloseModal) {
                btnCloseModal.onclick = function () {
                    modal.style.display = 'none';
                };
            }
        } else {
            alert("차대번호가 복사되었습니다!\n카카오톡 채팅창에 '붙여넣기' 해주세요.");
            window.open('http://pf.kakao.com/_xhxhRZxl/chat', '_blank');
        }
    } catch (err) {
        alert("차대번호: " + serial + "\n수동으로 복사해서 카카오톡에 입력해주세요.");
        window.open('http://pf.kakao.com/_xhxhRZxl/chat', '_blank');
    }
    document.body.removeChild(textArea);
};

document.addEventListener("DOMContentLoaded", function () {
    const btnCampaignCheck = document.getElementById("btnCampaignCheck");
    const serialInput = document.getElementById("serialInput");
    const loadingArea = document.getElementById("loadingArea");
    const resultBox = document.getElementById("resultBox");
    const serialCount = document.getElementById("serialCount");
    const campaignRegistSection = document.getElementById("campaignRegistSection");

    // 접수 폼 요소들
    const userNameInput = document.getElementById("userName");
    const userPhoneInput = document.getElementById("userPhone");
    const storeInput = document.getElementById("storeInput");
    const storeCodeInput = document.getElementById("storeCode");
    const suggestions = document.getElementById("suggestions");
    const storeInfoDisplay = document.getElementById("storeInfoDisplay");

    const serialImageFile = document.getElementById("serialImageFile");
    const serialPreviewBox = document.getElementById("serialPreviewBox");
    const serialPreviewImg = document.getElementById("serialPreviewImg");

    const damageImageFile = document.getElementById("damageImageFile");
    const damagePreviewBox = document.getElementById("damagePreviewBox");
    const damagePreviewImg = document.getElementById("damagePreviewImg");

    const allAgree = document.getElementById("allAgree");
    const agreeItems = document.querySelectorAll(".agree-item");
    const btnSubmitCampaign = document.getElementById("btnSubmitCampaign");
    const submitLoadingArea = document.getElementById("submitLoadingArea");

    // 내부 상태 관리
    let verifiedSerial = "";
    let storeList = [];
    let isStoreLoaded = false;
    let selectedStoreName = "";
    let selectedStoreCode = "";
    let serialImageBase64 = null;
    let damageImageBase64 = null;

    // 대리점 목록 로드 함수 (대상 판별 시 호출)
    async function ensureStoresLoaded() {
        if (isStoreLoaded) return;
        try {
            const data = await RegAPI.fetchInitialData();
            if (data && Array.isArray(data.stores)) {
                storeList = data.stores;
                isStoreLoaded = true;
            }
        } catch (err) {
            console.error("대리점 목록 로딩 실패:", err);
        }
    }

    // 1. 차대번호 입력 제어
    if (serialInput) {
        serialInput.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9]/g, '');

            if (serialCount) {
                const len = this.value.length;
                serialCount.innerText = `${len}/15자`;
                if (len < 15) {
                    serialCount.style.color = "#e74c3c";
                } else if (len === 15) {
                    serialCount.style.color = "#3498db";
                }
            }

            // 인증된 차대번호가 변경되면 접수 폼 숨김 (다른 번호로 위변조 제출 방지)
            if (verifiedSerial && this.value !== verifiedSerial) {
                verifiedSerial = "";
                if (campaignRegistSection) campaignRegistSection.style.display = "none";
                if (resultBox) resultBox.style.display = "none";
            }
        });

        serialInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                checkCampaign();
            }
        });
    }

    if (btnCampaignCheck) {
        btnCampaignCheck.addEventListener("click", checkCampaign);
    }

    // 2. 연락처 하이픈 자동 포맷
    if (userPhoneInput) {
        userPhoneInput.addEventListener("input", function (e) {
            e.target.value = Utils.formatPhone(e.target.value);
        });
    }

    // 3. 대리점 검색 자동완성 (제품등록센터 로직 재활용)
    if (storeInput) {
        storeInput.addEventListener("input", function () {
            const keyword = this.value.toLowerCase().trim();
            selectedStoreName = "";
            selectedStoreCode = "";
            if (storeCodeInput) storeCodeInput.value = "";
            if (storeInfoDisplay) storeInfoDisplay.style.display = "none";
            if (!suggestions) return;

            suggestions.innerHTML = "";
            if (keyword.length === 0) {
                suggestions.style.display = "none";
                return;
            }

            const matched = storeList.filter(store => {
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
                    li.addEventListener("click", () => {
                        storeInput.value = store.name;
                        storeCodeInput.value = store.code;
                        selectedStoreName = store.name;
                        selectedStoreCode = store.code;
                        suggestions.style.display = "none";

                        if (storeInfoDisplay) {
                            storeInfoDisplay.style.display = "block";
                            storeInfoDisplay.innerHTML = "";

                            const addrLabel = document.createElement("b");
                            addrLabel.textContent = "주소:";
                            storeInfoDisplay.append("📍 ", addrLabel, ` ${store.addr || "없음"}`);
                            storeInfoDisplay.appendChild(document.createElement("br"));

                            const phoneLabel = document.createElement("b");
                            phoneLabel.textContent = "연락처:";
                            storeInfoDisplay.append("📞 ", phoneLabel, ` ${store.phone || "없음"}`);
                        }
                        storeInput.style.border = "1px solid #ccc";
                    });
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

    document.addEventListener("click", function (e) {
        if (storeInput && !storeInput.contains(e.target) && suggestions && !suggestions.contains(e.target)) {
            suggestions.style.display = "none";
        }
    });

    // 4. 사진 첨부 및 압축 (차대번호 사진: 필수 / 파손여부 사진: 선택)
    if (serialImageFile) {
        serialImageFile.addEventListener("change", async function () {
            if (this.files && this.files.length > 0) {
                const file = this.files[0];
                if (file.size > Utils.MAX_FILE_SIZE) {
                    Utils.showAlert("❌ 파일 용량이 3MB를 초과합니다!\n용량을 줄여서 다시 올려주세요.");
                    this.value = "";
                    serialImageBase64 = null;
                    if (serialPreviewBox) serialPreviewBox.style.display = "none";
                    return;
                }
                try {
                    const compressed = await Utils.compressImage(file);
                    serialImageBase64 = compressed;
                    if (serialPreviewImg && serialPreviewBox) {
                        serialPreviewImg.src = compressed;
                        serialPreviewBox.style.display = "block";
                    }
                } catch (err) {
                    console.error("차대번호 이미지 압축 오류:", err);
                    Utils.showAlert("사진 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
                }
            } else {
                serialImageBase64 = null;
                if (serialPreviewBox) serialPreviewBox.style.display = "none";
            }
        });
    }

    if (damageImageFile) {
        damageImageFile.addEventListener("change", async function () {
            if (this.files && this.files.length > 0) {
                const file = this.files[0];
                if (file.size > Utils.MAX_FILE_SIZE) {
                    Utils.showAlert("❌ 파일 용량이 3MB를 초과합니다!\n용량을 줄여서 다시 올려주세요.");
                    this.value = "";
                    damageImageBase64 = null;
                    if (damagePreviewBox) damagePreviewBox.style.display = "none";
                    return;
                }
                try {
                    const compressed = await Utils.compressImage(file);
                    damageImageBase64 = compressed;
                    if (damagePreviewImg && damagePreviewBox) {
                        damagePreviewImg.src = compressed;
                        damagePreviewBox.style.display = "block";
                    }
                } catch (err) {
                    console.error("파손여부 이미지 압축 오류:", err);
                    Utils.showAlert("사진 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
                }
            } else {
                damageImageBase64 = null;
                if (damagePreviewBox) damagePreviewBox.style.display = "none";
            }
        });
    }

    // 5. 약관 전체 동의 체크박스 연동
    if (allAgree) {
        allAgree.addEventListener("change", function () {
            agreeItems.forEach(item => { item.checked = allAgree.checked; });
        });
    }
    agreeItems.forEach(item => {
        item.addEventListener("change", function () {
            const allChecked = Array.from(agreeItems).every(i => i.checked);
            if (allAgree) allAgree.checked = allChecked;
        });
    });

    // HTML 이스케이프 헬퍼 (XSS 방어)
    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // 상태 안내 박스 렌더링 헬퍼 (이미 등록된 경우 / 접수 직후 공용)
    function renderRegisteredBox(serial, progressStatus, storeName) {
        const safeStatus = escapeHtml(progressStatus || "접수완료");
        const safeStore = escapeHtml(storeName);
        const safeSerial = escapeHtml(serial).replace(/[^0-9]/g, "");

        const badgeColor = progressStatus === "교체완료"
            ? "#16a34a"
            : (progressStatus === "교체대기" ? "#d97706" : "#2563eb");

        const storeRowHtml = safeStore
            ? `<div style="margin-top: 8px; font-size: 13px; color: #334155;">희망 대리점: <b>${safeStore}</b></div>`
            : "";

        resultBox.style.display = "block";
        resultBox.style.backgroundColor = "#eff6ff";
        resultBox.style.border = "1px solid #93c5fd";
        resultBox.innerHTML = `
            <div style="text-align: center; margin-bottom: 10px;">
                <span style="display: inline-block; padding: 5px 14px; border-radius: 20px; background-color: ${badgeColor}; color: #fff; font-size: 12px; font-weight: 900;">
                    진행 상태: ${safeStatus}
                </span>
            </div>
            <h3 style="color:#1e40af; text-align:center; margin-bottom:10px; font-weight:900;">이미 안전성 검사 접수가 완료된 제품입니다</h3>
            <p style="color:#1e3a8a; font-size:14px; line-height:1.6; text-align:center; font-weight:700; margin-bottom:10px; word-break:keep-all;">
                해당 차대번호는 이미 안전성 검사 신청이 완료되어 중복 등록이 제한됩니다.<br>
                대리점 변경이나 일정 문의가 필요하시면 카카오톡 채널로 문의해 주세요.
            </p>
            <div style="text-align:center;">${storeRowHtml}</div>
            <div style="text-align:center; margin-top:18px;">
                <a href="#" class="kakao-btn" style="display:inline-block; padding: 12px 20px; text-decoration:none; margin-bottom:0;" onclick="window.copyAndGoKakao(event, '${safeSerial}')">카카오톡 채널 상담하기</a>
            </div>
        `;
    }

    // 6. 차대번호 진단하기 실행
    async function checkCampaign() {
        const val = serialInput.value.trim();

        if (!val) {
            Utils.showAlert("차대번호를 입력해주세요.");
            return;
        }

        if (val.length !== 15) {
            Utils.showAlert("차대번호 15자리를 정확히 입력해주세요.");
            return;
        }

        // UI 초기화
        resultBox.style.display = "none";
        resultBox.innerHTML = "";
        if (campaignRegistSection) campaignRegistSection.style.display = "none";
        btnCampaignCheck.disabled = true;
        btnCampaignCheck.innerText = "진단 중...";
        loadingArea.style.display = "flex";

        try {
            const response = await RegAPI.checkCampaign(val);

            loadingArea.style.display = "none";
            btnCampaignCheck.disabled = false;
            btnCampaignCheck.innerText = "진단하기";
            resultBox.style.display = "block";

            if (response.status === "danger") {
                // 1) 캠페인 검사 대상 (미접수 상태 -> 접수 폼 활성화)
                verifiedSerial = val;
                ensureStoresLoaded();

                resultBox.style.backgroundColor = "#fff3e0";
                resultBox.style.border = "1px solid #ff9800";
                resultBox.innerHTML = `
                    <h3 style="color:#e65100; text-align:center; margin-bottom:10px; font-weight:900;">무상 예방 점검(교체) 대상입니다</h3>
                    <p style="color:#5d4037; font-size:14px; line-height:1.6; text-align:center; font-weight:700; margin-bottom:0; word-break:keep-all;">
                        고객님의 제품은 안전성 검사 캠페인 대상입니다.<br>
                        아래 입력란에 <b>교체 희망 대리점과 차대번호 사진</b>을 등록해 주시면 접수가 완료됩니다.
                    </p>
                `;

                if (campaignRegistSection) {
                    campaignRegistSection.style.display = "block";
                    setTimeout(() => {
                        campaignRegistSection.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 100);
                }

            } else if (response.status === "registered") {
                // 2) 캠페인 대상이지만 이미 접수(사용완료)된 상태 -> 중복 등록 차단
                verifiedSerial = "";
                renderRegisteredBox(val, response.progressStatus || "접수완료", response.storeName || "");

            } else if (response.status === "safe") {
                // 3) 정상 제품 (안전성검사 시트에는 없고, 차대번호정보 시트에 있는 정품)
                verifiedSerial = "";
                resultBox.style.backgroundColor = "#f0fdf4";
                resultBox.style.border = "1px solid #86efac";
                resultBox.innerHTML = `
                    <h3 style="color:#166534; text-align:center; margin-bottom:10px; font-weight:900;">본 캠페인 등록 대상이 아닙니다</h3>
                    <p style="color:#14532d; font-size:14px; line-height:1.5; text-align:center; font-weight:700; margin-bottom:0;">
                        고객님의 제품은 본 캠페인의 예방 점검 대상 모델이 아닙니다.<br>안심하고 즐거운 라이딩을 이어가세요!
                    </p>
                `;

            } else if (response.status === "unknown") {
                // 4) 미확인 제품 (두 시트 모두에 없는 번호)
                verifiedSerial = "";
                resultBox.style.backgroundColor = "#f8fafc";
                resultBox.style.border = "1px solid #cbd5e1";
                resultBox.innerHTML = `
                    <h3 style="color:#334155; text-align:center; margin-bottom:10px; font-weight:900;">차대번호를 다시 확인해 주세요</h3>
                    <p style="color:#475569; font-size:14px; line-height:1.6; text-align:center; font-weight:700; margin-bottom:15px; word-break:keep-all;">
                        등록된 제품 목록에서 일치하는 차대번호를 찾을 수 없습니다.<br>
                        오타가 있을 수 있으니 차대번호 15자리를 다시 한 번 확인해 주세요.
                    </p>
                    <div style="text-align:center; margin-top:20px;">
                        <a href="#" class="kakao-btn" style="display:inline-block; padding: 12px 20px; text-decoration:none; margin-bottom:0;" onclick="window.copyAndGoKakao(event, '${val}')">카카오톡 채널로 문의하기</a>
                    </div>
                `;
            } else {
                verifiedSerial = "";
                Utils.showAlert(response.message || "알 수 없는 오류가 발생했습니다.");
                resultBox.style.display = "none";
            }

        } catch (error) {
            loadingArea.style.display = "none";
            btnCampaignCheck.disabled = false;
            btnCampaignCheck.innerText = "진단하기";
            Utils.showAlert("조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.\n" + error.message);
        }
    }

    // 7. 안전성 검사 접수하기 제출
    if (btnSubmitCampaign) {
        btnSubmitCampaign.addEventListener("click", async function () {
            if (!verifiedSerial || serialInput.value.trim() !== verifiedSerial) {
                Utils.showAlert("먼저 차대번호 '진단하기'를 통해 대상 여부를 확인해 주세요.");
                return;
            }

            const userName = userNameInput ? userNameInput.value.trim() : "";
            const userPhone = userPhoneInput ? userPhoneInput.value.trim() : "";

            if (!userName) {
                Utils.showAlert("이름을 입력해 주세요.");
                return;
            }
            if (!userPhone || userPhone.length < 12) {
                Utils.showAlert("연락처를 정확히 입력해 주세요.");
                return;
            }
            if (!selectedStoreName || !selectedStoreCode) {
                Utils.showAlert("교체 희망 대리점을 검색하여 목록에서 정확히 선택해 주세요.");
                return;
            }
            if (!serialImageBase64) {
                Utils.showAlert("차대번호 사진을 첨부해 주세요. (필수 항목)");
                return;
            }

            const privacyChecked = document.getElementById("privacyAgree")?.checked;
            const thirdPartyChecked = document.getElementById("thirdPartyAgree")?.checked;
            const transferChecked = document.getElementById("transferAgree")?.checked;
            const marketingChecked = document.getElementById("marketingAgree")?.checked;

            if (!privacyChecked) {
                Utils.showAlert("개인정보 수집 및 이용 동의(필수)에 체크해 주세요.");
                return;
            }
            if (!thirdPartyChecked) {
                Utils.showAlert("개인정보 제3자 제공 동의(필수)에 체크해 주세요.");
                return;
            }
            if (!transferChecked) {
                Utils.showAlert("개인정보 국외 이전 동의(필수)에 체크해 주세요.");
                return;
            }

            // 전송 시작
            btnSubmitCampaign.disabled = true;
            if (submitLoadingArea) submitLoadingArea.style.display = "flex";
            const waitText = document.getElementById("waitText");
            if (waitText) waitText.innerText = "잠시만 기다려주세요.";
            window.GLOBAL_RETRY_COUNT = 0;

            const payload = {
                type: "safety_submit",
                serialNo: verifiedSerial,
                userName: userName,
                userPhone: userPhone,
                storeName: selectedStoreName,
                storeCode: selectedStoreCode,
                serialImageData: serialImageBase64.split(",")[1],
                damageImageData: damageImageBase64 ? damageImageBase64.split(",")[1] : "",
                transferConsent: transferChecked,
                marketingConsent: marketingChecked
            };

            try {
                const res = await RegAPI.submitForm(payload);

                btnSubmitCampaign.disabled = false;
                if (submitLoadingArea) submitLoadingArea.style.display = "none";

                if (res.result === "success") {
                    const submittedStore = selectedStoreName;
                    const submittedSerial = verifiedSerial;

                    // 폼 숨기고 접수완료 상태 박스로 즉시 전환
                    if (campaignRegistSection) campaignRegistSection.style.display = "none";
                    renderRegisteredBox(submittedSerial, "접수완료", submittedStore);

                    Utils.showAlert("✅ 안전성 검사 접수가 완료되었습니다!\n선택하신 희망 대리점 및 본사 확인 후 순차적으로 안내드리겠습니다.", function () {
                        resultBox.scrollIntoView({ behavior: "smooth", block: "center" });
                    });
                } else if (res.message && res.message.includes("이미 안전성 검사 접수가 완료") && window.GLOBAL_RETRY_COUNT > 0) {
                    const submittedStore = selectedStoreName;
                    const submittedSerial = verifiedSerial;

                    if (campaignRegistSection) campaignRegistSection.style.display = "none";
                    renderRegisteredBox(submittedSerial, "접수완료", submittedStore);

                    Utils.showAlert("✅ (재접속 성공) 안전성 검사 접수가 완료되었습니다!\n선택하신 희망 대리점 및 본사 확인 후 순차적으로 안내드리겠습니다.", function () {
                        resultBox.scrollIntoView({ behavior: "smooth", block: "center" });
                    });
                } else {
                    Utils.showAlert("접수 실패: " + (res.message || "처리 중 오류가 발생했습니다."));
                }
            } catch (e) {
                btnSubmitCampaign.disabled = false;
                if (submitLoadingArea) submitLoadingArea.style.display = "none";
                if (e.message && (e.message.includes("reCAPTCHA") || e.message.includes("보안 토큰"))) {
                    Utils.showAlert("보안 인증 실패:\n" + e.message);
                } else if (e.status >= 400 && e.status < 500) {
                    Utils.showAlert("❌ 비정상적인 접근이 감지되었거나 잘못된 요청입니다.\n(새로고침 후 다시 시도해주세요.)");
                } else {
                    Utils.showAlert("접속자가 많아 전송에 실패했습니다.\n잠시 후 다시 시도해주세요.");
                }
            }
        });
    }
});
