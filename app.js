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
    alert("Scanează mai întâi un echipament pentru a vedea istoricul!");
    return;
  }
  await loadHistory(lastScannedID);
});

//--------------------------------------------------
// POPUP HANDLERS
//--------------------------------------------------
function showPopup(entry) {
  pendingEntry = entry;
  document.getElementById("popup-bg").style.display = "flex";
}

function closePopup() {
  document.getElementById("popup-bg").style.display = "none";
  document.getElementById("popup-observatii").style.display = "none";
  document.getElementById("obs-text").value = "";
}

// ✅ CONFORM
document.getElementById("btn-conform").onclick = async () => {
  pendingEntry.stare = "conform";
  pendingEntry.observatii = "";

  await saveToSupabase(pendingEntry);
  addCard({...pendingEntry, idDisplay: pendingEntry.id_echipament.replace(/^\w+_/, "")});
  closePopup();
};

// ✅ NECONFORM → afișăm observații
document.getElementById("btn-neconform").onclick = () => {
  document.getElementById("popup-observatii").style.display = "block";
};

// ✅ SALVEAZĂ OBSERVAȚII
document.getElementById("btn-save-obs").onclick = async () => {
  const obs = document.getElementById("obs-text").value.trim();
  pendingEntry.stare = "neconform";
  pendingEntry.observatii = obs || "Fără observații";

  await saveToSupabase(pendingEntry);
  addCard({...pendingEntry, idDisplay: pendingEntry.id_echipament.replace(/^\w+_/, "")});

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
// FUNCTIE PRINCIPALA: SCAN NFC
//--------------------------------------------------
async function scanNFC() {

  if (isScanning) return;
  isScanning = true;

  document.getElementById("scanStatus").style.display = "block";

  // când scanezi echipament nou, ascunde istoricul
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

      // ✅ SETARE LOCAȚIE
      if (rawText.startsWith("LOC_")) {
        currentLocation = rawText.replace("LOC_", "");
        document.getElementById("locatie").textContent = currentLocation;
        alert("✅ Locație setată: " + currentLocation);

        isScanning = false;
        document.getElementById("scanStatus").style.display = "none";
        return;
      }

      // ✅ ECHIPAMENT
      const id = rawText;
      lastScannedID = id;

      const tip = detectTip(id);
      if (tip === "necunoscut") {
        alert("❌ Tag necunoscut!");
        isScanning = false;
        return;
      }

      const timestamp = new Date().toLocaleString("ro-RO");

      // ✅ ENTRY pentru popup
      const entry = {
        id_echipament: id,
        tip,
        locatie: currentLocation,
        stare: "",
        observatii: "",
        data_scan: timestamp,
        data_revizie: "" 
      };

      // ✅ deschidere popup
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
// SAVE / UPDATE SUPABASE
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
// AFIȘARE CARD
//--------------------------------------------------
function addCard(entry) {
  const lista = document.getElementById("lista");

  const card = document.createElement("div");
  card.className = "equip-card";

  card.innerHTML = `
    <div class="equip-id">🧰 ${entry.idDisplay} (${entry.tip})</div>
    <div class="equip-loc">📍 ${entry.locatie}</div>
    <div class="equip-time">⏱ ${entry.data_scan}</div>
    <div class="equip-status">Stare: ${entry.stare}</div>
    ${entry.observatii ? `<div class="equip-status">✏️ Observații: ${entry.observatii}</div>` : ""}
  `;

  lista.prepend(card);
}

//--------------------------------------------------
// ✅ FUNCȚIE ISTORIC
//--------------------------------------------------
async function loadHistory(id) {

  const box = document.getElementById("istoric");
  const content = document.getElementById("istoricContent");

  box.style.display = "block";
  content.innerHTML = "<p>Se încarcă istoricul...</p>";

  const url = `${SUPABASE_URL}/rest/v1/echipamente?id_echipament=eq.${id}&select=*`;

  const data = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  }).then(r => r.json());

  if (!data || data.length === 0) {
    content.innerHTML = "<p>Nu există istoric pentru acest echipament.</p>";
    return;
  }

  // sortare descrescător
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
