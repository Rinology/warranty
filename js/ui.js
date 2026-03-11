const RegUI = {
    showStep: function (step) {
        document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active'));
        document.getElementById('step' + step).classList.add('active');
        this.updateStepperIndicator(step);
        RegState.step = step;
        window.scrollTo(0, 0);
    },


    updateStepperIndicator: function (step) {
        document.querySelectorAll('.step-item').forEach(el => el.classList.remove('active', 'complete'));
        for (let i = 1; i <= 3; i++) {
            const item = document.getElementById('step' + i + '-tab');
            if (i < step) item.classList.add('complete');
            else if (i === step) item.classList.add('active');
        }
    },

    updateSelectOptions: function (el, items, defText) {
        if (!el) return;
        el.innerHTML = "";
        const opt = document.createElement("option");
        opt.value = ""; opt.text = defText; opt.disabled = true; opt.selected = true; opt.hidden = true;
        el.add(opt);
        if (items) {
            items.forEach(i => { const o = document.createElement("option"); o.value = i; o.text = i; el.add(o); });
        }
        if (RegState.formData.product) el.value = RegState.formData.product;
    },

    renderStoreSuggestions: function (keyword, storeInput, storeCodeInput, suggestions, infoDisplay) {
        suggestions.innerHTML = ""; infoDisplay.style.display = "none";
        if (keyword.length === 0) { suggestions.style.display = "none"; return; }

        const matched = RegState.stores.filter(store => {
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
                    RegState.formData.storeName = store.name;
                    RegState.formData.storeCode = store.code;
                    RegState.save();
                    suggestions.style.display = "none";
                    suggestions.style.display = "none";
                    infoDisplay.style.display = "block";
                    infoDisplay.innerHTML = ""; // Clear existing content safely
                    
                    const addrLabel = document.createElement("b");
                    addrLabel.textContent = "주소:";
                    infoDisplay.append("📍 ", addrLabel, ` ${store.addr || "없음"}`);
                    
                    infoDisplay.appendChild(document.createElement("br"));
                    
                    const phoneLabel = document.createElement("b");
                    phoneLabel.textContent = "연락처:";
                    infoDisplay.append("📞 ", phoneLabel, ` ${store.phone || "없음"}`);
                    
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
    },

    setLoadingState: function (isLoading) {
        const submitBtn = document.querySelector(".submit-btn");
        const loadingArea = document.getElementById("loadingArea");
        if (submitBtn) submitBtn.disabled = isLoading;
        if (loadingArea) loadingArea.style.display = isLoading ? "flex" : "none";
    },

    setOcrLoadingState: function (isLoading) {
        const ocrLoadingArea = document.getElementById("ocrLoadingArea");
        if (ocrLoadingArea) ocrLoadingArea.style.display = isLoading ? "flex" : "none";
    },

    applySavedState: function () {
        const data = RegState.formData;
        if (document.getElementById("serviceAgree")) document.getElementById("serviceAgree").checked = data.service;
        if (document.getElementById("privacyAgree")) document.getElementById("privacyAgree").checked = data.privacy;
        if (document.getElementById("thirdPartyAgree")) document.getElementById("thirdPartyAgree").checked = data.thirdParty;
        if (document.getElementById("transferAgree")) document.getElementById("transferAgree").checked = data.transfer;
        if (document.getElementById("marketingAgree")) document.getElementById("marketingAgree").checked = data.marketing;

        const agreeItems = document.querySelectorAll(".agree-item");
        const allAgree = document.getElementById("allAgree");
        if (allAgree && agreeItems.length > 0) {
            allAgree.checked = Array.from(agreeItems).every(i => i.checked);
        }

        if (document.getElementById("serialNo")) {
            document.getElementById("serialNo").value = data.serialNo;
            const count = document.getElementById("serialCount");
            if (count) count.innerText = `${data.serialNo.length}자`;
        }
        if (document.getElementById("userName")) document.getElementById("userName").value = data.userName;
        if (document.getElementById("userPhone")) document.getElementById("userPhone").value = data.userPhone;
        if (document.getElementById("productSelect") && data.product) document.getElementById("productSelect").value = data.product;
        if (document.getElementById("storeInput")) document.getElementById("storeInput").value = data.storeName;
        if (document.getElementById("storeCode")) document.getElementById("storeCode").value = data.storeCode;

        if (data.storeName && data.storeCode) {
            document.getElementById("storeInput").style.border = "1px solid #ccc";
        }
    }
};
