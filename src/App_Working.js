import React, { useState } from "react";
import { Card, CardContent } from "./components/ui/card.jsx";
import { Button } from "./components/ui/button.jsx";
import './index.css'
import { parse } from "postcss";


// Piece definitions (feet)
const PIECE_TYPES = {
  box: { w: 3, h: 1.75 },
  open1: { w: 4, h: 1.75 },
  open2: { w: 6, h: 1.75 },
  pie: { w: 4, h: 3 },
  curved: { w: 4, h: 2.50 }
};

const INSTALL_COSTS = {
  box: { normal : 12, runner: 15 },
  open1: { normal: 18, runner: 15},
  open2: { normal: 30, runner: 15 },
  pie: { normal: 18, runner: 25 },
  curved: { normal: 30, runner: 25}
}

const ROLL_WIDTH = 12;

const minStairInstallCost = 300;
const minStairRemovalCost = 125;

const padcost = 0.85

const WASTE_FACTOR = 1.05


const FLOORING = {
  vinylCLick: {
    minInstall: 375,
    installRate: 2.25
  },
  vinylGlue: {
    minInstall: 375,
    installRate: 1.95
  },
  vinylSheet: {
    minInstall: 300,
    installRate: 0
  },
  Laminate: {
    minInstall: 350,
    installRate: 2.35
  },
  Hardwood: {
    minInstall: 0,
    rates: {
      nailDown: 2.75,
      floating: 2.95,
      fullSpread: 4.75,
      glueAssist: 3.00
    } 
  },
  Carpet: {
    minInstall: 300,
    installRate: 0.95
  },
  Tile: {
    minInstall: 0,
    installRate: 0
  },
}

// Simple packing heuristic (grid-based scanning)
function calculateLength(pieces, landingHeight = 0) {
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

    const remainingWidth = WIDTH - (x + w);

    if (remainingWidth > 0 && remainingWidth < w * 0.6) {
      return false;
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

    for (let y = landingHeight / GRID; y < HEIGHT; y++) {
      for (let x = 0; x <= WIDTH - w; x++) {
        if (canPlace(x, y, w, h)) return { x, y };
      }
    }

    for (let y = 0; y < landingHeight / GRID; y++) {
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
  const [mode, setmode] = useState("menu");
  const [step, setStep] = useState("main");
  const [landing, setLanding] = useState(false);
  const [landingSize, setLandingSize] = useState({ w: 0, h: 0 });
  const [cost, setCost] = useState(null)
  const [removal, setRemoval] = useState(false);
  const [install, setInstall] = useState(false);
  const [carpetTotal, setCarpetTotal] = useState(null)
  const [installTotal, setInstallTotal] = useState(null)
  const [grandTotal, setGrandTotal] = useState(null)
  const [wallWall, setwallWall] = useState(false)
  const [runner, setRunner] = useState(false)
  const [runnerLanding, setRunnerLanding] = useState(null)
  const [padTotal, setPadTotal] = useState(null)
  const [rWidth, setRWidth] = useState(null)
  const [patRepeatSize, setPatRepeatSize] = useState(null)
  const [patRepeat, setPatRepeat] = useState(false)
  const [bindingTotal, setBindingTotal] = useState(0)

  const [vinylClickInstall, setVinylClickInstall] = useState(false)
  const [vinylGlueInstall, setVinylGlueInstall] = useState(false)
  const [vinylSheetInstall, setVinylSheetInstall] = useState(false)
  const [laminateInstall, setLaminateInstall] = useState(false)
  const [hardwoodInstall, setHardwoodInstall] = useState(false)
  const [carpetInstall, setCarpetInstall] = useState(false)
  const [tileInstall, setTileInstall] = useState(false)
  
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [hardwoodType, setHardwoodType] = useState(null)

  const [rooms, setRooms] = useState([]);
  const [roomInput, setRoomInput] = useState({ width: "", length: "" });
  const [roomCost, setRoomCost] = useState(null)
  const [roomTotal, setRoomTotal] = useState(null)
  const [roomInstall, setRoomInstall] = useState(false)
  const [roomRemoval, setRoomRemoval] = useState(false)

  const [boxsqft, setBoxsqft] = useState(null)
  const [numberOfBoxes, setNumberOfBoxes] = useState(null)

  const [button1, setButton1] = useState(false);
  const [button2, setButton2] = useState(false);
  const [button3, setButton3] = useState(false);
  const [button4, setButton4] = useState(false);
  const [button5, setButton5] = useState(false);
  const [button6, setButton6] = useState(false);

  const buttonBackgrounds = {
    true: "bg-green-600 hover:bg-green-700",
    false: "bg-red-600 hover:bg-red-700"
  }

  const formatMoney = (value) =>
    value?.toLocaleString("en-CA", {
      style: "currency",
      currency: "CAD"
    });

  
  const backgrounds = {
    menu: "bg-gradient-to-br from-blue-500 to-indigo-700",
    stairs: "bg-gradient-to-br from-cyan-500 to-indigo-700",
    maintenance: "bg-gradient-to-br from-amber-400 to-orange-600",
    rooms: "bg-gradient-to-br from-cyan-500 to-indigo-700"
  };

  const backgroundClass = backgrounds[mode] || "bg-gray-100";

  

  const [counts, setCounts] = useState({
    box: 0,
    open1: 0,
    open2: 0,
    pie: 0,
    curved: 0
  });

  const [result, setResult] = useState(null);
// #region Stairs Logic
  function calcrunnerwidth() {
    let rwidth = 0

    if (patRepeatSize > 0) {
      rwidth = Math.ceil(rWidth / patRepeatSize) * patRepeatSize
    } else {
      rwidth = rWidth}

    rwidth = rwidth / 12

    console.log("The Runner Width Will Be:", rwidth)

    setRWidth(rwidth)
    setStep("landing")
  }
  function buildPieces() {
    const pieces = [];

    const RUNNER_PIECE_TYPES = {
      rbox: { w: rWidth, h: 1.75 },
      ropen1: { w: rWidth, h: 1.75 },
      ropen2: { w: rWidth, h: 1.75 },
      rpie: { w: rWidth, h: 3 },
      rcurved: { w: rWidth, h: 2.50 }
    };
    let landingHeight = 0

    if (landing) {
      landingHeight = landingSize.h;
    }

    if (landing) {
      pieces.push({ w: landingSize.w, h: landingSize.h });
    }
    
    if (runner) {
      for (let i = 0; i < counts.box; i++) pieces.push(RUNNER_PIECE_TYPES.rbox);
      for (let i = 0; i < counts.open1; i++) pieces.push(RUNNER_PIECE_TYPES.ropen1);
      for (let i = 0; i < counts.open2; i++) pieces.push(RUNNER_PIECE_TYPES.ropen2);
      for (let i = 0; i < counts.pie; i++) pieces.push(RUNNER_PIECE_TYPES.rpie);
      for (let i = 0; i < counts.curved; i++) pieces.push(RUNNER_PIECE_TYPES.rcurved);
    } else {
      for (let i = 0; i < counts.box; i++) pieces.push(PIECE_TYPES.box);
      for (let i = 0; i < counts.open1; i++) pieces.push(PIECE_TYPES.open1);
      for (let i = 0; i < counts.open2; i++) pieces.push(PIECE_TYPES.open2);
      for (let i = 0; i < counts.pie; i++) pieces.push(PIECE_TYPES.pie);
      for (let i = 0; i < counts.curved; i++) pieces.push(PIECE_TYPES.curved);
    }
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
      for (let i = 0; i < 100; i++) {
        let shuffled = [...pieces].sort(() => Math.random() - 0.5);
        let len = calculateLength(shuffled);
        if (len < best) best = len;
      }

      setResult(best.toFixed(2));
      setStep("result");
  }
  function getRunnerLength() {
    return (
      (counts.box || 0) * 1.75 +
      (counts.open1 || 0) * 1.75 +
      (counts.open2 || 0) * 1.75 +
      (counts.pie || 0) * 3 +
      (counts.curved || 0) * 2.5
    );
  }
  function getLandingPerimeter() {
    if (landing) {
      const w = parseFloat(landingSize.w) || 0;
      const h = parseFloat(landingSize.h) || 0;
      return (2 * (w + h));
    } else {
      return (0);
    }
  }
  function BindingCalc() {
    const BindingCost = 1.5
    
    return(
      (getLandingPerimeter() + (getRunnerLength() * 2)) * BindingCost
    );
  }
  function getInstallCost(key) {
    return runner
      ? INSTALL_COSTS[key].runner
      : INSTALL_COSTS[key].normal;
  }
  function CostCalculation() {
    let carpetTotal = (parseFloat(result || 0) * ROLL_WIDTH) * parseFloat(cost || 0);
    let installTotal = 0;
    let padTotal = (parseFloat(result || 0) * ROLL_WIDTH) * padcost

   if (install) {
     for (let key in counts) {
       const count = counts[key];
       const costPerStep = getInstallCost(key);

        installTotal += count * costPerStep;
     }

     installTotal += minStairInstallCost;

     if (removal) {
       installTotal += minStairRemovalCost;
     }
    }
    const bindingTotal = BindingCalc();

    const grandTotal = parseFloat(
      ((carpetTotal + installTotal + padTotal + bindingTotal) * 1.13).toFixed(2));

    // save everything
    setCarpetTotal(carpetTotal);
    setInstallTotal(installTotal);
    setPadTotal(padTotal)
    setGrandTotal(grandTotal);
    setStep("resultinstallcost");

    console.log("Total Binding Cost:", bindingTotal)
    console.log("Total Cost Of Carpet:", carpetTotal)
    console.log("Total Cost of Install Portion:", installTotal)
    console.log("Total Cost Of Pad:", padTotal)
    console.log("RunnerLegth:", getRunnerLength())
    console.log("Landing Perimeter:", getLandingPerimeter())
  }
// #endregion

  function addRoom(room) {
    if (!room.width || !room.length) return;
    setRooms(prev => [...prev, room]);
  }

  function getRoomsArea() {
    return WASTE_FACTOR * rooms.reduce((total, room) => {
      return total + (room.width * room.length);
    }, 0);
  }

  function getProductArea() {
    const roomsArea = getRoomsArea();
    let totalArea = 0;

    if (boxsqft > 0) {
      totalArea = Math.ceil(roomsArea / boxsqft) * boxsqft
    } else {
      totalArea = roomsArea
    }

    setNumberOfBoxes(totalArea / boxsqft)
    return(totalArea)
  }

  function calculateRoomTotal() {
    const totalArea = getProductArea();
    const total = totalArea * roomCost;

    setRoomTotal(total);
    setStep("roomResult")
  }

  function resetApp() {
  setmode("menu")
  setStep("main");
  setLanding(false);
  setLandingSize({ w: 0, h: 0 });
  setCounts({
    box: 0,
    open1: 0,
    open2: 0,
    pie: 0,
    curved: 0
  });
  setResult(null);
  setCost(null);
  setRemoval(false);
  setInstall(false);
  setCarpetTotal(null);
  setInstallTotal(null);
  setGrandTotal(null);
  setwallWall(false);
  setRunner(false);
  setRunnerLanding(null);
  setRWidth(null);
  setPatRepeatSize(null);

  setVinylClickInstall(false);
  setVinylGlueInstall(false);
  setVinylSheetInstall(false);
  setLaminateInstall(false);
  setHardwoodInstall(false);
  setCarpetInstall(false);
  setTileInstall(false);
  setRooms([]);
  setRoomInput({ width: 0, length: 0 });
  setRoomCost(null);
  setRoomTotal(null);
  setSelectedFloor(null)
  setBoxsqft(null)
  setNumberOfBoxes(null)
}

  return (
  <div className={`min-h-screen flex items-center justify-center ${backgroundClass} animate-gradient p-6`}>
    <div className="w-full max-w-3xl">

      {mode === "menu" && (
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
          <h1 className="text-3xl font-bold text-center">
            What Would You Like To Calculate?
          </h1>

          <button
            className="w-full text-xl py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
            onClick={() => {
              setmode("stairs")
              setStep("StairCalc")
            }}
          >
           Stairs
          </button>

          <button
            className="w-full text-xl py-6 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition"
            onClick={() => {
              setmode("rooms")
              setStep("decideFloorRooms");
            }}
          >
            Room Calculator
          </button>

          <button
            className="w-full text-xl py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
            onClick={() => {
              setmode("maintenance")
              setStep("Maintenance")
            }}
          >
            Other
          </button>
        </div>
      )}
      {mode === "stairs" && (
        <>
        <button
          onClick={resetApp}
          className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-600 font-semibold transition"
        >
          Main Menu
        </button>

        {step === "StairCalc" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h1 className="text-3xl font-bold text-center">
              How Will The Stair be Carpeted?
           </h1>

            <button
              className="w-full text-xl py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
              onClick={() => {
                setwallWall(true)
                setStep("landing")}}
           >
              Carpeted Wall to Wall
            </button>

            <button
              className="w-full text-xl py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
              onClick={() => {
                setRunner(true)
                setStep("RunnerWidth")}}
            >
              Carpet Runner
            </button>
         </div>
        )}
        {step == "RunnerWidth" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h1 className="text-3xl font-bold text-center">
              What is the desired width of the runner (In)?
            </h1>

            <input
              type="number"
              placeholder="Runner Width (In)"
              className="border p-4 w-full text-lg rounded-lg"
              onChange={(e) =>
                setRWidth(parseFloat(e.target.value) || 0)
              }
            />

            <button
              className="w-full text-xl py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
              onClick={() => setStep("Pattern")}
            >
              Next
            </button>
          </div>
        )}
        {step == "Pattern" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h1 className="text-3xl font-bold text-center">
              What is the pattern repeat if any?
            </h1>

            <input
              type="number"
              placeholder="Pattern Repeat"
              className="border p-4 w-full text-lg rounded-lg"
              onChange={(e) =>
                setPatRepeatSize(parseFloat(e.target.value) || 0)
              }
            />
            
            <div className="flex gap-4">
              <button
                className="flex-1 text-lg py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                onClick={() => {
                  calcrunnerwidth();
                }}
            >
                Yes
              </button>

              <button
                className="flex-1 text-lg py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                onClick={() => {
                  calcrunnerwidth();
                }}
            >
                No
              </button>
            </div>
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
                if (runner) {
                  setStep("landingRunner");
                } else if (wallWall) {
                  setStep("landingWall");
                }
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
        {step === "landingRunner" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h1 className="text-3xl font-bold text-center">
              How much does the landing turn?
            </h1>

            <button
              className="w-full text-xl py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
              onClick={() => {
                setRunnerLanding(90)
                setLandingSize({ w: 4, h: 4 })
                setStep("stairs")}}
            >
              90 Degree Turn
            </button>

            <button
              className="w-full text-xl py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
              onClick={() => {
                setRunnerLanding(180)
                setLandingSize({ w: 8, h: 4 })
                setStep("stairs")}}
            >
              180 Degree Turn
            </button>
          </div>
        )}
        {step === "landingWall" && (
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
              ["curved", "Curved"],
            ].map(([key, label]) => (
              <div key={key} className="space-y-2">
                <label className="font-medium">{label}</label>
                <input
                  type="number"
                  className="w-full p-4 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-blue-500"
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
            <h2 className="text-2xl font-semibold">Approximate Cost</h2>

            <p className="text-lg">
              {install
                ? "Approximate Cost Of Carpet + Install (Including Tax)"
                : "Approximate Cost of Carpet"}
            </p>

            <p className="text-5xl font-bold text-blue-600">{formatMoney(grandTotal)}</p>

            <button
              className="w-full text-lg py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
              onClick={resetApp}
            >
              Start Over
            </button>
          </div>
        )}
        </>
      )}
      {mode === "maintenance" && (
        <>
        {step === "Maintenance" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h1 className="text-3xl font-bold text-center">
              This Section Is Currently Not Available
            </h1>

            <button
              className="w-full text-xl py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
              onClick={resetApp}
            >
              Main Menu
            </button>
          </div>
        )}
        </>
      )}
      {mode === "rooms" && (
        <>
        <button
          onClick={resetApp}
          className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-600 font-semibold transition"
        >
          Main Menu
        </button>

        {step === "decideFloorRooms" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h1 className="text-xl font-bold text-center">
              What flooring is being put in?
            </h1>

            <div className="grid grid-cols-3 gap-4">
              <button
                className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                onClick={() => {
                  setSelectedFloor("vinylCLick")
                  setVinylClickInstall(true)
                  setStep("roomsInput")
                }}
              >
                Vinyl Click
              </button>

              <button
                className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                onClick={() => {
                  setSelectedFloor("vinylGlue")
                  setVinylGlueInstall(true)
                  setStep("roomsInput")
                }}
              >
                Vinyl Glue
              </button>

              <button
                className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                onClick={() => {
                  setSelectedFloor("vinylSheet")
                  setVinylSheetInstall(true)
                  setStep("roomsInput")
                }}
              >
                Vinyl Sheet
              </button>

              <button
                className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                onClick={() => {
                  setSelectedFloor("Laminate")
                  setLaminateInstall(true)
                  setStep("roomsInput")
                }}
              >
                Laminate
              </button>

              <button
                className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                onClick={() => {
                  setSelectedFloor("Hardwood")
                  setHardwoodInstall(true)
                  setStep("roomsInput")
                }}
              >
                Hardwood
              </button>

              <button
                className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                onClick={() => {
                  setSelectedFloor("Carpet")
                  setCarpetInstall(true)
                  setStep("roomsInput")
                }}
              >
                Carpet
              </button>

              <button
                className="col-start-2 py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                onClick={() => {
                  setSelectedFloor("Tile")
                  setTileInstall(true)
                  setStep("roomsInput")
                }}
              >
                Tile
              </button>
            </div>
          </div>
        )}

        {step === "roomsInput" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h1 className="text-xl font-bold text-center">
              Enter Room Size (ft)
            </h1>

            <input
              type="number"
              placeholder="width"
              value={roomInput.width}
              className="border p-4 w-full text-lg rounded-lg"
              onChange={(e) =>
                setRoomInput({
                  ...roomInput,
                  width: parseFloat(e.target.value) || "",
                })
              }
            />

            <input
              type="number"
              placeholder="length"
              value={roomInput.length}
              className="border p-4 w-full text-lg rounded-lg"
              onChange={(e) =>
                setRoomInput({
                  ...roomInput,
                  length: parseFloat(e.target.value) || "",
                })
              }
            />

            <div className="text-left">
              {rooms.map((room, i) => (
                <p key={i}>
                  Room {i + 1}: {room.width} x {room.length}
                </p>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                className="flex-1 py-4 bg-blue-600 text-white rounded-xl"
                onClick={() => {
                  addRoom({ ...roomInput });
                  setRoomInput({ width: 0, length: 0 });
                }}
              >
                Add Another Room
              </button>

              <button
                className="flex-1 py-4 bg-green-600 text-white rounded-xl"
                onClick={() => {
                  addRoom({ ...roomInput });
                  setStep("roomQuantity");
                }}
              > That's All 
              </button>
            </div>
          </div>
        )}

        {step === "roomQuantity" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h2 className="text-3xl font-bold text-center">
              Total square footage
            </h2>

            <p>
              Including waste
            </p>

            <p className="text-5xl font-bold text-blue-600">
              {getRoomsArea()} sqft
            </p>

            <button
              className="w-full text-lg py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
              onClick={resetApp}
            >
              Start Over
            </button>
            <button
              className="w-full text-lg py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
              onClick={() => setStep("roomProductInfo")}
            >
              Calculate Cost
            </button>
          </div>
        )}

        {step === "roomProductInfo" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h1 className="text-3xl font-bold text-center">
              How much sqft per box?
            </h1>

            <input
              type="number"
              placeholder="sqft/box"
              className="border p-4 w-full text-lg rounded-lg"
              onChange={(e) =>
                setBoxsqft(parseFloat(e.target.value) || 0)
              }
            />

            <div className="grid grid-cols-2 gap-4">
              <button
                className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                onClick={() => {setStep("roomCost")}}
              >
                Just Product
              </button>

              <button
                className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                onClick={() => {
                  setRoomInstall(true)
                  if (selectedFloor === "Hardwood") {
                    setStep("hwInstallMethod")
                  } else {
                    setStep("roomremoval")}
                }}
              >
                Install Costs
              </button>
            </div>
          </div>
        )}

        {step === "roomInstall" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h1 className="text-3xl font-bold text-center">
              Are we installing?
            </h1>

            <div className="grid grid-cols-2 gap-4">
              <button
                className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                onClick={() => {
                  setRoomInstall(true)
                  if (selectedFloor === "Hardwood") {
                    setStep("hwInstallMethod")
                  } else {
                  setStep("roomremoval")}
                }}
              >
                Yes
              </button>

              <button
                className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                onClick={() => {
                  setRoomInstall(false)
                  setStep("roomremoval")
                }}
              >
                No
              </button>
            </div>
          </div>

        )}

        {step === "hwInstallMethod" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h1 className="text-3xl font-bold text-center">
              How will the hardwood be put down?
            </h1>

            <div className="grid grid-cols-2 gap-4">

              <button
                className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transitions"
                onClick={() => {
                  setHardwoodType("nailDown")
                  setStep("roomremoval")
                }}
              >
                Nail Down
              </button>

              <button
                className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl fort-semibold transition"
                onClick={() => {
                  setHardwoodType("floating")
                  setStep("roomremoval")
                }}
              >
                Floating
              </button>

              <button
                className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl fort-semibold transition"
                onClick={() => {
                  setHardwoodType("fullSpread")
                  setStep("roomremoval")
                }}
              >
                Full Spread
              </button>

              <button
                className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl fort-semibold transition"
                onClick={() => {
                  setHardwoodType("glueAssist")
                  setStep("roomremoval")
                }}
              >
                Glue Assist
              </button>
            </div>
          </div>
        )}

        {step === "roomremoval" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h1 className="text-3xl font-bold text-center">
              Is there removal?
            </h1>

            <div className="grid grid-cols-2 gap-4">
              <button
                className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibolded transition"
                onClick={() => {
                  setRoomRemoval(true)
                  setStep("roomCost")
                }}
              >
                Yes
              </button>

              <button
                className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                onClick={() => {
                  setRoomRemoval(false)
                  setStep("additionals")
                }}
              >
                No
              </button>
            </div>
          </div>
        )}

        {step === "additionals" && (
          <div className= "bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h1 className="text-3xl font-bold"
            >
              Any additional costs?
            </h1>

            <div className="grid grid-cols-3 gap-4">
              <button
                className={`py-6 text-lg ${buttonBackgrounds[button1]} text-white rounded-xl font-semibold transition`}
                onClick={() => {
                  setButton1(!button1)
                }}
              >
                Button 1
              </button>

              <button
                className={`py-6 text-lg ${buttonBackgrounds[button2]} text-white rounded-xl font-semibold transition`}
                onClick={() => {
                  setButton2(!button2)
                }}
              >
                Button 2
              </button>

              <button
                className={`py-6 text-lg ${buttonBackgrounds[button3]} text-white rounded-xl font-semibold transition`}
                onClick={() => {
                  setButton3(!button3)
                }}
              >
                Button 3
              </button>

              <button
                className={`py-6 text-lg ${buttonBackgrounds[button4]} text-white rounded-xl font-semibold transition`}
                onClick={() => {
                  setButton4(!button4)
                }}
              >
                Button 4
              </button>

              <button
                className={`py-6 text-lg ${buttonBackgrounds[button5]} text-white rounded-xl font-semibold transition`}
                onClick={() => {
                  setButton5(!button5)
                }}
              >
                Button 5
              </button>

              <button
                className={`py-6 text-lg ${buttonBackgrounds[button6]} text-white rounded-xl font-semibold transition`}
                onClick={() => {
                  setButton6(!button6)
                }}
              >
                Button 6
              </button>

            </div>
          </div>
        )}

        {step === "roomCost" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h1 className="text-3xl font-bold"
            >
              Cost per sq ft
            </h1>

            <input
              type="number"
              placeholder="$ / sqft"
              className="border p-4 w-full text-lg rounded-lg"
              onChange={(e) => 
                setRoomCost(parseFloat(e.target.value) || 0)
              }
            />

            <button
              className="w-full py-4 bg-blue-600 text-white rounded-xl"
              onClick={calculateRoomTotal}
            >
              Calculate
            </button>
          </div>
        )}

        {step === "roomResult" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h2 className="text-2xl font-semibold"
            >
              Room Total
            </h2>

            <p>
              Total Area: {getRoomsArea()} sqft
            </p>

            <p>
              Number of Cartons: {numberOfBoxes} Cartons
            </p>

            <p className="text-5xl font-bold text-green-600">
              {roomTotal?.toLocaleString("en-CA", {
                style: "currency",
                currency: "CAD"
              })}
            </p>

            <button
              className="w-full py-4 bg-blue-600 text-white rounded-xl"
              onClick={resetApp}
            >
              Main Menu
            </button>
          </div>
        )}

        </>  
      )}

    </div>
  </div>
);
}