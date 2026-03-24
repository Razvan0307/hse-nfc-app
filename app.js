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
document.getElementById("showExpired").addEventListener("click", showExpired);

//--------------------------------------------------
// ICONURI PE TIP
//--------------------------------------------------
function getIcon(tip) {
  if (tip === "ham") return "🦺";
  if (tip === "vesta") return "🧥";
  if (tip === "stingator") return "🔥";
  if (tip === "kit") return "⛑️";
  return "🧰";
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
// ✅ SCANARE NFC — FĂRĂ POP-UP, FĂRĂ DUBLURI
//--------------------------------------------------
async function scanNFC() {

  if (isScanning) return;

  isScanning = true;
  document.getElementById("scanStatus").style.display = "block";

  try {
    const controller = new AbortController();
    const reader = new NDEFReader();

    await reader.scan({ signal: controller.signal });

    reader.onreading = async (event) => {

      const now = Date.now();
      if (now - lastScanTime < 1500) return;  // anti-dublu-scan
      lastScanTime = now;

      const rawText = new TextDecoder().decode(event.message.records[0].data).trim();

      //------------------------------------------------------
      // SETARE LOCATIE
      //------------------------------------------------------
      if (rawText.startsWith("LOC_")) {
        currentLocation = rawText.replace("LOC_", "");
        document.getElementById("locatie").textContent = currentLocation;
        alert("✅ Locație setată: " + currentLocation);

        isScanning = false;
        document.getElementById("scanStatus").style.display = "none";
        return;
      }

      //------------------------------------------------------
      // ECHIPAMENT
      //------------------------------------------------------
      const id = rawText;
      const tip = detectTip(id);

      if (tip === "necunoscut") {
        alert("❌ Tag necunoscut!");
        isScanning = false;
        return;
      }

      const idDisplay = id.replace(/^\w+_/, "");
      const timestamp = new Date().toLocaleString("ro-RO");

      // verificăm dacă există în DB
      const checkUrl = `${SUPABASE_URL}/rest/v1/echipamente?id_echipament=eq.${id}&select=*`;
      const existing = await fetch(checkUrl, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      }).then(r => r.json());

      //------------------------------------------------------
      // POPUP CONFORM / NECONFORM
      //------------------------------------------------------
      const conform = confirm("Echipamentul este conform?\nOK = Conform\nCancel = Neconform");
      const stare = conform ? "conform" : "neconform";

      let dataRevizie = "";
      let predat_catre = "";

      //------------------------------------------------------
      // RULE 1: Dacă neconform → cerem revizia + predat
      //------------------------------------------------------
      if (!conform) {
        dataRevizie = prompt("Introduceți data ultimei revizii:", "");
        if (!dataRevizie) dataRevizie = "Nespecificat";

        predat_catre = prompt("Cine a preluat echipamentul?", "");
        if (!predat_catre) predat_catre = "Nespecificat";
      }

      //------------------------------------------------------
      // RULE 2: Dacă echipamentul NU există → cerem revizia
      //------------------------------------------------------
      else if (existing.length === 0) {
        dataRevizie = prompt("Introduceți data ultimei revizii (echipament nou):", "");
        if (!dataRevizie) dataRevizie = "Nespecificat";
      }

      //------------------------------------------------------
      // RULE 3: Dacă există și e conform → păstrăm revizia veche
      //------------------------------------------------------
      else {
        dataRevizie = existing[0].data_revizie;
        predat_catre = existing[0].predat_catre || "";
      }

      //------------------------------------------------------
      // ENTRY FINAL
      //------------------------------------------------------
      const entry = {
        id_echipament: id,
        tip: tip,
        locatie: currentLocation,
        stare: stare,
        predat_catre,
        data_scan: timestamp,
        data_revizie: dataRevizie,
        observatii: ""
      };

      await saveToSupabase(entry);
      addCard({ ...entry, idDisplay });

      isScanning = false;
      document.getElementById("scanStatus").style.display = "none";
    };

  } catch (err) {
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

  if (existing.length > 0) {
    // UPDATE
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
    // INSERT
    await fetch(`${SUPABASE_URL}/rest/v1/echipamente`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(entry]
    });
  }
}

//--------------------------------------------------
// FUNCȚIE: VERIFICĂ >12 LUNI
//--------------------------------------------------
function isExpired(rev) {
  if (!rev || rev === "Nespecificat") return false;

  const parts = rev.split(".");
  if (parts.length !== 3) return false;

  const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  return ((Date.now() - d.getTime()) / (1000*60*60*24*30.5)) > 12;
}

//--------------------------------------------------
// AFISARE CARD
//--------------------------------------------------
function addCard(entry) {
  const idIcon = getIcon(entry.tip);
  const expired = isExpired(entry.data_revizie);

  const card = document.createElement("div");
  card.className = "equip-card";

  if (entry.stare === "neconform") {
    card.style.borderLeft = "6px solid red";
  }

  card.innerHTML = `
    <div class="equip-id">${idIcon} ${entry.idDisplay} (${entry.tip})</div>
    <div class="equip-loc">📍 ${entry.locatie}</div>
    <div class="equip-time">⏱ ${entry.data_scan}</div>
    <div class="equip-status" style="color:${entry.stare === "neconform" ? "red" : "green"}">
      Stare: ${entry.stare}
    </div>
    <div class="equip-status" style="${expired ? "color:red;font-weight:bold" : ""}">
      📅 Revizie: ${entry.data_revizie}
    </div>
    ${entry.predat_catre ? `<div class="equip-status">👤 Predat: ${entry.predat_catre}</div>` : ""}
  `;

  document.getElementById("lista").prepend(card);
}

//--------------------------------------------------
// FILTRU: DOAR REVIZII DEPĂȘITE
//--------------------------------------------------
function showExpired() {
  const cards = document.querySelectorAll(".equip-card");

  cards.forEach(card => {
    const revMatch = card.innerText.match(/Revizie: (.*)/);
    if (!revMatch) return;

    const rev = revMatch[1];
    card.style.display = isExpired(rev) ? "block" : "none";
  });
}

//--------------------------------------------------
// EXPORT CSV
//--------------------------------------------------
function exportCSV() {
  let csv = "ID,Tip,Locatie,Stare,Predat,DataScan,Revizie\n";

  document.querySelectorAll(".equip-card").forEach(card => {
    const lines = card.innerText.split("\n");

    const id = lines[0];
    const loc = lines[1].replace("📍 ", "");
    const scan = lines[2].replace("⏱ ", "");
    const stare = lines[3].replace("Stare: ", "");
    const rev = lines[4].replace("📅 Revizie: ", "");
    const pred = lines[5] ? lines[5].replace("👤 Predat: ", "") : "";

    csv += `${id},,,${loc},${stare},${pred},${scan},${rev}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "echipamente_export.csv";
  a.click();
}
