console.log("✅ WRITE.JS LOADED");

async function writeNFC(text) {
    try {
        const writer = new NDEFWriter();

        await writer.write({
            records: [{ recordType: "text", data: text }]
        });

        alert("✅ Tag scris cu succes!");
    } catch (err) {
        console.error("Eroare scriere NFC:", err);
        alert("❌ Eroare la scriere: " + err);
    }
}

document.getElementById("writeButton").addEventListener("click", async () => {
    const text = document.getElementById("nfcText").value.trim();

    if (!text) {
        alert("⚠️ Introduceți un text pentru scriere!");
        return;
    }

    alert("📡 Apropie telefonul de tag pentru a-l scrie!");

    await writeNFC(text);
});
