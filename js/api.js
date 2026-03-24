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

    submitForm: async function (payload) {
        const token = await getRecaptchaToken('submitForm');
        const headers = { 
            "Content-Type": "text/plain;charset=utf-8",
            "x-recaptcha-token": token
        };
        
        return fetchWithRetry(API_URL, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload)
        }, 5, 1000);
    }
};
