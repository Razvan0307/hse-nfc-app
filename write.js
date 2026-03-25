console.log("✅ WRITE.JS LOADED");

// ✅ Verificare dacă device-ul suportă Web NFC
if (!("NDEFWriter" in window)) {
    alert("❌ Dispozitivul tău NU suportă scriere NFC.\nFolosește Android + Chrome.");
}

// ✅ Funcția principală de scriere NFC
async function writeNFC(text) {
    try {
        const writer = new NDEFWriter();

        // ✅ Inițiere scriere
        await writer.write({
            records: [{ recordType: "text", data: text }]
        });

        alert("✅ Tag scris cu succes!\n\nConținut: " + text);

    } catch (err) {
        console.error("Eroare scriere NFC:", err);
        alert("❌ Eroare la scrierea tag-ului:\n" + err);
    }
}

// ✅ Butonul de scriere
document.getElementById("writeButton").addEventListener("click", async () => {
    const text = document.getElementById("nfcText").value.trim();

    if (!text) {
        alert("⚠️ Introduceți un text pentru scriere!");
        return;
    }

    // ✅ Mesaj înainte de scriere
    alert("📡 Apropie telefonul de tag pentru a-l scrie!");

    await writeNFC(text);
});
