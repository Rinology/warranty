// 전역 복사 함수 (HTML 인라인 이벤트에서 호출하기 위함)
window.copyAndGoKakao = function(e, serial) {
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
            btnGoKakao.onclick = function() {
                modal.style.display = 'none';
                window.open('http://pf.kakao.com/_xhxhRZxl/chat', '_blank');
            };
            
            // 닫기(X) 버튼
            if (btnCloseModal) {
                btnCloseModal.onclick = function() {
                    modal.style.display = 'none';
                };
            }
        } else {
            alert("차대번호가 복사되었습니다!\\n카카오톡 채팅창에 '붙여넣기' 해주세요.");
            window.open('http://pf.kakao.com/_xhxhRZxl/chat', '_blank');
        }
    } catch (err) {
        alert("차대번호: " + serial + "\\n수동으로 복사해서 카카오톡에 입력해주세요.");
        window.open('http://pf.kakao.com/_xhxhRZxl/chat', '_blank');
    }
    document.body.removeChild(textArea);
};

document.addEventListener("DOMContentLoaded", function () {
    const btnSafetyCheck = document.getElementById("btnSafetyCheck");
    const serialInput = document.getElementById("serialInput");
    const loadingArea = document.getElementById("loadingArea");
    const resultBox = document.getElementById("resultBox");

    const serialCount = document.getElementById("serialCount");

    if (serialInput) {
        // 숫자만 입력 가능하게 제어 및 글자 수 표시
        serialInput.addEventListener('input', function (e) {
            this.value = this.value.replace(/[^0-9]/g, '');
            
            if (serialCount) {
                const len = this.value.length;
                serialCount.innerText = `${len}/15자`;
                if (len < 15) {
                    serialCount.style.color = "#e74c3c"; // 15자 미만은 빨간색
                } else if (len === 15) {
                    serialCount.style.color = "#3498db"; // 15자 완성 시 파란색
                }
            }
        });

        // 엔터키 입력 시 조회
        serialInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                checkSafety();
            }
        });
    }

    if (btnSafetyCheck) {
        btnSafetyCheck.addEventListener("click", checkSafety);
    }

    async function checkSafety() {
        const val = serialInput.value.trim();
        
        if (!val) {
            alert("차대번호를 입력해주세요.");
            return;
        }
        
        if (val.length !== 15) {
            alert("차대번호 15자리를 정확히 입력해주세요.");
            return;
        }

        // 초기화
        resultBox.style.display = "none";
        resultBox.innerHTML = "";
        btnSafetyCheck.disabled = true;
        btnSafetyCheck.innerText = "진단 중...";
        loadingArea.style.display = "flex";

        // 임시 로컬 테스트용 더미 로직 (실제 배포 전 확인용)
        try {
            // const response = await RegAPI.checkSafety(val);
            
            // 로컬 테스트용 가짜 응답 생성 (1초 로딩 효과)
            await new Promise(resolve => setTimeout(resolve, 1000));
            let response = { status: "unknown" };
            if (val === "111111111111111") {
                response.status = "danger";
            } else if (val === "222222222222222") {
                response.status = "safe";
            }
            
            loadingArea.style.display = "none";
            btnSafetyCheck.disabled = false;
            btnSafetyCheck.innerText = "진단하기";
            resultBox.style.display = "block";

            if (response.status === "danger") {
                // 대상 (위험)
                resultBox.style.backgroundColor = "#fdecea";
                resultBox.style.border = "1px solid #e74c3c";
                resultBox.innerHTML = `
                    <div style="text-align:center; font-size:40px; margin-bottom:10px;">🚨</div>
                    <h3 style="color:#c0392b; text-align:center; margin-bottom:15px; font-weight:900;">안전성 검사 대상입니다.</h3>
                    <div style="text-align:center; margin-top:20px;">
                        <a href="#" class="kakao-btn" style="display:inline-block; padding: 12px 20px; text-decoration:none; margin-bottom:0;" onclick="window.copyAndGoKakao(event, '${val}')">💬 카카오톡 채널 상담 및 수리 예약하기</a>
                    </div>
                `;
            } else if (response.status === "safe") {
                // 안전
                resultBox.style.backgroundColor = "#eafaf1";
                resultBox.style.border = "1px solid #2ecc71";
                resultBox.innerHTML = `
                    <div style="text-align:center; font-size:40px; margin-bottom:10px;">✅</div>
                    <h3 style="color:#27ae60; text-align:center; margin-bottom:0; font-weight:900;">안전성 정상 제품입니다.</h3>
                `;
            } else if (response.status === "unknown") {
                // 미확인
                resultBox.style.backgroundColor = "#fdf2e9";
                resultBox.style.border = "1px solid #e67e22";
                resultBox.innerHTML = `
                    <div style="text-align:center; font-size:40px; margin-bottom:10px;">❓</div>
                    <h3 style="color:#d35400; text-align:center; margin-bottom:15px; font-weight:900;">정보를 찾을 수 없습니다.</h3>
                    <p style="color:#e67e22; font-size:14px; line-height:1.6; text-align:center; font-weight:700;">
                        입력하신 차대번호 내역을 찾을 수 없거나 아직 등록되지 않았습니다.<br>
                        번호를 다시 한 번 확인해 주시거나 카카오톡 채널로 문의해 주세요.
                    </p>
                `;
            } else {
                alert(response.message || "알 수 없는 오류가 발생했습니다.");
                resultBox.style.display = "none";
            }

        } catch (error) {
            loadingArea.style.display = "none";
            btnSafetyCheck.disabled = false;
            btnSafetyCheck.innerText = "진단하기";
            alert("조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.\n" + error.message);
        }
    }
});
