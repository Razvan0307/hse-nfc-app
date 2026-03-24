//--------------------------------------------------
// CONFIG SUPABASE
//--------------------------------------------------
const SUPABASE_URL = "https://rrtyjtbcxgacldniuybn.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydHlqdGJjeGdhY2xkbml1eWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNjk3OTEsImV4cCI6MjA4OTg0NTc5MX0.PiaVCoK7WyMBFIH4St59oMGIAg8eaRUABXZvhBnudI0";

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
      const reader = new NDEFReader();
      await reader.scan();

      reader.onreading = async (event) => {
        const now = Date.now();
        if (now - lastScanTime < 2000) return;
        lastScanTime = now;

        const record = event.message.records[0];
        const text = new TextDecoder().decode(record.data);

        // LOCATIE
        if (text.startsWith("LOC_")) {
          currentLocation = text.replace("LOC_", "");
          document.getElementById("locatie").textContent = currentLocation;
          alert("✅ Locație setată: " + currentLocation);
        }
        // ECHIPAMENT
        else {
          const id = text.trim();
          const tip = detectTip(id);

          if (tip === "necunoscut") {
            alert("❌ Prefix necunoscut! Folosește HAM_, VESTA_, STING_, KIT_.");
            return;
          }

          const timestamp = new Date().toLocaleString("ro-RO");

          // POP‑UP: CONFORM / NECONFORM
          const conform = confirm(
            "Echipamentul este conform?\nOK = Conform\nCancel = Neconform"
          );
          const stare = conform ? "conform" : "neconform";

          let predat = "";
          if (!conform) {
            predat = prompt("Cine a preluat echipamentul pentru verificare?");
            if (!predat) predat = "Nespecificat";
          }

          // POP-UP: DATA EXPIRARE
          let expira = prompt("Introduceți data de expirare (ex: 31.12.2026):");
          if (!expira) expira = "Nespecificat";

          // CREAZA ENTRY
          const entry = {
            id_echipament: id,
            tip: tip,
            locatie: currentLocation,
            stare: stare,
            predat_catre: predat,
            data_scan: timestamp,
            data_expirare: expira,
            observatii: ""
          };

          // Salvare in SUPABASE
          await saveToSupabase(entry);

          // Afișare în UI
          addCard(entry);
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
// FUNCTIE: SAVE / UPDATE SUPABASE
//--------------------------------------------------
async function saveToSupabase(entry) {
  try {
    // 1️⃣ Căutăm dacă există deja
    const checkUrl = `${SUPABASE_URL}/rest/v1/echipamente?id_echipament=eq.${entry.id_echipament}&select=*`;

    const existing = await fetch(checkUrl, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    }).then((r) => r.json());

    // 2️⃣ UPDATE
    if (existing.length > 0) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/echipamente?id_echipament=eq.${entry.id_echipament}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(entry)
        }
      );

      alert(`♻️ Echipament ${entry.id_echipament} actualizat.`);
    }
    // 3️⃣ INSERT
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

      alert(`✅ Echipament ${entry.id_echipament} adăugat.`);
    }
  } catch (err) {
    console.error("❌ Eroare Supabase:", err);
  }
}

//--------------------------------------------------
// FUNCTIE: ADAUGA CARD ÎN UI
//--------------------------------------------------
function addCard(entry) {
  const lista = document.getElementById("lista");

  const card = document.createElement("div");
  card.className = "ham-card";

  card.innerHTML = `
    <div class="ham-id">🧰 ${entry.id_echipament} (${entry.tip})</div>
    <div class="ham-loc">📍 ${entry.locatie}</div>
    <div class="ham-time">⏱ ${entry.data_scan}</div>
    <div class="ham-rev">✅ Stare: ${entry.stare}</div>
    <div class="ham-rev">📅 Expiră: ${entry.data_expirare}</div>
    ${entry.predat_catre ? `<div class="ham-rev">👤 Predat către: ${entry.predat_catre}</div>` : ""}
  `;

  lista.prepend(card);
}

//--------------------------------------------------
// EXPORT CSV
//--------------------------------------------------
function exportCSV() {
  let csv = "ID,Tip,Locatie,Stare,PredatCatre,DataScan,Expira,Observatii\n";

  const cards = document.querySelectorAll(".ham-card");

  cards.forEach((card) => {
    const lines = card.innerText.split("\n");

    const id = lines[0].replace("🧰 ", "");
    const loc = lines[1].replace("📍 ", "");
    const time = lines[2].replace("⏱ ", "");
    const stare = lines[3].replace("✅ Stare: ", "");
    const exp = lines[4].replace("📅 Expiră: ", "");
    const pred = lines[5] ? lines[5].replace("👤 Predat către: ", "") : "";

    csv += `${id},,,${loc},${stare},${pred},${time},${exp},\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "echipamente_export.csv";
  a.click();
}
