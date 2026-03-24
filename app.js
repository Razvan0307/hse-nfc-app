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
// FUNCTIE: DETECTARE TIP ECHIPAMENT
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
  if (isScanning) {
    alert("Așteaptă 2 secunde între scanări.");
    return;
  }

  isScanning = true;
  document.getElementById("scanStatus").style.display = "block";

  if ("NDEFReader" in window) {
    try {
      const controller = new AbortController();
      const reader = new NDEFReader();

      await reader.scan({
        signal: controller.signal,
        keepSessionAlive: true
      });

      reader.onreadingerror = () => {
        console.warn("Eroare la citire NFC");
      };

      reader.onreading = async (event) => {
        event.preventDefault(); // ✅ STOP popup sistemic
        const now = Date.now();
        if (now - lastScanTime < 2000) return;
        lastScanTime = now;

        const record = event.message.records[0];
        const rawText = new TextDecoder().decode(record.data).trim();

        //---------------------------
        // SETARE LOCAȚIE
        //---------------------------
        if (rawText.startsWith("LOC_")) {
          currentLocation = rawText.replace("LOC_", "");
          document.getElementById("locatie").textContent = currentLocation;
          alert("✅ Locație setată: " + currentLocation);
        }

        //---------------------------
        // ECHIPAMENT
        //---------------------------
        else {
          const id = rawText;
          const tip = detectTip(id);

          if (tip === "necunoscut") {
            alert("❌ Prefix necunoscut!");
            return;
          }

          const idDisplay = id.replace(/^\w+_/, "");
          const timestamp = new Date().toLocaleString("ro-RO");

          // ✅ POP-UP: conform / neconform
          const conform = confirm("Echipamentul este conform?\nOK = Conform\nCANCEL = Neconform");
          const stare = conform ? "conform" : "neconform";

          // ✅ dacă neconform → persoana care preia
          let predat = "";
          if (!conform) {
            predat = prompt("Cine a preluat echipamentul pentru verificare?");
            if (!predat) predat = "Nespecificat";
          }

          // ✅ DATA REVIZIE
          let dataRevizie = prompt("Introduceți data ultimei revizii (ex: 10.01.2026):");
          if (!dataRevizie) dataRevizie = "Nespecificat";

          // ✅ DATA EXPIRARE
          let expira = prompt("Introduceți data expirării (ex: 31.12.2026):");
          if (!expira) expira = "Nespecificat";

          // ✅ ENTRY FINAL
          const entry = {
            id_echipament: id,
            tip: tip,
            locatie: currentLocation,
            stare: stare,
            predat_catre: predat,
            data_scan: timestamp,
            data_expirare: expira,
            data_revizie: dataRevizie,
            observatii: ""
          };

          await saveToSupabase(entry);
          addCard({ ...entry, idDisplay });
        }

        setTimeout(() => (isScanning = false), 2000);
        document.getElementById("scanStatus").style.display = "none";
      };
    } catch (error) {
      alert("Eroare NFC: " + error);
      isScanning = false;
    }
  } else {
    alert("NFC nu este suportat pe acest dispozitiv.");
    isScanning = false;
  }
}

//--------------------------------------------------
// SAVE / UPDATE SUPABASE
//--------------------------------------------------
async function saveToSupabase(entry) {
  try {
    const checkUrl = `${SUPABASE_URL}/rest/v1/echipamente?id_echipament=eq.${entry.id_echipament}&select=*`;

    const existing = await fetch(checkUrl, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    }).then((r) => r.json());

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

      alert(`♻️ Actualizat: ${entry.id_echipament}`);
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
        body: JSON.stringify(entry)
      });

      alert(`✅ Adăugat: ${entry.id_echipament}`);
    }
  } catch (err) {
    console.error("❌ Eroare Supabase:", err);
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
    <div class="equip-status">✅ Stare: ${entry.stare}</div>
    <div class="equip-status">📅 Revizie: ${entry.data_revizie}</div>
    <div class="equip-status">📅 Expiră: ${entry.data_expirare}</div>
    ${entry.predat_catre ? `<div class="equip-status">👤 Predat către: ${entry.predat_catre}</div>` : ""}
  `;

  lista.prepend(card);
}

//--------------------------------------------------
// EXPORT CSV
//--------------------------------------------------
function exportCSV() {
  let csv = "ID,Tip,Locatie,Stare,PredatCatre,DataScan,Revizie,Expira,Observatii\n";

  const cards = document.querySelectorAll(".equip-card");

  cards.forEach((card) => {
    const lines = card.innerText.split("\n");

    const id = lines[0].replace("🧰 ", "");
    const loc = lines[1].replace("📍 ", "");
    const time = lines[2].replace("⏱ ", "");
    const stare = lines[3].replace("✅ Stare: ", "");
    const rev = lines[4].replace("📅 Revizie: ", "");
    const exp = lines[5].replace("📅 Expiră: ", "");
    const pred = lines[6] ? lines[6].replace("👤 Predat către: ", "") : "";

    csv += `${id},,,${loc},${stare},${pred},${time},${rev},${exp}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "echipamente_export.csv";
  a.click();
}
