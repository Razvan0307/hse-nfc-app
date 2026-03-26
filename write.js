console.log("✅ WRITE.JS LOADED");

// ✅ Verifică suport Web NFC
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

// ✅ SCRIERE TAG REALĂ — succesul apare DOAR dacă se finalizează
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

        // ✅ Succes REAL – doar dacă scrierea a reușit
        document.getElementById("statusBox").innerHTML = `
            <div class="success-animation">
                <div class="success-circle">
                    <div class="success-check">✅</div>
                </div>
                <div class="success-text">Scriere reușită!</div>
            </div>
        `;

    } catch (error) {
        console.error("❌ Eroare la scriere:", error);
        alert("❌ Eroare la scrierea tagului:\n" + error);
    }
}

// ✅ ȘTERGERE TAG REALĂ — succesul apare DOAR dacă ștergerea este REALĂ
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

        // ✅ Succes REAL
        document.getElementById("statusBox").innerHTML = `
            <div class="success-animation">
                <div class="success-circle">
                    <div class="success-check">✅</div>
                </div>
                <div class="success-text">Tag șters!</div>
            </div>
        `;

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

    // ✅ Loader doar la apropiere de tag
    document.getElementById("statusBox").innerHTML = `
        <div class="loader"></div>
        Apropie telefonul de TAG pentru SCRIERE...
    `;

    await writeNFC(text);
});

// ✅ Eveniment ȘTERGERE
document.getElementById("eraseButton").addEventListener("click", async () => {

    if (!checkNFCSupport()) return;

    if (!confirm("⚠️ Sigur vrei să ștergi complet tag-ul?")) return;

    // ✅ Loader la ștergere
    document.getElementById("statusBox").innerHTML = `
        <div class="loader"></div>
        Apropie telefonul de TAG pentru ȘTERGERE...
    `;

    await eraseNFC();
});
