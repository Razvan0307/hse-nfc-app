console.log("✅ WRITE.JS LOADED");

// ✅ Verificare suport NFC
function checkNFCSupport() {
    if (!("NDEFWriter" in window)) {
        alert("❌ Acest dispozitiv nu suportă scriere NFC (Android + Chrome necesar)");
        return false;
    }
    return true;
}

// ✅ Validare text (opțional, pentru echipamente)
function validateNFCText(text) {
    const prefixes = ["HAM_", "KIT_", "VESTA_", "STING_", "LOC_"];
    const ok = prefixes.some(p => text.startsWith(p));

    if (!ok) {
        return confirm("⚠️ Textul nu începe cu un prefix valid.\nContinui?");
    }
    return true;
}

// ✅ SCRIERE TAG NFC
async function writeNFC(text) {
    try {
        const writer = new NDEFWriter();

        // ✅ forma stabilă, compatibilă 100%
        await writer.write(text);

        alert("✅ Tag scris cu succes!\nConținut: " + text);
    } catch (err) {
        console.error(err);
        alert("❌ Eroare la scrierea tagului:\n" + err);
    }
}

// ✅ ȘTERGERE TAG NFC
async function eraseNFC() {
    try {
        const writer = new NDEFWriter();

        // ✅ ștergere = scriere payload gol
        await writer.write("");

        alert("✅ Tag șters complet!");
    } catch (err) {
        console.error(err);
        alert("❌ Eroare la ștergere:\n" + err);
    }
}

// ✅ EVENIMENT SCRIERE
document.getElementById("writeButton").addEventListener("click", async () => {
    const text = document.getElementById("nfcText").value.trim();

    if (!text) return alert("⚠️ Introdu textul!");
    if (!checkNFCSupport()) return;
    if (!validateNFCText(text)) return;

    // ✅ Mesaj vizibil în UI
    document.getElementById("statusBox").innerHTML = `
        <div style="
            padding:15px;
            background:#e0e7ff;
            border-radius:12px;
            border-left:6px solid #1d4ed8;
            font-size:18px;">
            📡 Apropie telefonul de TAG pentru SCRIERE...
        </div>
    `;

    await writeNFC(text);

    document.getElementById("statusBox").innerHTML = "";
});

// ✅ EVENIMENT ȘTERGERE
document.getElementById("eraseButton").addEventListener("click", async () => {
    if (!checkNFCSupport()) return;

    if (!confirm("⚠️ Sigur vrei să ȘTERGI complet tag-ul?")) return;

    document.getElementById("statusBox").innerHTML = `
        <div style="
            padding:15px;
            background:#fee2e2;
            border-radius:12px;
            border-left:6px solid #dc2626;
            font-size:18px;">
            🧹 Apropie telefonul de TAG pentru ȘTERGERE...
        </div>
    `;

    await eraseNFC();

    document.getElementById("statusBox").innerHTML = "";
});
