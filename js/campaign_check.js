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
    const btnCampaignCheck = document.getElementById("btnCampaignCheck");
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
                checkCampaign();
            }
        });
    }

    if (btnCampaignCheck) {
        btnCampaignCheck.addEventListener("click", checkCampaign);
    }

    async function checkCampaign() {
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
        btnCampaignCheck.disabled = true;
        btnCampaignCheck.innerText = "진단 중...";
        loadingArea.style.display = "flex";

        // 실제 API 연동 (GAS 백엔드 호출)
        try {
            const response = await RegAPI.checkCampaign(val);
            
            loadingArea.style.display = "none";
            btnCampaignCheck.disabled = false;
            btnCampaignCheck.innerText = "진단하기";
            resultBox.style.display = "block";

            if (response.status === "danger") {
                // 대상 (무상 점검 대상 - 긍정적인 혜택의 느낌으로 따뜻한 오렌지 톤)
                resultBox.style.backgroundColor = "#fff3e0";
                resultBox.style.border = "1px solid #ff9800";
                resultBox.innerHTML = `
                    <h3 style="color:#e65100; text-align:center; margin-bottom:10px; font-weight:900;">무상 예방 점검 대상입니다</h3>
                    <p style="color:#5d4037; font-size:14px; line-height:1.5; text-align:center; font-weight:700; margin-bottom:15px;">
                        안전하고 쾌적한 라이딩을 위해<br>카카오톡 상담 후 안전성 진단을 꼭 받아보세요!
                    </p>
                    <div style="text-align:center; margin-top:20px;">
                        <a href="#" class="kakao-btn" style="display:inline-block; padding: 12px 20px; text-decoration:none; margin-bottom:0;" onclick="window.copyAndGoKakao(event, '${val}')">카카오톡 채널 상담 및 수리 예약하기</a>
                    </div>
                `;
            } else if (response.status === "safe") {
                // 안전 (비대상 - 차분하고 안정적인 민트/그레이 톤)
                resultBox.style.backgroundColor = "#f0fdf4";
                resultBox.style.border = "1px solid #86efac";
                resultBox.innerHTML = `
                    <h3 style="color:#166534; text-align:center; margin-bottom:10px; font-weight:900;">무상 점검 대상이 아닙니다</h3>
                    <p style="color:#14532d; font-size:14px; line-height:1.5; text-align:center; font-weight:700; margin-bottom:0;">
                        고객님의 제품은 본 캠페인의 예방 점검 대상 모델이 아닙니다.<br>안심하고 즐거운 라이딩을 이어가세요!
                    </p>
                `;
            } else if (response.status === "unknown") {
                // 미확인 (단순 안내 - 중립적인 그레이/블루 톤)
                resultBox.style.backgroundColor = "#f8fafc";
                resultBox.style.border = "1px solid #cbd5e1";
                resultBox.innerHTML = `
                    <h3 style="color:#334155; text-align:center; margin-bottom:10px; font-weight:900;">정보를 찾을 수 없습니다</h3>
                    <p style="color:#475569; font-size:14px; line-height:1.6; text-align:center; font-weight:700; margin-bottom:15px; word-break:keep-all;">
                        입력하신 번호와 일치하는 차대번호가 없습니다.<br>
                        오타가 있을 수 있으니 다시 한 번 확인해 주세요.
                    </p>
                    <div style="text-align:center; margin-top:20px;">
                        <a href="#" class="kakao-btn" style="display:inline-block; padding: 12px 20px; text-decoration:none; margin-bottom:0;" onclick="window.copyAndGoKakao(event, '${val}')">카카오톡 채널로 문의하기</a>
                    </div>
                `;
            } else {
                alert(response.message || "알 수 없는 오류가 발생했습니다.");
                resultBox.style.display = "none";
            }

        } catch (error) {
            loadingArea.style.display = "none";
            btnCampaignCheck.disabled = false;
            btnCampaignCheck.innerText = "진단하기";
            alert("조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.\n" + error.message);
        }
    }
});
