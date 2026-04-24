import { useState, useRef } from "react";
import ScannerModal from "./ScannerModal";

export default function SampleSignOut({ setMode }) {

  const [scannerOpen, setScannerOpen] = useState(false)

  const [step, setStep] = useState("info");

  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    number: "",
    employee: ""
  });

  const [cartItems, setCartItems] = useState([]);
  const [barcode, setBarcode] = useState("");
  const [results, setResults] = useState([]);

  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzAcdiYAZOqw4mZj7YX2gF1acPEfZh1aXBEx2YXuVsjPZOTrM9YVEp0WLNgQ3Eif5Dqcg/exec"
  async function searchBarcode(forcedBarcode = null) {
    let code = forcedBarcode ?? barcode;

    if (typeof code !== "string") {
      code = barcode;
    }

    if (!code) {
      alert("No barcode entered");
      return;
    }

    try {
      console.log("Searching for:", code);

      const res = await fetch(
        `${SCRIPT_URL}?action=search&barcode=${encodeURIComponent(code)}&t=${Date.now()}`
      );

      const data = await res.json();

      console.log("SEARCH RESULT:", data);

      if (!data || data.length === 0) {
        alert("No result found");
      }

      setResults(data);
    } catch (err) {
      console.error(err);
      alert("Error Sending Barcode");
    }
  }

  function addToCart(item) {
    if (cartItems.includes(item)) return;

    setCartItems(prev => [...prev, item]);
    setResults([]);
    setBarcode("");
  }

  async function signOut() {
    if (!cartItems.length) {
      alert("Cart is empty");
      return;
    }

    try {
      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "signout",
          customerInfo,
          items: cartItems
        })
      });

      const data = await res.json();
      console.log("SCRIPT RESPONSE:", data);

      if (!data.success) {
        throw new Error(data.error || "Unknown Error");
      }

      alert("Samples Signed Out");

      setCartItems([]);
      setCustomerInfo({
        name: "",
        number: "",
        employee: ""
      });

      setMode("menu")

    } catch (err) {
      console.error(err);
      alert("Sign out failed ❌");
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-10 space-y-6">

      {/* INFO STEP */}
      {step === "info" && (
        <>
          <h1 className="text-2xl font-bold text-center">Customer Info</h1>

          <input
            placeholder="Customer Name"
            className="border p-3 w-full"
            onChange={(e) =>
              setCustomerInfo(prev => ({ ...prev, name: e.target.value }))
            }
          />

          <input
            placeholder="Customer Number"
            className="border p-3 w-full"
            onChange={(e) =>
              setCustomerInfo(prev => ({ ...prev, number: e.target.value }))
            }
          />

          <input
            placeholder="Employee Name"
            className="border p-3 w-full"
            onChange={(e) =>
              setCustomerInfo(prev => ({ ...prev, employee: e.target.value }))
            }
          />

          <button
            className="w-full bg-blue-600 text-white p-4 rounded-xl"
            onClick={() => {
              if (!customerInfo.name || !customerInfo.number || !customerInfo.employee) {
                alert("Fill all fields");
                return;
              }

              setStep("search");
            }}
          >
            Proceed
          </button>

          <button
            className="w-full bg-gray-400 p-4 rounded-xl"
            onClick={() => setMode("menu")}
          >
            Back
          </button>
        </>
      )}

      {/* SEARCH STEP */}
      {step === "search" && (
        <>
          <h1 className="text-2xl font-bold text-center">Search Samples</h1>

          <button
            className="bg-gray-500 text-white p-3 rounded-xl"
            onClick={() => setScannerOpen(true)}
          >
            Scan Barcode
          </button>

          <input
            placeholder="Enter Barcode"
            className="border p-3 w-full"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
          />

          <button
            className="bg-blue-600 text-white p-3 rounded-xl"
            onClick={() => searchBarcode(barcode)}
          >
            Search
          </button>

          {/* RESULTS */}
          {results.map((item, i) => (
            <div key={i} className="border p-3 rounded">
              {item}
              <button
                className="ml-4 bg-blue-500 text-white px-2 py-1 rounded"
                onClick={() => addToCart(item)}
              >
                Add
              </button>
            </div>
          ))}

          {/* CART */}
          <h3 className="font-bold">Cart</h3>

          {cartItems.map((item, i) => (
            <div key={i} className="flex justify-between border p-2 rounded">
              <span>{item}</span>
              <span
                className="text-red-500 cursor-pointer"
                onClick={() =>
                  setCartItems(cartItems.filter(x => x !== item))
                }
              >
                ✕
              </span>
            </div>
          ))}

          <button
            className="w-full bg-green-600 text-white p-4 rounded-xl"
            onClick={signOut}
          >
            Sign Out
          </button>

          <button
            className="w-full bg-gray-400 p-4 rounded-xl"
            onClick={() => setStep("info")}
          >
            Back
          </button>

          {scannerOpen && (
            <ScannerModal
              onClose={() => setScannerOpen(false)}
              onSelect={(item) => {
                const scannedCode = 
                  item.Barcode || 
                  item.barcode || 
                  item["Barcode"] ||
                  item["Item Code"];

                if (!scannedCode) {
                  alert("No barcode found on item");
                  return;
                }

                setBarcode(scannedCode);
                setScannerOpen(false);
                searchBarcode(scannedCode);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}