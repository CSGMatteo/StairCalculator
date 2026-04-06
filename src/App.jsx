import React, { useState } from "react";
import { Card, CardContent } from "./components/ui/card.jsx";
import { Button } from "./components/ui/button.jsx";
import './index.css'

// Piece definitions (feet)
const PIECE_TYPES = {
  box: { w: 3, h: 1.75, installCost: 12 },
  open1: { w: 4, h: 1.75, installCost: 18 },
  open2: { w: 6, h: 1.75, installCost: 30 },
  pie: { w: 4, h: 3, installCost: 18 }
};


const ROLL_WIDTH = 12;

const minInstallCost = 300;

const minRemovalCost = 125;

// Simple packing heuristic (grid-based scanning)
function calculateLength(pieces) {
  const GRID = 0.25;
  const WIDTH = Math.floor(ROLL_WIDTH / GRID);
  const HEIGHT = 500;

  const grid = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0));

  const toGrid = (v) => Math.round(v / GRID);

  function canPlace(x, y, w, h) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if (grid[y + dy]?.[x + dx] === 1) return false;
      }
    }
    return true;
  }

  function place(x, y, w, h) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        grid[y + dy][x + dx] = 1;
      }
    }
  }

  function findSpot(w, h) {
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x <= WIDTH - w; x++) {
        if (canPlace(x, y, w, h)) return { x, y };
      }
    }
    return null;
  }

  let maxY = 0;

  // Sort largest first
  pieces.sort((a, b) => (b.h * b.w) - (a.h * a.w));

  for (const p of pieces) {
    const w = toGrid(p.w);
    const h = toGrid(p.h);

    const spot = findSpot(w, h);
    if (!spot) continue;

    place(spot.x, spot.y, w, h);
    maxY = Math.max(maxY, spot.y + h);
  }

  return maxY * GRID;
}

export default function App() {
  const [step, setStep] = useState("start");
  const [landing, setLanding] = useState(false);
  const [landingSize, setLandingSize] = useState({ w: 0, h: 0 });
  const [cost, setCost] = useState(null)
  const [removal, setRemoval] = useState(false);
  const [install, setInstall] = useState(false);
  const [carpetTotal, setCarpetTotal] = useState(null)
  const [installTotal, setInstallTotal] = useState(null)
  const [grandTotal, setGrandTotal] = useState(null)
  

  const [counts, setCounts] = useState({
    box: 0,
    open1: 0,
    open2: 0,
    pie: 0
  });

  const [result, setResult] = useState(null);

  function buildPieces() {
    const pieces = [];

    if (landing) {
      pieces.push({ w: landingSize.w, h: landingSize.h });
    }

    for (let i = 0; i < counts.box; i++) pieces.push(PIECE_TYPES.box);
    for (let i = 0; i < counts.open1; i++) pieces.push(PIECE_TYPES.open1);
    for (let i = 0; i < counts.open2; i++) pieces.push(PIECE_TYPES.open2);
    for (let i = 0; i < counts.pie; i++) pieces.push(PIECE_TYPES.pie);

    return pieces;
  }

  function runCalculation() {
    const pieces = buildPieces();


     let best = Infinity;

      // 1. Try width-first (very important)
      let sortedByWidth = [...pieces].sort((a, b) => b.w - a.w);
      let len1 = calculateLength(sortedByWidth);
      if (len1 < best) best = len1;

      // 2. Try height-first
      let sortedByHeight = [...pieces].sort((a,b) => b.h - a.h);
      let len2 = calculateLength(sortedByHeight);
      if (len2 < best) best = len2;

      // 3. Try MANY random layouts (this is the key fix)
      for (let i = 0; i < 25; i++) {
        let shuffled = [...pieces].sort(() => Math.random() - 0.5);
        let len = calculateLength(shuffled);
        if (len < best) best = len;
      }

      setResult(best.toFixed(2));
      setStep("result");
  }

  function CostCalculation() {
    let carpetTotal = (parseFloat(result || 0) * ROLL_WIDTH) * parseFloat(cost || 0);
    let installTotal = 0;

   if (install) {
     for (let key in counts) {
       const count = counts[key];
       const costPerStep = PIECE_TYPES[key].installCost;

        installTotal += count * costPerStep;
     }

     installTotal += minInstallCost;

     if (removal) {
       installTotal += minRemovalCost;
     }
    }

    const grandTotal = parseFloat(
      ((carpetTotal + installTotal) * 1.13).toFixed(2));

    // save everything
    setCarpetTotal(carpetTotal);
    setInstallTotal(installTotal);
    setGrandTotal(grandTotal);
    setStep("resultinstallcost");
  }

  function resetApp() {
  setStep("start");
  setLanding(false);
  setLandingSize({ w: 0, h: 0 });
  setCounts({
    box: 0,
    open1: 0,
    open2: 0,
    pie: 0
  });
  setResult(null);
  setCost(null);
  setRemoval(false);
  setInstall(false);
  setCarpetTotal(null);
  setInstallTotal(null);
  setGrandTotal(null);
}


  return (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-700 p-6">
    <div className="w-full max-w-3xl">
      
      {step === "start" && (
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
          <h1 className="text-3xl font-bold text-center">
            Stair Carpet Calculator
          </h1>

          <button
            className="w-full text-xl py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
            onClick={() => setStep("landing")}
          >
            Start Stair Calculation
          </button>
        </div>
      )}

      {step === "landing" && (
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
         <h2 className="text-3xl font-bold text-center">
          Is there a landing?
        </h2>

        <div className="flex gap-4">
           <button
            className="flex-1 py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
             onClick={() => {
              setLanding(true);
              setStep("landingSize");
              }}
             >
             Yes
           </button>

           <button
             className="flex-1 py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
              onClick={() => {
               setLanding(false);
               setStep("stairs");
              }}
              >
              No
            </button>
        </div>
        </div>
      )}

      {step === "landingSize" && (
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
          <h2 className="text-2xl font-semibold text-center">
            Enter Landing Size (ft)
          </h2>

          <input
            type="number"
            placeholder="Width"
            className="border p-4 w-full text-lg rounded-lg"
            onChange={(e) =>
              setLandingSize({
                ...landingSize,
                w: parseFloat(e.target.value),
              })
            }
          />

          <input
            type="number"
            placeholder="Length"
            className="border p-4 w-full text-lg rounded-lg"
            onChange={(e) =>
              setLandingSize({
                ...landingSize,
                h: parseFloat(e.target.value),
              })
            }
          />

          <button
            className="w-full text-lg py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
            onClick={() => setStep("stairs")}
          >
            Next
          </button>
        </div>
      )}

      {step === "stairs" && (
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <h2 className="text-2xl font-semibold text-center">
            Enter Stair Counts
          </h2>

          {[
            ["box", "Box Steps"],
            ["open1", "Open 1 Side"],
            ["open2", "Double Open"],
            ["pie", "Pie"],
          ].map(([key, label]) => (
            <div key={key} className="space-y-2">
              <label className="font-medium">{label}</label>
              <input
                type="number"
                className="w-full p-4 test-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-blue-500"
                onChange={(e) =>
                  setCounts({
                    ...counts,
                    [key]: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          ))}

          <button
            className="w-full text-lg py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
            onClick={runCalculation}
          >
            Calculate
          </button>
        </div>
      )}

      {step === "result" && (
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
          <h2 className="text-2xl font-semibold">Result</h2>

          <p className="text-lg">
            Total Carpet Length Required:
          </p>

          <p className="text-5xl font-bold text-blue-600">{result} ft</p>

          <button
            className="w-full text-lg py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
            onClick={resetApp}
          >
            Start Over
          </button>
          <button
            className="w-full text-lg py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
            onClick={() => setStep("IsInstall")}
          >
            Calculate Cost
          </button>
        </div>
      )}

      {step == "IsInstall" && (
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
         <h2 className="text-3xl font-bold text-center">
          Are We Installing It
        </h2>

        <div className="flex gap-4">
           <button
            className="flex-1 py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
             onClick={() => {
              setInstall(true);
              setStep("Removal");
              }}
             >
             Yes
           </button>

           <button
             className="flex-1 py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
              onClick={() => {
               setInstall(false);
               setStep("Cost");
              }}
              >
              No
            </button>
        </div>
        </div>
      )} 

      {step == "Removal" && (
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
         <h2 className="text-3xl font-bold text-center">
          Is There Removal?
        </h2>

        <div className="flex gap-4">
           <button
            className="flex-1 py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
             onClick={() => {
              setRemoval(true);
              setStep("Cost");
              }}
             >
             Yes
           </button>

           <button
             className="flex-1 py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
              onClick={() => {
               setRemoval(false);
               setStep("Cost");
              }}
              >
              No
            </button>
        </div>
        </div>
      )} 

      {step == "Cost" && (
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
          <h1 className="text-3xl font-bold text-center">
            What Is The Cost Of The Carpet? ($/sqft)
          </h1>

          <input
            type="number"
            placeholder="Cost ($/sqft)"
            className="border p-4 w-full text-lg rounded-lg"
            onChange={(e) =>
              setCost(parseFloat(e.target.value) || 0)
            }
          />

          <button
            className="w-full text-xl py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
            onClick={CostCalculation}
          >
            Calculate
          </button>
        </div>
      )}

      {step === "resultinstallcost" && (
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
          <h2 className="test-2xl font-semibold">Approximate Cost</h2>

          <p className="text-lg">
            {install
              ? "Approximate Cost Of Carpet + Install (Including Tax)"
              : "Approximate Cost of Carpet"}
          </p>

          <p className="text-5xl font-bold text-blue-600">${grandTotal}</p>

          <button
            className="w-full text-lg py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
            onClick={resetApp}
          >
            Start Over
          </button>
        </div>
      )}

    </div>
  </div>
);
}