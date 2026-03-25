console.log("✅ WRITE.JS LOADED");

// ✅ Check NFC support
function checkNFCSupport() {
    if (!("NDEFWriter" in window)) {
        alert("❌ Acest dispozitiv NU suportă scriere NFC (Android + Chrome necesar)");
        return false;
    }
    return true;
}

// ✅ Validare prefix
function validateNFCText(text) {
    const allowed = ["HAM_", "KIT_", "VESTA_", "STING_", "LOC_"];
    const ok = allowed.some(prefix => text.startsWith(prefix));

    if (!ok) {
        return confirm("⚠️ Textul nu începe cu un prefix valid.\nContinui oricum?");
    }
    return true;
}

// ✅ SCRIERE
async function writeNFC(text) {
    try {
        const writer = new NDEFWriter();
        await writer.write(text);
        alert("✅ Tag scris cu succes!");
    } catch (e) {
        console.error(e);
        alert("❌ Eroare la scriere: " + e);
    }
}

// ✅ ȘTERGERE
async function eraseNFC() {
    try {
        const writer = new NDEFWriter();
        await writer.write("");
        alert("✅ Tag șters complet!");
    } catch (e) {
        console.error(e);
        alert("❌ Eroare la ștergere: " + e);
    }
}

// ✅ Eveniment SCRIERE
document.getElementById("writeButton").addEventListener("click", async () => {
    const text = document.getElementById("nfcText").value.trim();

    if (!text) return alert("⚠️ Introdu textul!");

    if (!checkNFCSupport()) return;
    if (!validateNFCText(text)) return;

    document.getElementById("statusBox").innerHTML = `
        <div style="
            padding:15px;
            background:#e0e7ff;
            border-left:6px solid #1d4ed8;
            border-radius:12px;
            font-size:18px;">
            📡 Apropie telefonul de TAG pentru SCRIERE...
        </div>
    `;

    await writeNFC(text);

    document.getElementById("statusBox").innerHTML = "";
});

// ✅ Eveniment ȘTERGERE
document.getElementById("eraseButton").addEventListener("click", async () => {
    if (!checkNFCSupport()) return;

    if (!confirm("⚠️ Sigur vrei să ȘTERGI complet tag-ul?")) return;

    document.getElementById("statusBox").innerHTML = `
        <div style="
            padding:15px;
            background:#fee2e2;
            border-left:6px solid #dc2626;
            border-radius:12px;
            font-size:18px;">
            🧹 Apropie telefonul de TAG pentru ȘTERGERE...
        </div>
    `;

    await eraseNFC();

    document.getElementById("statusBox").innerHTML = "";
});
