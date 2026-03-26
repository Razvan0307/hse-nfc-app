//--------------------------------------------------
// CONFIG SUPABASE
//--------------------------------------------------
const SUPABASE_URL = "https://rrtyjtbcxgacldniuybn.supabase.co";
const SUPABASE_KEY = "sb_publishable_BgWYudD6xuJbxRuZHt3mHg_35f1e6j6";

//--------------------------------------------------
// VARIABILE GLOBALE
//--------------------------------------------------
let currentLocation = "Nesetat";
let lastScanTime = 0;
let isScanning = false;
let pendingEntry = null;
let lastScannedID = null;

//--------------------------------------------------
// ICONURI TIP ECHIPAMENT
//--------------------------------------------------
function getIconForType(type) {
    switch (type) {
        case "ham": return "🪢";
        case "vesta": return "🦺";
        case "stingator": return "🔥";
        case "kit": return "🧰";
        default: return "❓";
    }
}

//--------------------------------------------------
// UPLOAD FOTO ÎN SUPABASE
//--------------------------------------------------
async function uploadPhoto(file, idEchipament) {
    const fileName = `${idEchipament}_${Date.now()}.jpg`;

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
// BUTOANE
//--------------------------------------------------
document.getElementById("scanNFC").addEventListener("click", scanNFC);
document.getElementById("exportCSV").addEventListener("click", exportCSV);

document.getElementById("clearData").addEventListener("click", () => {
    if (confirm("Sigur vrei să ștergi afișarea locală?")) {
        document.getElementById("lista").innerHTML = "";
    }
});

document.getElementById("showHistory").addEventListener("click", async () => {
    if (!lastScannedID) {
        alert("Scanează un echipament mai întâi!");
        return;
    }
    await loadHistory(lastScannedID);
});

//--------------------------------------------------
// FOTO — selectare + preview
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
// POPUP HANDLERS
//--------------------------------------------------
function showPopup(entry) {
    pendingEntry = entry;

    document.getElementById("popup-observatii").style.display = "none";
    document.getElementById("obs-text").value = "";
    document.getElementById("photo-preview").style.display = "none";
    document.getElementById("btn-delete-photo").style.display = "none";
    pendingEntry.photoFile = null;

    // reafisează butoanele Conform/Neconform
    document.querySelector(".cn-buttons").style.display = "flex";

    document.getElementById("popup-bg").style.display = "flex";
}

function closePopup() {
    document.getElementById("popup-bg").style.display = "none";
    document.getElementById("popup-observatii").style.display = "none";
    pendingEntry.photoFile = null;
}

//--------------------------------------------------
// CONFORM
//--------------------------------------------------
document.getElementById("btn-conform").onclick = async () => {
    pendingEntry.stare = "conform";
    pendingEntry.observatii = "";
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
    document.getElementById("btn-delete-photo").style.display = "none";
    document.getElementById("photo-input").value = "";
    pendingEntry.photoFile = null;
};

//--------------------------------------------------
// SALVARE OBSERVAȚII + FOTO
//--------------------------------------------------
document.getElementById("btn-save-obs").onclick = async () => {
    const obs = document.getElementById("obs-text").value.trim();

    pendingEntry.stare = "neconform";
    pendingEntry.observatii = obs || "Fără observații";

    if (pendingEntry.photoFile) {
        const url = await uploadPhoto(pendingEntry.photoFile, pendingEntry.id_echipament);
        if (url) pendingEntry.poza = url;
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
// DETECTARE TIP
//--------------------------------------------------
function detectTip(id) {
    if (id.startsWith("HAM_")) return "ham";
    if (id.startsWith("VESTA_")) return "vesta";
    if (id.startsWith("STING_")) return "stingator";
    if (id.startsWith("KIT_")) return "kit";
    return "necunoscut";
}

//--------------------------------------------------
// SCAN NFC
//--------------------------------------------------
async function scanNFC() {
    if (isScanning) return;
    isScanning = true;

    document.getElementById("scanStatus").style.display = "block";
    document.getElementById("istoric").style.display = "none";

    try {
        const reader = new NDEFReader();
        await reader.scan({ keepSessionAlive: true });

        reader.onreading = async (event) => {
            event.preventDefault();

            const now = Date.now();
            if (now - lastScanTime < 1500) return;
            lastScanTime = now;

            const rawText = new TextDecoder().decode(event.message.records[0].data).trim();

            if (rawText.startsWith("LOC_")) {
                currentLocation = rawText.replace("LOC_", "");
                document.getElementById("locatie").textContent = currentLocation;
                alert("✅ Locație setată: " + currentLocation);

                isScanning = false;
                document.getElementById("scanStatus").style.display = "none";
                return;
            }

            const id = rawText;
            lastScannedID = id;

            const tip = detectTip(id);
            const timestamp = new Date().toLocaleString("ro-RO");

            const entry = {
                id_echipament: id,
                tip,
                locatie: currentLocation,
                stare: "",
                observatii: "",
                poza: null,
                data_scan: timestamp
            };

            showPopup(entry);

            isScanning = false;
            document.getElementById("scanStatus").style.display = "none";
        };

    } catch (err) {
        console.error(err);
        alert("Eroare NFC: " + err);
        isScanning = false;
    }
}

//--------------------------------------------------
// SAVE / UPDATE ECHIPAMENTE
//--------------------------------------------------
async function saveToSupabase(entry) {
    const checkUrl = `${SUPABASE_URL}/rest/v1/echipamente?id_echipament=eq.${entry.id_echipament}&select=*`;

    const existing = await fetch(checkUrl, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    }).then(r => r.json());

    if (existing.length > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/echipamente?id_echipament=eq.${entry.id_echipament}`, {
            method: "PATCH",
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json",
                Prefer: "return=representation"
            },
            body: JSON.stringify(entry)
        });
    } else {
        await fetch(`${SUPABASE_URL}/rest/v1/echipamente`, {
            method: "POST",
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json",
                Prefer: "return=representation"
            },
            body: JSON.stringify(entry)
        });
    }
}

//--------------------------------------------------
// LISTA PRINCIPALĂ — CU ICON + TIP
//--------------------------------------------------
function addCard(entry) {
    const lista = document.getElementById("lista");
    const card = document.createElement("div");

    const icon = getIconForType(entry.tip);

    card.className = "equip-card";

    card.innerHTML = `
        <div class="equip-id">${icon} ${entry.idDisplay}</div>
        <div class="equip-status">🔖 Tip: ${entry.tip.toUpperCase()}</div>
        <div class="equip-loc">📍 ${entry.locatie}</div>
        <div class="equip-time">⏱ ${entry.data_scan}</div>
        <div class="equip-status">Stare: ${entry.stare}</div>
        ${entry.observatii ? `<div class="equip-status">✏️ Observații: ${entry.observatii}</div>` : ""}
    `;

    lista.prepend(card);
}

//--------------------------------------------------
// SAVE HISTORY
//--------------------------------------------------
async function saveToHistory(entry) {

    const payload = {
        id_echipament: entry.id_echipament,
        locatie: entry.locatie,
        stare: entry.stare,
        observatii: entry.observatii,
        poza: entry.poza || null,
        data_scan: entry.data_scan
    };

    await fetch(`${SUPABASE_URL}/rest/v1/echipamente_istoric`, {
        method: "POST",
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation"
        },
        body: JSON.stringify(payload)
    });
}

//--------------------------------------------------
// LOAD HISTORY — DESCRESCĂTOR + GLOW + THUMBNAIL + SKELETON
//--------------------------------------------------
async function loadHistory(id) {
    const box = document.getElementById("istoric");
    const content = document.getElementById("istoricContent");

    box.style.display = "block";

    // ✅ skeleton loader (3 carduri)
    
content.innerHTML = `
   <div class="skeleton-card"></div>
   <div class="skeleton-card"></div>
 


    const url = `${SUPABASE_URL}/rest/v1/echipamente_istoric?id_echipament=eq.${id}&select=*`;
    const data = await fetch(url, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    }).then(r => r.json());

    if (!data || data.length === 0) {
        content.innerHTML = "<p>Nu există istoric.</p>";
        return;
    }

    // ✅ sortare descrescătoare
    data.sort((a, b) => new Date(b.data_scan) - new Date(a.data_scan));

    let html = "";

    data.forEach(item => {
        const icon = getIconForType(detectTip(item.id_echipament));

        html += `
        <div class="equip-card history-card ${item.stare === 'conform' ? 'conform' : 'neconform'}"
             data-photo="${item.poza || ""}">

            <div class="equip-id">${icon} ${item.id_echipament.replace(/^\w+_/, "")}</div>

            <div class="equip-status">🔖 Tip: ${detectTip(item.id_echipament).toUpperCase()}</div>

            <div class="equip-loc">📍 ${item.locatie}</div>
            <div class="equip-time">⏱ ${item.data_scan}</div>

            <div class="equip-status">Stare: ${item.stare}</div>

            ${item.observatii ? `<div class="equip-status">✏️ Observații: ${item.observatii}</div>` : ""}

            ${item.poza ? ` <img src="${item.poza}" class="history-photo"
                style="width:90px; margin-top:10px; border-radius:10px; cursor:pointer;">` : ""}
        </div>
        `;
    });

    content.innerHTML = html;
}

//--------------------------------------------------
// FULLSCREEN FOTO (click pe thumbnail)
//--------------------------------------------------
document.addEventListener("click", (e) => {

    if (e.target.classList.contains("history-photo")) {
        const full = document.getElementById("fullscreen-bg");
        const img = document.getElementById("fullscreen-img");

        img.src = e.target.src;
        full.style.display = "flex";
    }
});

//--------------------------------------------------
// EXPORT CSV
//--------------------------------------------------
function exportCSV() {
    let csv = "ID,Tip,Locatie,Stare,DataScan,Observatii\n";

    const cards = document.querySelectorAll(".equip-card");
    cards.forEach(card => {
        const lines = card.innerText.split("\n");
        csv += `${lines[0]},${lines[1]},${lines[2]},${lines[3]},${lines[4] || ""}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "echipamente_export.csv";
    a.click();
}
