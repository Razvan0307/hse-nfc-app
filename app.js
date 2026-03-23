// Variabilă pentru locația curentă (până scanezi un tag LOC)
let currentLocation = "Nesetat";

// Lista în care salvăm hamurile scanate
let entries = [];

// Legăm butoanele din HTML
document.getElementById("scanNFC").addEventListener("click", scanNFC);
document.getElementById("exportCSV").addEventListener("click", exportCSV);
document.getElementById("clearData").addEventListener("click", clearAll);

// Funcția principală de scanare NFC
async function scanNFC() {
    if ("NDEFReader" in window) {
        try {
            const reader = new NDEFReader();
            await reader.scan();

            reader.onreading = event => {
                // Citim primul record NDEF
                const record = event.message.records[0];
                const text = new TextDecoder().decode(record.data);

                console.log("NFC citit:", text);

                // Dacă este locație
                if (text.startsWith("LOC_")) {
                    currentLocation = text.replace("LOC_", "");
                    document.getElementById("locatie").textContent = currentLocation;
                    alert("Locația a fost setată la: " + currentLocation);
                }

                // Dacă este ham
                else if (text.startsWith("HAM_")) {
                    const idHam = text.replace("HAM_", "");
                    const timestamp = new Date().toLocaleString("ro-RO");

                    // Creez obiectul de salvare
                    const entry = {
                        ID_HAM: idHam,
                        Locație: currentLocation,
                        DataOra: timestamp,
                        DataRevizie: "NECOMPLETAT"
                    };

                    // Salvăm în listă
                    entries.push(entry);

                    // Afișăm în UI
                    const li = document.createElement("li");
                    li.textContent = `${idHam} — ${currentLocation} — ${timestamp}`;
                    document.getElementById("lista").appendChild(li);
                }

                else {
                    alert("Tag necunoscut! Folosește formatul LOC_ sau HAM_.");
                }
            };

        } catch (error) {
            alert("Eroare la scanarea NFC: " + error);
        }
    } else {
        alert("NFC nu este suportat pe acest dispozitiv sau browser.");
    }
}

// Funcție pentru export CSV (Excel)
function exportCSV() {
    if (entries.length === 0) {
        alert("Nu există date de exportat.");
        return;
    }

    let csv = "ID_HAM,Locatie,DataOra,DataRevizie\n";

    entries.forEach(e => {
        csv += `${e.ID_HAM},${e.Locație},${e.DataOra},${e.DataRevizie}\n`;
    });

    // Creăm fișierul CSV
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "hamuri_export.csv";
    a.click();
}

// Funcție pentru ștergerea bazei de date temporare
function clearAll() {
    if (confirm("Sigur vrei să ștergi toate datele?")) {
        entries = [];
        document.getElementById("lista").innerHTML = "";
    }
}
