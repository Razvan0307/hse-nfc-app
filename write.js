console.log("✅ WRITE.JS LOADED");

// ✅ Verifică suport Web NFC pentru scriere
function checkNFCSupport() {
    if (!("NDEFReader" in window)) {
        alert("❌ Acest dispozitiv NU suportă scriere NFC (necesar Android + Chrome)");
        return false;
    }
    return true;
}

// ✅ Validare prefix echipament
function validateNFCText(text) {
    const prefixes = ["HAM_", "KIT_", "VESTA_", "STING_", "LOC_"];
    const ok = prefixes.some(p => text.startsWith(p));

    if (!ok) {
        return confirm("⚠️ Textul nu începe cu un prefix valid.\nContinui?");
    }
    return true;
}

// ✅ SCRIERE TAG — folosind NDEFReader (compatibilitate maximă)
async function writeNFC(text) {
    try {
        const writer = new NDEFReader();

        await writer.write({
            records: [
                {
                    recordType: "text",
                    data: text
                }
            ]
        });

        alert("✅ Tag scris cu succes!\nConținut: " + text);

    } catch (error) {
        console.error("❌ Eroare la scriere:", error);
        alert("❌ Eroare la scrierea tagului:\n" + error);
    }
}

// ✅ ȘTERGERE TAG — golire payload
async function eraseNFC() {
    try {
        const writer = new NDEFReader();

        await writer.write({
            records: [
                {
                    recordType: "text",
                    data: ""
                }
            ]
        });

        alert("✅ Tag șters complet!");

    } catch (error) {
        console.error("❌ Eroare la ștergere:", error);
        alert("❌ Eroare la ștergerea tagului:\n" + error);
    }
}

// ✅ Eveniment SCRIERE
document.getElementById("writeButton").addEventListener("click", async () => {
    const text = document.getElementById("nfcText").value.trim();

    if (!text) return alert("⚠️ Introdu textul!");
    if (!checkNFCSupport()) return;
    if (!validateNFCText(text)) return;

    // Mesaj vizibil
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

// ✅ Eveniment ȘTERGERE
document.getElementById("eraseButton").addEventListener("click", async () => {

    if (!checkNFCSupport()) return;

    if (!confirm("⚠️ Sigur vrei să ștergi complet tag-ul?")) return;

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
