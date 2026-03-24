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

//--------------------------------------------------
// FUNCTIE: DETECTARE TIP
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

  try {
    const controller = new AbortController();
    const reader = new NDEFReader();

    await reader.scan({ signal: controller.signal, keepSessionAlive: true });

    reader.onreading = async (event) => {
      event.preventDefault();

      const now = Date.now();
      if (now - lastScanTime < 1500) return;
      lastScanTime = now;

      const rawText = new TextDecoder().decode(event.message.records[0].data).trim();

      // -----------------------------
      // SCANARE LOCATIE
      // -----------------------------
      if (rawText.startsWith("LOC_")) {
        currentLocation = rawText.replace("LOC_", "");
        document.getElementById("locatie").textContent = currentLocation;
        alert("✅ Locație setată: " + currentLocation);

        isScanning = false;
        document.getElementById("scanStatus").style.display = "none";
        return;
      }

      // -----------------------------
      // SCANARE ECHIPAMENT
      // -----------------------------
      const id = rawText;
      const tip = detectTip(id);

      if (tip === "necunoscut") {
        alert("❌ Tag necunoscut!");
        return;
      }

      const idDisplay = id.replace(/^\w+_/, "");
      const timestamp = new Date().toLocaleString("ro-RO");

      // -----------------------------
      // Verificăm dacă există în DB
      // -----------------------------
      const checkUrl = `${SUPABASE_URL}/rest/v1/echipamente?id_echipament=eq.${id}&select=*`;
      const existing = await fetch(checkUrl, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      }).then(r => r.json());

      let dataRevizie = "";
      let predat_catre = "";

      // -----------------------------
      // POPUP: CONFORM / NECONFORM
      // -----------------------------
      const conform = confirm("Echipamentul este conform?\nOK = Conform\nCANCEL = Neconform");
      const stare = conform ? "conform" : "neconform";

      // -----------------------------
      // 1. Dacă este NECONFORM → trebuie revizie + predat
      // -----------------------------
      if (!conform) {
        dataRevizie = prompt("Introduceți data ultimei revizii:", "");
        if (!dataRevizie) dataRevizie = "Nespecificat";

        predat_catre = prompt("Cine a preluat echipamentul pentru verificare?", "");
        if (!predat_catre) predat_catre = "Nespecificat";
      }

      // -----------------------------
      // 2. Dacă nu există în DB → cerem revizie doar prima dată
      // -----------------------------
      else if (existing.length === 0) {
        dataRevizie = prompt("Introduceți data ultimei revizii (echipament nou):", "");
        if (!dataRevizie) dataRevizie = "Nespecificat";
      }

      // -----------------------------
      // 3. Dacă este conform + există → păstrăm revizia veche
      // -----------------------------
      else {
        dataRevizie = existing[0].data_revizie;
      }

      // -----------------------------
      // ENTRY FINAL
      // -----------------------------
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
    console.log(err);
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

  // UPDATE
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
  }

  // INSERT
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
// AFISARE CARD (cu ROȘU dacă revizia > 12 luni)
//--------------------------------------------------
function addCard(entry) {
  const lista = document.getElementById("lista");

  // verificare 12 luni
  let isExpired = false;
  if (entry.data_revizie && entry.data_revizie !== "Nespecificat") {
    const parts = entry.data_revizie.split(".");
    if (parts.length === 3) {
      const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      const diff = Date.now() - d.getTime();
      const months = diff / (1000 * 60 * 60 * 24 * 30.5);
      if (months > 12) isExpired = true;
    }
  }

  const colorRevizie = isExpired ? "color:red;font-weight:bold;" : "";

  const card = document.createElement("div");
  card.className = "equip-card";

  card.innerHTML = `
    <div class="equip-id">🧰 ${entry.idDisplay} (${entry.tip})</div>
    <div class="equip-loc">📍 ${entry.locatie}</div>
    <div class="equip-time">⏱ ${entry.data_scan}</div>
    <div class="equip-status">Stare: ${entry.stare}</div>
    <div class="equip-status" style="${colorRevizie}">📅 Revizie: ${entry.data_revizie}</div>
    ${entry.predat_catre ? `<div class="equip-status">👤 Predat: ${entry.predat_catre}</div>` : ""}
  `;

  lista.prepend(card);
}

//--------------------------------------------------
// EXPORT CSV
//--------------------------------------------------
function exportCSV() {
  let csv = "ID,Tip,Locatie,Stare,PredatCatre,DataScan,Revizie,Observatii\n";

  const cards = document.querySelectorAll(".equip-card");

  cards.forEach(card => {
    const lines = card.innerText.split("\n");

    const id = lines[0].replace("🧰 ", "");
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
