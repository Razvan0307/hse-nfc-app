console.log("✅ WRITE.JS LOADED");

async function writeNFC(text) {
    try {
        const writer = new NDEFWriter();
        await writer.write(text);

        alert("✅ Tag scris cu succes!");
    } catch (err) {
        console.error("Eroare scriere NFC:", err);
        alert("❌ Eroare la scrierea tag-ului: " + err);
    }
}

document.getElementById("writeButton").addEventListener("click", async () => {
    const text = document.getElementById("nfcText").value.trim();

    if (!text) {
        alert("Introduceți un text înainte de a scrie!");
        return;
    }

    await writeNFC(text);
});
