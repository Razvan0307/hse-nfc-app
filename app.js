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
// UPLOAD FOTO ÎN SUPABASE (bucket: imagini)
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

// ✅ BUTON ISTORIC
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
};

//--------------------------------------------------
// POPUP HANDLERS
//--------------------------------------------------
function showPopup(entry) {
    pendingEntry = entry;

    document.getElementById("popup-observatii").style.display = "none";
    document.getElementById("obs-text").value = "";
    document.getElementById("photo-preview").style.display = "none";
    pendingEntry.photoFile = null;

    document.getElementById("popup-bg").style.display = "flex";
}

function closePopup() {
    document.getElementById("popup-bg").style.display = "none";
    document.getElementById("popup-observatii").style.display = "none";
    document.getElementById("obs-text").value = "";
    document.getElementById("photo-preview").style.display = "none";
    pendingEntry.photoFile = null;
}

// ✅ CONFORM
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

// ✅ NECONFORM
document.getElementById("btn-neconform").onclick = () => {
    document.getElementById("popup-observatii").style.display = "block";
};

// ✅ SALVARE OBSERVAȚII + POZĂ
document.getElementById("btn-save-obs").onclick = async () => {
    const obs = document.getElementById("obs-text").value.trim();

    pendingEntry.stare = "neconform";
    pendingEntry.observatii = obs || "Fără observații";

    // ✅ upload foto dacă există
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

            // ✅ TAG LOCAȚIE
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
            if (tip === "necunoscut") {
                alert("❌ Tag necunoscut!");
                isScanning = false;
                return;
            }

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
// SAVE / UPDATE echipamente
//--------------------------------------------------
async function saveToSupabase(entry) {
    const checkUrl = `${SUPABASE_URL}/rest/v1/echipamente?id_echipament=eq.${entry.id_echipament}&select=*`;

    const existing = await fetch(checkUrl, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
        }
    }).then(r => r.json());

    // ✅ UPDATE
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
    }
    // ✅ INSERT
    else {
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
// ADD CARD (fără poze — varianta A)
//--------------------------------------------------
function addCard(entry) {
    const lista = document.getElementById("lista");
    const card = document.createElement("div");
    card.className = "equip-card";

    card.innerHTML = `
        <div class="equip-id">🧰 ${entry.idDisplay}</div>
        <div class="equip-loc">📍 ${entry.locatie}</div>
        <div class="equip-time">⏱ ${entry.data_scan}</div>
        <div class="equip-status">Stare: ${entry.stare}</div>
        ${entry.observatii ? `<div class="equip-status">✏️ Observații: ${entry.observatii}</div>` : ""}
    `;

    lista.prepend(card);
}

//--------------------------------------------------
// SAVE HISTORY (cu poza)
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

    const resp = await fetch(`${SUPABASE_URL}/rest/v1/echipamente_istoric`, {
        method: "POST",
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation"
        },
        body: JSON.stringify(payload)
    });

    if (!resp.ok) {
        console.error("❌ EROARE SUPABASE HISTORIC:", await resp.text());
    }
}

//--------------------------------------------------
// LOAD HISTORY (cu poză)
//--------------------------------------------------
async function loadHistory(id) {

    const box = document.getElementById("istoric");
    const content = document.getElementById("istoricContent");

    box.style.display = "block";
    content.innerHTML = "<p>Se încarcă istoricul...</p>";

    const url = `${SUPABASE_URL}/rest/v1/echipamente_istoric?id_echipament=eq.${id}&select=*`;

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
        <div class="equip-card" style="border-left: 6px solid ${item.stare === 'conform' ? '#16a34a' : '#dc2626'};">
            <div class="equip-id">🧰 ${item.id_echipament.replace(/^\w+_/, "")}</div>
            <div class="equip-loc">📍 ${item.locatie}</div>
            <div class="equip-time">⏱ ${item.data_scan}</div>
            <div class="equip-status">Stare: ${item.stare}</div>
            ${item.observatii ? `<div class="equip-status">✏️ Observații: ${item.observatii}</div>` : ""}
            ${item.poza ? `${item.poza}` : ""}
        </div>
        `;
    });

    content.innerHTML = html;
}

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
``
