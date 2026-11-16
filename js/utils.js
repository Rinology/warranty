const Utils = {
    MAX_FILE_SIZE: 3 * 1024 * 1024,

    showAlert: function (message, callback) {
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
    },

    formatPhone: function (val) {
        let v = val.replace(/[^0-9]/g, '');
        if (v.length > 3 && v.length <= 7) v = v.slice(0, 3) + "-" + v.slice(3);
        else if (v.length > 7) v = v.slice(0, 3) + "-" + v.slice(3, 7) + "-" + v.slice(7);
        return v.slice(0, 13);
    },

    sanitizeNumeric: function (val) {
        return val.replace(/[^0-9]/g, '');
    },

    isValidImageFile: function (file) {
        if (!file) return false;
        const validTypes = ['image/jpeg', 'image/png'];
        const validExt = /\.(jpe?g|png)$/i.test(file.name || '');
        return validTypes.includes(file.type) && validExt;
    },

    compressImage: function (fileOrDataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // 리사이즈 (가로 최대 800px로 제한하여 용량 최적화)
                const MAX_WIDTH = 800;
                let width = img.width;
                let height = img.height;
                if (width > MAX_WIDTH) {
                    height = Math.floor(height * (MAX_WIDTH / width));
                    width = MAX_WIDTH;
                }
                canvas.width = width;
                canvas.height = height;

                // 백그라운드를 흰색으로 채움 (투명 PNG 방지)
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                // JPEG 포맷으로 압축 (품질 0.7) 설정하여 Base64 반환
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = reject;

            if (typeof fileOrDataUrl === 'string') {
                img.src = fileOrDataUrl;
            } else {
                const reader = new FileReader();
                reader.onload = function (e) {
                    img.src = e.target.result;
                };
                reader.readAsDataURL(fileOrDataUrl);
            }
        });
    }
};
