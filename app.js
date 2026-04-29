console.log("✅-app.js loaded");

//--------------------------------------------------
// CONFIG SUPABASE
//--------------------------------------------------
const SUPABASE_URL = "https://ehquxvfljkecradjkjiz.supabase.co";
const SUPABASE_KEY = "sb_publishable_8XzeOcD_7oB4AwLQldeWLA_wK_giIfQ";

//--------------------------------------------------
// VARIABILE GLOBALE
//--------------------------------------------------
let currentLocation = "Nesetat";
let lastScanTime = 0;
let isScanning = false;
let pendingEntry = null;
let lastScannedID = null;

//--------------------------------------------------
// DETECTARE TIP DIN ID (VERSIUNE FINALĂ)
//--------------------------------------------------
function detectTip(fullIDraw) {

    const fullID = fullIDraw
        .replace(/\0/g, "")
        .replace(/\r/g, "")
        .replace(/\n/g, "")
        .replace(/\t/g, "")
        .replace(/ /g, "")
        .trim()
        .toUpperCase();

    if (fullID.startsWith("HAM_")) return "HAM";
    if (fullID.startsWith("VESTA_")) return "VESTA";
    if (fullID.startsWith("KIT_")) return "KIT";
    if (fullID.startsWith("STING_")) return "STING";
    return "NECUNOSCUT";
}

//--------------------------------------------------
// UPLOAD FOTO ÎN SUPABASE
//--------------------------------------------------
async function uploadPhoto(file, idEchipament) {
    const fileName = `${idEchipament}/${Date.now()}.jpg`;

    const resp = await fetch(
        `${SUPABASE_URL}/storage/v1/object/imagini/${fileName}`,
        {
            method: "POST",
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            },
            body: file
        }
    );

    if (!resp.ok) {
        console.error("❌ Upload foto eșuat:", await resp.text());
        return null;
    }

    return `${SUPABASE_URL}/storage/v1/object/public/imagini/${fileName}`;
}

//--------------------------------------------------
// POPUP HANDLERS
//--------------------------------------------------

function showPopup(entry) {
    pendingEntry = entry;

    document.getElementById("popup-id-echipament").textContent = entry.id_echipament.replace(/^\w+_/, "");
    document.getElementById("popup-tip-echipament").textContent = entry.tip;
    // ------------------------------------------

    document.getElementById("popup-observatii").style.display = "none";
    document.getElementById("obs-text").value = "";
    document.getElementById("photo-preview").style.display = "none";
    document.getElementById("btn-delete-photo").style.display = "none";
    pendingEntry.photoFile = null;

    document.querySelector(".cn-buttons").style.display = "flex";

    document.getElementById("popup-bg").style.display = "flex";
}
function closePopup() {
    document.getElementById("popup-bg").style.display = "none";
}

//--------------------------------------------------
// CONFORM
//--------------------------------------------------
document.getElementById("btn-conform").onclick = async () => {
    pendingEntry.stare = "conform";
    pendingEntry.observatii = null;
    pendingEntry.poza = null;

    await saveToSupabase(pendingEntry);
    await saveToHistory(pendingEntry);

    addCard({
        ...pendingEntry,
        idDisplay: pendingEntry.id_echipament.replace(/^\w+_/, "")
    });

    closePopup();
};

//--------------------------------------------------
// NECONFORM
//--------------------------------------------------
document.getElementById("btn-neconform").onclick = () => {
    document.querySelector(".cn-buttons").style.display = "none";
    document.getElementById("popup-observatii").style.display = "block";
};

//--------------------------------------------------
// ȘTERGE FOTO
//--------------------------------------------------
document.getElementById("btn-delete-photo").onclick = () => {
    document.getElementById("photo-preview").style.display = "none";
    pendingEntry.photoFile = null;
    document.getElementById("photo-input").value = "";
};

//--------------------------------------------------
// FOTO SELECTARE
//--------------------------------------------------
document.getElementById("btn-photo").onclick = () => {
    document.getElementById("photo-input").click();
};

document.getElementById("photo-input").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    pendingEntry.photoFile = file;

    const preview = document.getElementById("photo-preview");
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";
    document.getElementById("btn-delete-photo").style.display = "block";
};

//--------------------------------------------------
// SALVEAZĂ OBSERVAȚII + FOTO
//--------------------------------------------------
document.getElementById("btn-save-obs").onclick = async () => {
    pendingEntry.stare = "neconform";
    pendingEntry.observatii = document.getElementById("obs-text").value.trim() || null;

    if (pendingEntry.photoFile) {
        const url = await uploadPhoto(pendingEntry.photoFile, pendingEntry.id_echipament);
        pendingEntry.poza = url;
    }

    await saveToSupabase(pendingEntry);
    await saveToHistory(pendingEntry);

    addCard({
        ...pendingEntry,
        idDisplay: pendingEntry.id_echipament.replace(/^\w+_/, "")
    });

    closePopup();
};

//--------------------------------------------------
// SCAN NFC — VARIANTA FINALĂ COMPLETĂ
//--------------------------------------------------
document.getElementById("scanNFC").addEventListener("click", scanNFC);

async function scanNFC() {
    if (isScanning) return;
    isScanning = true;

    document.getElementById("scanStatus").style.display = "block";

    try {
        const reader = new NDEFReader();
        await reader.scan({ keepSessionAlive: true });

        reader.onreading = async (event) => {

            const now = Date.now();
            if (now - lastScanTime < 1500) return;
            lastScanTime = now;

            const raw = new TextDecoder()
                .decode(event.message.records[0].data)
                .replace(/\0/g, "")
                .replace(/\r/g, "")
                .replace(/\n/g, "")
                .replace(/\t/g, "")
                .replace(/ /g, "")
                .trim();

            document.getElementById("scanStatus").style.display = "none";

            if (raw.startsWith("LOC_")) {
                currentLocation = raw.replace("LOC_", "");
                document.getElementById("locatie").textContent = currentLocation;
                alert("✅ Locație setată: " + currentLocation);
                isScanning = false;
                return;
            }

            const id = raw;
            lastScannedID = id;

            const tip = detectTip(id);
            if (tip === "NECUNOSCUT") {
                alert("❌ Tip necunoscut!");
                isScanning = false;
                return;
            }

            const entry = {
                id_echipament: id,
                tip,
                locatie: currentLocation,
                stare: "",
                observatii: null,
                poza: null,
                data_scan: new Date().toLocaleString("ro-RO")
            };

            showPopup(entry);

            isScanning = false;
        };

    } catch (err) {
        alert("Eroare NFC: " + err);
        document.getElementById("scanStatus").style.display = "none";
        isScanning = false;
    }
}

//--------------------------------------------------
// SAVE / UPDATE ECHIPAMENTE 
//--------------------------------------------------
async function saveToSupabase(entry) {

    const payload = {
        id_echipament: entry.id_echipament,
        tip: entry.tip,
        locatie: entry.locatie,
        stare: entry.stare,
        observatii: entry.observatii,
        data_scan: new Date().toISOString(),
        poza: entry.poza || null
    };

    const checkUrl =
        `${SUPABASE_URL}/rest/v1/echipamente?id_echipament=eq.${entry.id_echipament}&select=*`;

    const existing = await fetch(checkUrl, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
        }
    }).then(r => r.json());

    if (existing.length > 0) {

        // ✅ UPDATE
        await fetch(
            `${SUPABASE_URL}/rest/v1/echipamente?id_echipament=eq.${entry.id_echipament}`,
            {
                method: "PATCH",
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            }
        );

    } else {

        // ✅ INSERT
        await fetch(`${SUPABASE_URL}/rest/v1/echipamente`, {
            method: "POST",
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
    }
}

//--------------------------------------------------
// SALVEAZĂ ISTORIC 
//--------------------------------------------------
async function saveToHistory(entry) {
    const payload = {
        id_echipament: entry.id_echipament,
        tip: entry.tip,
        locatie: entry.locatie,
        stare: entry.stare,
        observatii: entry.observatii,
        data_scan: new Date().toISOString(),
        poza: entry.poza || null,
        data_revizie: null
    };

    await fetch(`${SUPABASE_URL}/rest/v1/echipamente_istoric`, {
        method: "POST",
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
}

//--------------------------------------------------
// CARD UI 
//--------------------------------------------------
function addCard(entry) {
    const lista = document.getElementById("lista");
    const card = document.createElement("div");
    card.className = "equip-card";

    card.innerHTML = `
        <div class="equip-id">🧰 ${entry.idDisplay}</div>
        <div class="equip-status">🔖 Tip: ${entry.tip}</div>
        <div class="equip-loc">📍 ${entry.locatie}</div>
        <div class="equip-time">⏱ ${entry.data_scan}</div>
        <div class="equip-status">Stare: ${entry.stare}</div>
        ${entry.observatii ? `<div class="equip-status">✏️ ${entry.observatii}</div>` : ""}
    `;

    lista.prepend(card);
}

//--------------------------------------------------
// LOAD HISTORY 
//--------------------------------------------------
document.getElementById("showHistory").onclick = async () => {
    if (!lastScannedID) {
        alert("Scanează un echipament mai întâi!");
        return;
    }
    await loadHistory(lastScannedID);
};

async function loadHistory(id) {

    const box = document.getElementById("istoric");
    const content = document.getElementById("istoricContent");

    box.style.display = "block";
    content.innerHTML = "<p>Se încarcă istoricul...</p>";

    const url =
        `${SUPABASE_URL}/rest/v1/echipamente_istoric?id_echipament=eq.${id}&select=*`;

    const data = await fetch(url, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
        }
    }).then(r => r.json());

    if (!data || data.length === 0) {
        content.innerHTML = "<p>Nu există istoric.</p>";
        return;
    }

    data.sort((a, b) => new Date(b.data_scan) - new Date(a.data_scan));

    let html = "";

    data.forEach(item => {

        html += `
        <div class="equip-card history-card"
             data-photo="${item.poza || ""}"
             style="border-left: 6px solid ${item.stare === "conform" ? "#16a34a" : "#dc2626"};">

            <div class="equip-id">🧰 ${item.id_echipament.replace(/^\w+_/, "")}</div>

            <div class="equip-status">🔖 Tip: ${item.tip}</div>

            <div class="equip-loc">📍 ${item.locatie}</div>
            <div class="equip-time">⏱ ${item.data_scan}</div>
            <div class="equip-status">Stare: ${item.stare}</div>

            ${item.observatii ? `<div class="equip-status">✏️ ${item.observatii}</div>` : ""}
            ${item.poza ? `<img src="${item.poza}" class="history-photo" 
                style="width:100%;margin-top:10px;border-radius:12px;">` : ""}
        </div>
        `;
    });

    content.innerHTML = html;
}

//--------------------------------------------------
// FULLSCREEN FOTO
//--------------------------------------------------
document.addEventListener("click", (e) => {
    const card = e.target.closest(".history-card");
    if (!card) return;

    const url = card.dataset.photo;
    if (!url) return;

    document.getElementById("fullscreen-img").src = url;
    document.getElementById("fullscreen-bg").style.display = "flex";
});
