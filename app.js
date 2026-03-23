// -----------------------------
// CONFIG SUPABASE
// -----------------------------
const SUPABASE_URL = "https://rrtyjtbcxgacldniuybn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydHlqdGJjeGdhY2xkbml1eWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNjk3OTEsImV4cCI6MjA4OTg0NTc5MX0.PiaVCoK7WyMBFIH4St59oMGIAg8eaRUABXZvhBnudI0";


// -----------------------------
// VARIABILE
// -----------------------------
let currentLocation = "Nesetat";
let entries = [];


// -----------------------------
// TRIMITE DATE ÎN SUPABASE
// -----------------------------
async function saveToSupabase(entry) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/hamuri`, {
            method: "POST",
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            },
            body: JSON.stringify({
                id_ham: entry.ID_HAM,
                locatie: entry.Locație,
                dataora: entry.DataOra,
                datarevizie: entry.DataRevizie
            })
        });

        const data = await response.json();
        console.log("✔ Trimite în Supabase:", data);

    } catch (err) {
        console.error("❌ Eroare trimitere Supabase:", err);
    }
}


// -----------------------------
// EVENT LISTENERS
// -----------------------------
document.getElementById("scanNFC").addEventListener("click", scanNFC);
document.getElementById("exportCSV").addEventListener("click", exportCSV);
document.getElementById("clearData").addEventListener("click", clearAll);


// -----------------------------
// SCANARE NFC
// -----------------------------
async function scanNFC() {
    if ("NDEFReader" in window) {
        try {
            const reader = new NDEFReader();
            await reader.scan();

            reader.onreading = event => {
                const record = event.message.records[0];
                const text = new TextDecoder().decode(record.data);

                console.log("📡 TAG CITIT:", text);

                // -----------------------------
                // TAG LOCATIE
                // -----------------------------
                if (text.startsWith("LOC_")) {
                    currentLocation = text.replace("LOC_", "");
                    document.getElementById("locatie").textContent = currentLocation;
                    alert("Locație setată: " + currentLocation);
                }

                // -----------------------------
                // TAG HAM
                // -----------------------------
                else if (text.startsWith("HAM_")) {

                    const idHam = text.replace("HAM_", "");
                    const timestamp = new Date().toLocaleString("ro-RO");

                    const entry = {
                        ID_HAM: idHam,
                        Locație: currentLocation,
                        DataOra: timestamp,
                        DataRevizie: "NECOMPLETAT"
                    };

                    entries.push(entry);

                    const li = document.createElement("li");
                    li.textContent = `${idHam} — ${currentLocation} — ${timestamp}`;
                    document.getElementById("lista").appendChild(li);

                    // -----------------------------
                    // TRIMITERE AUTOMATĂ ÎN SUPABASE
                    // -----------------------------
                    saveToSupabase(entry);
                }

                // -----------------------------
                // TAG INVALID
                // -----------------------------
                else {
                    alert("❌ Tag necunoscut! Folosește LOC_ sau HAM_.");
                }
            };

        } catch (error) {
            alert("Eroare la scanarea NFC: " + error);
        }
    } else {
        alert("NFC nu este suportat pe acest dispozitiv sau browser.");
    }
}


// -----------------------------
// EXPORT CSV
// -----------------------------
function exportCSV() {
    let csv = "ID_HAM,Locatie,DataOra,DataRevizie\n";

    entries.forEach(e => {
        csv += `${e.ID_HAM},${e.Locație},${e.DataOra},${e.DataRevizie}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "hamuri_export.csv";
    a.click();
}


// -----------------------------
// ȘTERGERE LISTĂ
// -----------------------------
function clearAll() {
    if (confirm("Sigur vrei să ștergi toate datele?")) {
        entries = [];
        document.getElementById("lista").innerHTML = "";
    }
}