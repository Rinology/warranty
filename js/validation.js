const RegValidation = {
    step1: function () {
        if (!RegState.formData.service) { Utils.showAlert("서비스 이용약관에 동의해주세요."); return false; }
        if (!RegState.formData.privacy) { Utils.showAlert("개인정보 수집 및 이용에 동의해주세요."); return false; }
        if (!RegState.formData.thirdParty) { Utils.showAlert("개인정보 제3자 제공에 동의해주세요."); return false; }
        if (!RegState.formData.transfer) { Utils.showAlert("개인정보 국외 이전 동의가 필요합니다."); return false; }
        return true;
    },

    step2: function () {
        if (!RegState.formData.serialNo) { Utils.showAlert("차대번호를 입력해주세요."); return false; }
        if (!RegState.isSerialVerified) { Utils.showAlert("차대번호 '조회' 버튼을 눌러 정품 인증을 완료해주세요."); return false; }
        return true;
    },

    final: function (fileInput) {
        if (!RegState.formData.userName) { Utils.showAlert("이름을 입력해주세요."); return false; }
        if (!RegState.formData.userPhone) { Utils.showAlert("전화번호를 입력해주세요."); return false; }
        if (!RegState.formData.product) { Utils.showAlert("제품 모델을 선택해주세요."); return false; }
        if (!RegState.formData.storeName || !RegState.formData.storeCode) { Utils.showAlert("구입 매장을 목록에서 정확히 선택해주세요."); return false; }
        if (fileInput.files.length === 0) { Utils.showAlert("구매 영수증은 필수 항목입니다."); return false; }
        if (!Utils.isValidImageFile(fileInput.files[0])) { Utils.showAlert("❌ 구매 영수증은 JPG, JPEG, PNG 이미지 파일만 업로드 가능합니다."); return false; }
        if (fileInput.files[0].size > Utils.MAX_FILE_SIZE) { Utils.showAlert("파일 용량이 3MB를 초과합니다."); return false; }
        return true;
    }
};
