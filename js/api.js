async function getRecaptchaToken(action) {
    // 1. reCAPTCHA 스크립트 로딩 대기 (최대 3초, 500ms 간격)
    let retries = 6;
    while (typeof grecaptcha === 'undefined' && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
        retries--;
    }

    // 2. 끝내 로딩 실패 시 에러 던지기 (API 호출 원천 차단)
    if (typeof grecaptcha === 'undefined') {
        throw new Error('reCAPTCHA 로드 실패. 인터넷 연결을 확인하거나 새로고침 해주세요.');
    }

    // 3. 토큰 발급
    return new Promise((resolve, reject) => {
        grecaptcha.ready(function() {
            grecaptcha.execute(RECAPTCHA_SITE_KEY, {action: action}).then(function(token) {
                if (!token) reject(new Error('보안 토큰 값이 비어있습니다.'));
                resolve(token);
            }).catch((err) => {
                reject(new Error('보안 토큰 발급 실패. 새로고침 후 다시 시도해주세요.'));
            });
        });
    });
}

const RegAPI = {
    fetchInitialData: async function () {
        const token = await getRecaptchaToken('fetchInitialData');
        const headers = { 'x-recaptcha-token': token };
        return fetchWithRetry(API_URL, { headers }, 3);
    },

    checkSerial: async function (serialNo) {
        const token = await getRecaptchaToken('checkSerial');
        const headers = { 'x-recaptcha-token': token };
        return fetchWithRetry(`${API_URL}?type=check&no=${serialNo}`, { headers }, 2);
    },

    checkCampaign: async function (serialNo) {
        const token = await getRecaptchaToken('checkCampaign');
        const headers = { 'x-recaptcha-token': token };
        return fetchWithRetry(`${API_URL}?type=safety_check&no=${serialNo}`, { headers }, 2);
    },

    submitForm: async function (payload) {
        const token = await getRecaptchaToken('submitForm');
        
        // 1단계: Vercel에 업로드 티켓(서명) 요청
        const ticketRes = await fetchWithRetry(API_URL, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "x-recaptcha-token": token
            },
            body: JSON.stringify({ action: "getUploadTicket" })
        }, 3, 1000);

        if (ticketRes.result !== "success" || !ticketRes.gasUrl) {
            throw new Error("업로드 티켓 발급에 실패했습니다.");
        }

        // 2단계: 티켓을 받은 후 FormData를 구성하여 구글 스크립트로 직접(Direct) 전송
        const formData = new FormData();
        for (const key in payload) {
            formData.append(key, payload[key]);
        }
        formData.append("timestamp", ticketRes.timestamp);
        formData.append("token", ticketRes.signature);

        try {
            const response = await fetch(ticketRes.gasUrl, {
                method: "POST",
                body: formData,
                redirect: "follow" // 구글의 302 리다이렉트 대응 (매우 중요)
            });
            const json = await response.json();
            return json;
        } catch (error) {
            throw new Error("서버 전송 중 오류가 발생했습니다.");
        }
    }
};
