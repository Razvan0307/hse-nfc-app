console.log("✅ WRITE.JS LOADED");

// ✅ Check NFC support
function checkNFCSupport() {
    if (!("NDEFWriter" in window)) {
        alert("❌ Acest dispozitiv NU suportă scriere NFC.\nFuncționează doar pe Android + Chrome.");
        return false;
    }
    return true;
}

// ✅ Validare prefixuri acceptate (opțional)
function validateNFCText(text) {
    const allowed = ["HAM_", "KIT_", "VESTA_", "STING_", "LOC_"];
    const ok = allowed.some(prefix => text.startsWith(prefix));

    if (!ok) {
        return confirm(
            "⚠️ Textul nu începe cu un prefix valid (HAM_, KIT_, VESTA_, STING_, LOC_).\n" +
            "Sigur vrei să scrii acest text?"
        );
    }
    return true;
}

// ✅ SCRIERE NFC
async function writeNFC(text) {
    try {
        const writer = new NDEFWriter();
        await writer.write(text);

        alert("✅ Tag scris cu succes!\n\nConținut: " + text);
    } catch (err) {
        console.error(err);
        alert("❌ Eroare la scriere: " + err);
    }
}

// ✅ ȘTERGERE NFC (scrie un mesaj gol)
async function eraseNFC() {
    try {
        const writer = new NDEFWriter();
        await writer.write(""); // 🔥 scrie un payload gol, efectiv șterge tag-ul

        alert("✅ Tag-ul a fost șters complet!");
    } catch (err) {
        console.error(err);
        alert("❌ Eroare la ștergere: " + err);
    }
}

// ✅ HANDLER pentru SCRIERE TAG
document.getElementById("writeButton").addEventListener("click", async () => {
    const text = document.getElementById("nfcText").value.trim();

    if (!text) {
        alert("⚠️ Introdu textul care va fi scris pe tag!");
        return;
    }

    if (!checkNFCSupport()) return;

    if (!validateNFCText(text)) return;

    document.getElementById("statusBox").innerHTML = `
        <div style="padding:15px; background:#e0e7ff; border-radius:12px;
                    border-left:6px solid #1d4ed8; font-size:18px;">
            📡 Apropie telefonul de tag pentru SCRIERE...
        </div>
    `;

    await writeNFC(text);

    setTimeout(() => {
        document.getElementById("statusBox").innerHTML = "";
    }, 3000);
});

// ✅ HANDLER pentru ȘTERGERE TAG
document.getElementById("eraseButton").addEventListener("click", async () => {
    if (!checkNFCSupport()) return;

    if (!confirm("⚠️ Sigur vrei să ștergi complet tag-ul NFC?\nAceastă acțiune nu poate fi anulată.")) {
        return;
    }

    document.getElementById("statusBox").innerHTML = `
        <div style="padding:15px; background:#fee2e2; border-radius:12px;
                    border-left:6px solid #dc2626; font-size:18px;">
            🧹 Apropie telefonul de tag pentru ȘTERGERE...
        </div>
    `;

    await eraseNFC();

    setTimeout(() => {
        document.getElementById("statusBox").innerHTML = "";
    }, 3000);
});
