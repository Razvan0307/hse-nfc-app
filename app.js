//--------------------------------------------------
// CONFIG SUPABASE
//--------------------------------------------------
const SUPABASE_URL = "https://rrtyjtbcxgacldniuybn.supabase.co";
const SUPABASE_KEY = "sb_publishable_BgWYudD6xuJbxRuZHt3mHg_35f1e6j6";

//--------------------------------------------------
// VARIABILE
//--------------------------------------------------
let currentLocation = "Nesetat";
let lastScanTime = 0;
let isScanning = false;
let controller = null;

//--------------------------------------------------
// ICONS PE TIP
//--------------------------------------------------
function iconForType(tip) {
  switch (tip) {
    case "ham": return "🦺";
    case "vesta": return "🧥";
    case "stingator": return "🔥";
    case "kit": return "⛑️";
    default: return "🧰";
  }
}

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

  try {
    controller = new AbortController();
    const reader = new NDEFReader();

    await reader.scan({ signal: controller.signal, keepSessionAlive: true });

    reader.onreading = async (ev) => {
      ev.preventDefault();

      const now = Date.now();
      if (now - lastScanTime < 1500) return;
      lastScanTime = now;

      const raw = new TextDecoder().decode(ev.message.records[0].data).trim();

      // ----------------------- Locație -----------------------
      if (raw.startsWith("LOC_")) {
        currentLocation = raw.replace("LOC_", "");
        document.getElementById("locatie").textContent = currentLocation;
        alert("✅ Locație setată: " + currentLocation);
        finishScan();
        return;
      }

      // ----------------------- Echipament ----------------------
      const id = raw;
      const tip = detectTip(id);
      if (tip === "necunoscut") { alert("Tag necunoscut!"); finishScan(); return; }

      const idDisplay = id.replace(/^\w+_/, "");
      const timestamp = new Date().toLocaleString("ro-RO");

      // verificam DB
      const checkUrl = `${SUPABASE_URL}/rest/v1/echipamente?id_echipament=eq.${id}&select=*`;

      const existing = await fetch(checkUrl, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      }).then(r => r.json());

      // ------------ Stare conform / neconform --------------
      const conform = confirm("Echipamentul este conform?\nOK = Conform\nCANCEL = Neconform");
      const stare = conform ? "conform" : "neconform";

      let dataRevizie = "";
      let predat = "";

      // Dacă nu e conform → cerem revizie + persoană
      if (!conform) {
        dataRevizie = prompt("Introduceți data ultimei revizii:");
        if (!dataRevizie) dataRevizie = "Nespecificat";

        predat = prompt("Cine a preluat echipamentul?");
        if (!predat) predat = "Nespecificat";
      }
      // Dacă e conform dar nu există în DB → cerem revizie
      else if (existing.length === 0) {
        dataRevizie = prompt("Echipament nou. Introduceți data ultimei revizii:");
        if (!dataRevizie) dataRevizie = "Nespecificat";
      }
      // Dacă există și e conform → folosim revizia din DB
      else {
        dataRevizie = existing[0].data_revizie;
        predat = existing[0].predat_catre ?? "";
      }

      // ENTRY FINAL
      const entry = {
        id_echipament: id,
        tip,
        locatie: currentLocation,
        stare,
        predat_catre: predat,
        data_scan: timestamp,
        data_revizie: dataRevizie,
        observatii: ""
      };

      await saveToSupabase(entry);
      addCard({ ...entry, idDisplay });

      finishScan();
    };

  } catch (err) {
    alert("Eroare NFC: " + err);
    finishScan();
  }
}

//--------------------------------------------------
function finishScan() {
  isScanning = false;
  document.getElementById("scanStatus").style.display = "none";
  if (controller) controller.abort();
}
//--------------------------------------------------

// SAVE / UPDATE IN SUPABASE
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
        "Content-Type": "application/json"
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
// CALCUL 12 LUNI
//--------------------------------------------------
function isOlderThan12Months(dateString) {
  if (!dateString || dateString === "Nespecificat") return false;
  const [dd, mm, yyyy] = dateString.split(".");
  const d = new Date(`${yyyy}-${mm}-${dd}`);
  const diff = Date.now() - d.getTime();
  return diff / (1000 * 60 * 60 * 24 * 30.5) > 12;
}

//--------------------------------------------------
// Afișare card
//--------------------------------------------------
function addCard(entry) {
  const lista = document.getElementById("lista");
  const icon = iconForType(entry.tip);

  const overdue = isOlderThan12Months(entry.data_revizie);

  const card = document.createElement("div");
  card.className = "equip-card";
  if (entry.stare === "neconform") card.style.borderLeftColor = "red";

  card.innerHTML = `
    <div class="equip-id">${icon} ${entry.idDisplay} (${entry.tip})</div>
    <div class="equip-loc">📍 ${entry.locatie}</div>
    <div class="equip-time">⏱ ${entry.data_scan}</div>
    <div class="equip-status" style="color:${entry.stare === "neconform" ? "red" : "green"}">
      Stare: ${entry.stare}
    </div>
    <div class="equip-status" style="${overdue ? "color:red; font-weight:bold" : ""}">
      📅 Revizie: ${entry.data_revizie}
    </div>
    ${entry.predat_catre ? `<div class="equip-status">👤 Predat: ${entry.predat_catre}</div>` : ""}
  `;

  lista.prepend(card);
}

//--------------------------------------------------
// BUTON: VIZUALIZEAZĂ DOAR ECHIPAMENTE CU REVIZIE DEPĂȘITĂ
//--------------------------------------------------
document.getElementById("showExpired").addEventListener("click", () => {
  const cards = document.querySelectorAll(".equip-card");
  cards.forEach(card => {
    const rev = card.innerText.match(/Revizie: (.*)/)?.[1] || "";
    card.style.display = isOlderThan12Months(rev) ? "block" : "none";
  });
});

//--------------------------------------------------
// Export CSV
//--------------------------------------------------
function exportCSV() {
  let csv = "ID,Tip,Locatie,Stare,PredatCatre,DataScan,Revizie\n";

  document.querySelectorAll(".equip-card").forEach(card => {
    const lines = card.innerText.split("\n");

    const id = lines[0].replace(/^[^\s]+\s/, "");
    const loc = lines[1].replace("📍 ", "");
    const time = lines[2].replace("⏱ ", "");
    const stare = lines[3].replace("Stare: ", "");
    const rev = lines[4].replace("📅 Revizie: ", "");
    const pred = lines[5] ? lines[5].replace("👤 Predat: ", "") : "";

    csv += `${id},,,${loc},${stare},${pred},${time},${rev}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "echipamente_export.csv";
  a.click();
}
