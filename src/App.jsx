import React, { useState } from "react";

// Piece definitions (feet)
const PIECE_TYPES = {
  box: { w: 3, h: 1.75 },
  open1: { w: 4, h: 1.75 },
  open2: { w: 6, h: 1.75 },
  pie: { w: 4, h: 3 }
};

const ROLL_WIDTH = 12;

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


  return (
    <div className="p-6 max-w-xl mx-auto">
      {step === "start" && (
          <div className="p-6 text-center">
            <h1 className="text-2xl font-bold mb-4">Stair Carpet Calculator</h1>
            <button onClick={() => setStep("landing")}>Start Stair Calculation</button>
          </div>
      )}

      {step === "landing" && (
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Is there a landing?</h2>
            <div className="flex gap-2">
              <button onClick={() => { setLanding(true); setStep("landingSize"); }}>Yes</button>
              <button onClick={() => { setLanding(false); setStep("stairs"); }}>No</button>
            </div>
          </div>
      )}

      {step === "landingSize" && (
          <div className="p-6 space-y-4">
            <h2 className="text-xl">Enter Landing Size (ft)</h2>
            <input
              type="number"
              placeholder="Width"
              className="border p-2 w-full"
              onChange={(e) => setLandingSize({ ...landingSize, w: parseFloat(e.target.value) })}
            />
            <input
              type="number"
              placeholder="Length"
              className="border p-2 w-full"
              onChange={(e) => setLandingSize({ ...landingSize, h: parseFloat(e.target.value) })}
            />
            <button onClick={() => setStep("stairs")}>Next</button>
          </div>
      )}

      {step === "stairs" && (
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Enter Stair Counts</h2>

            {[
              ["box", "Box Steps"],
              ["open1", "Open 1 Side"],
              ["open2", "Double Open"],
              ["pie", "Pie (4 x 3)"]
            ].map(([key, label]) => (
              <div key={key}>
                <label>{label}</label>
                <input
                  type="number"
                  className="border p-2 w-full"
                  onChange={(e) =>
                    setCounts({
                      ...counts,
                      [key]: parseInt(e.target.value) || 0
                    })
                  }
                />
              </div>
            ))}

            <button onClick={runCalculation}>Calculate</button>
          </div>
      )}

      {step === "result" && (
          <div className="p-6 text-center space-y-4">
            <h2 className="text-xl font-semibold">Result</h2>
            <p className="text-lg">Total Carpet Length Required:</p>
            <p className="text-2xl font-bold">{result} ft</p>
            <button onClick={() => setStep("start")}>Start Over</button>
          </div>
      )}
    </div>
  );
}
