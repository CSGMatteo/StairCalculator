import { useEffect, useRef, useState } from "react";


const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1VMPWmQUbbHK0JE_8ldfsc2G454vVPkFnLhjATuVKil8/export?format=csv";

export default function ScannerModal({ onClose, onSelect }) {
  const videoRef = useRef(null);

  const [inventory, setInventory] = useState({});
  const [scanLocked, setScanLocked] = useState(false);
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState("");

  /* ================= LOAD INVENTORY ================= */

  useEffect(() => {
    async function loadInventory() {
      const res = await fetch(SHEET_URL + "&t=" + Date.now());
      const text = await res.text();

      const rows = text.split("\n").map(r =>
        r.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || []
      );

      const headers = rows[0].map(h => h.replace(/"/g, "").trim());

      const inv = {};

      rows.slice(1).forEach(row => {
        const item = {};
        headers.forEach((h, i) => {
          item[h] = row[i]?.replace(/"/g, "").trim() || "";
        });

        if (!item[headers[0]]) return;

        const barcode = item[headers[0]];
        if (!inv[barcode]) inv[barcode] = [];
        inv[barcode].push(item);
      });

      setInventory(inv);
    }

    loadInventory();
  }, []);

  /* ================= SCANNER ================= */

  useEffect(() => {
    if (!videoRef.current || Object.keys(inventory).length === 0) return;

    let reader;

    async function startScanner() {
        const ZXing = await import("@zxing/library");

        reader = new ZXing.BrowserMultiFormatReader();

        reader.decodeFromVideoDevice(null, videoRef.current, (res) => {
            if (res && !scanLocked) {
                lookupBarcode(res.text);
            }
        });
    }

    startScanner();

    return() => {
        if (reader) reader.reset();
    };
  }, [scanLocked, inventory]);

  /* ================= LOOKUP ================= */

  function lookupBarcode(code) {
    const items = inventory[code];

    if (!items) {
      setResult({ type: "error", message: "No match found" });
      setScanLocked(true);
      return;
    }

    if (items.length === 1) {
      setResult({ type: "single", item: items[0] });
    } else {
      setResult({ type: "multiple", items });
    }

    setScanLocked(true);
  }

  function manualSearch() {
    const q = search.trim().toLowerCase();
    if (!q) return;

    if (inventory[q]) {
      lookupBarcode(q);
      return;
    }

    const matches = [];

    for (const code in inventory) {
      inventory[code].forEach(item => {
        if (item["Item Name"].toLowerCase().includes(q)) {
          matches.push(item);
        }
      });
    }

    if (matches.length === 0) {
      setResult({ type: "error", message: "No matches" });
      return;
    }

    setResult({ type: "multiple", items: matches });
    setScanLocked(true);
  }

  function unlock() {
    setScanLocked(false);
    setResult(null);
    setSearch("");
  }

  function handleSelect(item) {
    onSelect(item);   // send back to parent
    onClose();        // close modal
  }

  /* ================= UI ================= */

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>

        <h2>💲 Price Checker</h2>

        <div style={styles.videoBox}>
          <video ref={videoRef} style={styles.video} />
        </div>

        <input
          placeholder="Enter barcode or product name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && manualSearch()}
          style={styles.input}
        />

        <button onClick={manualSearch} style={styles.button}>
          Search
        </button>

        <div style={styles.resultBox}>
          {!result && <div>Waiting for scan…</div>}

          {result?.type === "error" && (
            <>
              <div>{result.message}</div>
              <button onClick={unlock}>Try Again</button>
            </>
          )}

          {result?.type === "single" && (
            <>
              <div>{result.item["Item Name"]}</div>
              <div style={styles.price}>{result.item["Price"]}</div>
              <button onClick={() => handleSelect(result.item)}>
                Use This
              </button>
              <button onClick={unlock}>Scan Next</button>
            </>
          )}

          {result?.type === "multiple" && (
            <>
              <div>Select item:</div>
              {result.items.map((item, i) => (
                <div key={i} style={styles.variant}>
                  <div>{item["Item Name"]}</div>
                  <div>{item["Price"]}</div>
                  <button onClick={() => handleSelect(item)}>
                    Select
                  </button>
                </div>
              ))}
              <button onClick={unlock}>Cancel</button>
            </>
          )}
        </div>

        <button onClick={onClose} style={styles.close}>
          Close
        </button>

      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    padding: 20,
    borderRadius: 16,
    width: "90%",
    maxWidth: 600,
    textAlign: "center",
  },
  videoBox: {
    width: "100%",
    height: 250,
    overflow: "hidden",
    borderRadius: 12,
    border: "3px solid #222",
    marginBottom: 10,
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  input: {
    width: "100%",
    padding: 12,
    fontSize: 18,
    marginTop: 10,
  },
  button: {
    marginTop: 10,
    padding: 12,
    fontSize: 18,
    width: "100%",
  },
  resultBox: {
    marginTop: 15,
    padding: 15,
    border: "2px solid #333",
    borderRadius: 12,
  },
  variant: {
    border: "1px solid #333",
    padding: 10,
    marginTop: 10,
    borderRadius: 10,
  },
  price: {
    fontSize: 28,
    margin: "10px 0",
  },
  close: {
    marginTop: 15,
    padding: 10,
    width: "100%",
  },
};