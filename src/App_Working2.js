import React, { useState } from "react";
import { Card, CardContent } from "./components/ui/card.jsx";
import { Button } from "./components/ui/button.jsx";
import './index.css'
import { parse } from "postcss";
import ScannerModal from "./components/ScannerModal.jsx";


// #region Carpet Global Constants
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
// #endregion

// #region Room Global Constants
const WASTE_FACTOR = 1.05

const INITIAL_FURNITURE = {
  furniture: { amount: 0, cost: 100 },
  appliance: { amount: 0, cost: 50 },
  furnitureLg: { amount: 0, cost: 200},
}

const INITIAL_EXTRAS = {
  trim: { selected: false, cost: 0 },
  transitions: { selected: false, cost: 0 },
  floorPrep: { selected: false, cost: 0 },
  furniture: { selected: false, cost: 0 },
  vents: { selected: false, cost: 0 },
  other: { selected: false, cost: 0 },
};

const REMOVAL_COSTS = {
  carpet: 0.60,
  vinylClick: 1.15,
  vinylGlue: 1.75,
  laminate: 1.15,
  hardwood: 2.25,
  tile: 9.50,
};

const TRIM_TYPES = {
  "4in": { cost: 1.00, length: 12 },
  "5in": { cost: 1.50, length: 12 },
  "doorstop": { cost: 0.75, length: 10 },
  "custom": { cost: 0, length: 0 } // user fills this
};

const TRIM_INSTALL_RATES = {
  reinstall: 2.50,
  new: 3.50,
  doorstop: 2.00
};

const VENT_COSTS = {
  "4x10_black": 35.00,
  "4x10_grey": 45.00,
  "4x10_white": 45.00,
  "3x10_black": 45.00,
  "3x10_grey": 45.00,
  "3x10_white": 45.00,
  "custom": 0
};

const VENT_INSTALL_COST = 35; 

const FLOORING = {
  vinylClick: {
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

const MATERIAL_RULES = {
  vinylGlue: [
    { name: "Glue", coverage: 500, cost: 175 },
    { name: "Mahogany", coverage: 32, cost: 65 }
  ],

  Laminate: [
    { name: "Pad", coverage: 100, cost: 40, condition: (state) => !state.laminateHasPad }
  ],

  Hardwood: [
    { name: "Glue", coverage: 60, cost: 30, condition: (state) => state.hardwoodType === "glueAssist" }
  ]
};
// #endregion


export default function App() {
  
  const [mode, setmode] = useState("menu");
  const [step, setStep] = useState("main");
 
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

  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannedItem, setScannedItem] = useState(null)

  const [result, setResult] = useState(null);

  //
  // #region Carpet Function Constants
  //
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

  const [counts, setCounts] = useState({
    box: 0,
    open1: 0,
    open2: 0,
    pie: 0,
    curved: 0
  });
  //
  // #endregion
  //

  // #region Room Function Constants
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
  const [roomInput, setRoomInput] = useState({ width: "", length: "", removalType: ""});
  const [roomCost, setRoomCost] = useState(null)
  const [roomTotal, setRoomTotal] = useState(null)
  const [roomInstall, setRoomInstall] = useState(false)
  const [roomRemoval, setRoomRemoval] = useState(false)

  const [boxsqft, setBoxsqft] = useState(null)
  const [numberOfBoxes, setNumberOfBoxes] = useState(null)

  const [laminateHasPad, setLaminateHasPad] = useState(false)

  const [extras, setExtras] = useState(INITIAL_EXTRAS);

  const [trimMode, setTrimMode] = useState(null); // "global" | "separate"

  const [globalTrim, setGlobalTrim] = useState({
    method: "",
    type: "",
    customCost: 0
  });

  const [roomTrim, setRoomTrim] = useState([]);

  const [trimLength, setTrimLength] = useState(null);

  const [furniture, setFurniture]  = useState(INITIAL_FURNITURE);

  const [otherExtras, setOtherExtras] = useState(null)

  const [showExtrasMenu, setShowExtrasMenu] = useState(false);

  const [globalRemovalType, setGlobalRemovalType] = useState("");

  const [vents, setVents] = useState([
    { type: "", quantity: 0, customCost: 0 }
  ]);
  // #endregion

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
  
  // #region Room Logic

  function addRoom(room) {
    if (!room.width || !room.length) return;

    const perimeter = getRoomPerimeter(room);

    console.log("Room Added:", {
      width: room.width,
      length: room.length,
      perimeter: perimeter
    });

    const newRoom = {
      ...room,
      removalType: "",
      perimeter: perimeter
    };

    setRooms(prev => [...prev, newRoom]);
  }

  function getRoomPerimeter(room) {
    const width = room.width || 0;
    const length = room.length || 0;

    return 2 * (width + length);
  }

  function getTotalPerimeter() {
    return rooms.reduce((total, room) => {
      return total + getRoomPerimeter(room);
    }, 0);
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
      totalArea = roomsArea;
      setNumberOfBoxes(0);
    }

    setNumberOfBoxes(totalArea / boxsqft)
    return(totalArea)
  }

  function calculateRoomTotal() {
    const totalArea = getProductArea();

    const productCost = totalArea * roomCost;
    const removalCost = calculateRemovalCost();
    const extrasCost = calculateExtrasTotal();
    const materialCost = calculateMaterialCosts();
    const installCost = calculateInstallCost();

    const total = productCost + removalCost + extrasCost + materialCost + installCost;

    setRoomTotal(total);
    setStep("roomResult");
  }

  function calculateInstallCost() {
    if (!roomInstall) return 0;

    const totalArea = getProductArea();

    let rate = 0;
    let min = 0;

    const floor = FLOORING[selectedFloor];

    if (!floor) return 0;

    min = floor.minInstall || 0;

    if (selectedFloor === "Hardwood") {
      rate = floor.rates[hardwoodType] || 0;
    } else {
      rate = floor.installRate || 0;
    }

    let total = totalArea * rate;

    if (total < min) {
      total = min;
    }

    return total;
  }

  function calculateUnitsNeeded(area, coverage, cost) {
    const units = Math.ceil(area / coverage);
    return units * cost;
  }

  function calculateMaterialCosts() {
    const totalArea = getProductArea();
    const materials = MATERIAL_RULES[selectedFloor] || [];

    let total = 0;

    const state = {
      laminateHasPad,
      hardwoodType
    };

    materials.forEach(mat => {
      // Check condition if it exists
      if (mat.condition && !!mat.condition(state)) return;

      total += calculateUnitsNeeded(
        totalArea,
        mat.coverage,
        mat.cost
      );
    });

    return total;
  }

  function calculateRemovalCost() {
    return rooms.reduce((total, room) => {
      const type = globalRemovalType || room.removalType;

      if (!type) return total;

      const area = (parseFloat(room.width) || 0) * (parseFloat(room.length) || 0);
      const cost = REMOVAL_COSTS[type] || 0;

      return total + (area * cost);
    }, 0);  
  }

  function calculateExtrasTotal() {
    return Object.values(extras).reduce((total, extra) => {
      if (!extra.selected) return total;
      return total + (extra.cost || 0);
    }, 0);
  }
  
  function completeExtra(extraKey, cost) {
    setExtras(prev => ({
      ...prev,
      [extraKey]: {
        selected: true,
        cost: cost
      }
    }));

    setStep("additionals")
  }

  function initializeRoomTrim() {
    const initial = rooms.map((room, index) => ({
      roomIndex: index,
      method: "",
      type: "",
      customCost: 0,
      customLength: 0
    }));

    setRoomTrim(initial);
  }

  function updateRoomTrim(index, field, value) {
    const updated = [...roomTrim];
    updated[index][field] = value;

    if (field === "method" && value === "doorstop") {
      updated[index].type = "doorstop";
    }

    setRoomTrim(updated);
  }

  function getBillableTrimLength(perimeter, pieceLength) {
    if (!pieceLength) return perimeter;

    const piecesNeeded = Math.ceil(perimeter / pieceLength);
    return piecesNeeded * pieceLength;
  }

  function calculateGlobalTrimCost(override = null) {
    const trim = override || globalTrim ;

    const totalPerimeter = getTotalPerimeter();

    let resolvedType = trim.type;

    if (trim.method === "doorstop") {
      resolvedType = "doorstop";
    }

    const isMaterialNeeded =
      trim.method === "new" || trim.method === "doorstop"

    const trimData = 
      resolvedType === "custom"
        ? { cost: trim.customCost, length: trim.customLength }
        : TRIM_TYPES[resolvedType] || { cost: 0, length: 0 };
    
    const billableTrimLength = getBillableTrimLength(
      totalPerimeter,
      trimData.length
    );

    const installRate = TRIM_INSTALL_RATES[trim.method] || 0;

    // INSTALL
    const installTotal = roomInstall
      ? billableTrimLength * installRate
      : 0;
    
    const materialTotal = isMaterialNeeded
      ? billableTrimLength * trimData.cost
      : 0;

    console.log("TRIM DEBUG:", {
      method: trim.method,
      type: trim.type,
      resolvedType,
      trimData,
      billableTrimLength,
      installTotal,
      materialTotal
    });

    return materialTotal + installTotal;
  }

  function calculateRoomTrimCost() {
    return roomTrim.reduce((total, item) => {
      const room = rooms[item.roomIndex];
      const perimeter = getRoomPerimeter(room);

      const trimData =
        item.type === "custom"
          ? { cost: item.customCost, length: item.customLength }
          : TRIM_TYPES[item.type] || { cost: 0, length: 0 };
      
      const billableTrimLength = getBillableTrimLength(
        perimeter,
        trimData.length
      );

      const installRate = TRIM_INSTALL_RATES[item.method] || 0;

      const installTotal = roomInstall
        ? billableTrimLength * installRate
        : 0;

      let materialTotal = 0;

      if (item.method === "new" || item.method === "doorstop") {
        materialTotal = billableTrimLength * trimData.cost;
      }

      return total + materialTotal + installTotal;
    }, 0);
  }

  function completeTrim(override = null) {
    let total = 0;

    if (trimMode === "global") {
      total = calculateGlobalTrimCost(override);
    } else {
      total = calculateRoomTrimCost();
    }

    completeExtra("trim", total);
    setStep("additionals");
  }

  function calculateTrim() {
    let totalTrimLength = 0
    let totalTrimCost = 0
    const baseLength = 12
    const baseCost = 1.5

    totalTrimLength = Math.ceil(trimLength / baseLength) * baseLength

    totalTrimCost = (totalTrimLength * baseCost )

    completeExtra("trim", totalTrimCost)
    setStep("additionals")
  }

  function changeFurniture(type, amount) {
    setFurniture(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        amount: Math.max(0, prev[type].amount + amount)
      }
    }));
  }

    function furnitureCost() {
      const totalFurnitureCost = Object.values(furniture).reduce((total, item) => {
        return total + (item.amount * item.cost);
      }, 0);

      completeExtra("furniture", totalFurnitureCost);
      setStep("additionals");
    }

  function resetExtra(extraKey) {
    setExtras(prev => ({
      ...prev,
      [extraKey]: {
        selected: false,
        cost: 0
      }
    }));
  }

  function addVent() {
    setVents(prev => [
      ...prev,
      { type: "", quantity: 0, customCost: 0 }
    ]);
 }

 function updateVent(index, field, value) {
  const updated = [...vents];
  updated[index][field] = value;
  setVents(updated);
 }

 function calculateVentCost() {
  const total = vents.reduce((sum, vent) => {
    if (!vent.type) return sum;

    const baseCost =
      vent.type === "custom"
        ? vent.customCost
        : VENT_COSTS[vent.type] || 0;
    
    const materialTotal = baseCost * vent.quantity;

    const installTotal = roomInstall
      ? VENT_INSTALL_COST * vent.quantity
      : 0;
    
    return sum + materialTotal + installTotal
  }, 0);

  completeExtra("vents", total);
  setStep("additionals")
 }

 function removeVent(index) {
  setVents(prev => prev.filter((_, i) => i !== index));
 }
 //#endregion

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
  setTrimLength(null)
  setFurniture(INITIAL_FURNITURE)
  setExtras(INITIAL_EXTRAS)
  setGlobalRemovalType("")
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

          <button
            className="w-full text-xl py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
            onClick={() => setScannerOpen(true)}
          >
            Scan Product
          </button>

          {scannerOpen && (
            <ScannerModal
              onClose={() => setScannerOpen(false)}
              onSelect={(item) => {
                setScannedItem(item);
                setScannerOpen(false);
              }}
            />
          )}
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
          className="fixed w-40 h-14 top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-600 font-semibold transition"
        >
          Main Menu
        </button>

        <button
          className="fixed w-40 h-14 top-20 right-4 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg font-semibold transition"
          onClick={() => setScannerOpen(true)}
        >
          Scan Product
        </button>

        {scannerOpen && (
          <ScannerModal
            onClose={() => setScannerOpen(false)}
            onSelect={(item) => {
              setScannedItem(item);
              setScannerOpen(false)
            }}
          />
        )}

        {step === "decideFloorRooms" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h1 className="text-xl font-bold text-center">
              What flooring is being put in?
            </h1>

            <div className="grid grid-cols-3 gap-4">
              <button
                className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                onClick={() => {
                  setSelectedFloor("vinylClick")
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
                className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                onClick={() => {
                  setHardwoodType("nailDown")
                  setStep("roomremoval")
                }}
              >
                Nail Down
              </button>

              <button
                className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                onClick={() => {
                  setHardwoodType("floating")
                  setStep("roomremoval")
                }}
              >
                Floating
              </button>

              <button
                className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                onClick={() => {
                  setHardwoodType("fullSpread")
                  setStep("roomremoval")
                }}
              >
                Full Spread
              </button>

              <button
                className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
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
                className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                onClick={() => {
                  setRoomRemoval(true)
                  setStep("removalDetails")
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

        {step === "removalDetails" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h1 className="text-2xl font-bold">
              What flooring is being removed in each room?
            </h1>

            <div className="mb-6">
              <p className="font-semibold mb-2"> Removal Type (All Rooms)</p>

              <select
                value={globalRemovalType}
                onChange={(e) => setGlobalRemovalType(e.target.value)}
                className="border p-2 rounded-lg w-full"
              >
                <option value="">Select Type</option>
                <option value="carpet">Carpet</option>
                <option value="vinylClick">Vinyl Click</option>
                <option value="vinylGlue">Vinyl Glue</option>
                <option value="laminate">Laminate</option>
                <option value="hardwood">Hardwood</option>
                <option value="tile">Tile</option>
              </select>
            </div>

            <div className="space-y-4 text-left">
              {rooms.map((room, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center bg-gray-100 p-4 rounded-xl"
                >
                  <p>
                    Room {index + 1}: {room.width} x {room.length}
                  </p>

                  <select
                    className="border p-2 rounded-lg w-full"
                    value={globalRemovalType || room.removalType}
                    disabled={!!globalRemovalType}
                    onChange={(e) => {
                      const updatedRooms = [...rooms];
                      updatedRooms[index].removalType = e.target.value;
                      setRooms(updatedRooms);
                    }}
                  >
                    <option value="">Select Type</option>
                    <option value="carpet">Carpet</option>
                    <option value="vinylClick">Vinyl Click</option>
                    <option value="vinylGlue">Vinyl Glue</option>
                    <option value="laminate">Laminate</option>
                    <option value="hardwood">Hardwood</option>
                    <option value="tile">Tile</option>
                  </select>
                </div>
              ))}
            </div>

            <button
              className="w-full py-4 bg-blue-600 text-white rounded-xl"
              onClick={() => setStep("additionals")}
            >
              Continue
            </button>
          </div>
        )}

        {step === "additionals" && (
          <div className= "bg-white rounded-2xl shadow-xl p-10 text-center space-y-6 relative">
            <h1 className="text-3xl font-bold"
            >
              Any additional costs?
            </h1>

            <div className="absolute right-16 top-4">

              <button
                className="bg-gray-800 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                onClick={() => setShowExtrasMenu(prev => !prev)}  
              >
                Manage Extras
              </button>

              {showExtrasMenu && (
                <div className="mt-2 bg-gray-300 shadow-xl rounded-xl p-4 space-y-2 w-48">

                  {Object.keys(extras).map((key) => (
                    <button 
                      key={key}
                      className="w-full text-left bg-gray-700 hover:bg-gray-500 text-white p-2 rounded-lg capitalize"
                      onClick={() => resetExtra(key)}
                    >
                      Reset {key}
                    </button>
                  ))}

                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <button
                disabled={extras.trim.selected}
                className={`py-6 text-lg ${
                  extras.trim.selected 
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
                } text-white rounded-xl font-semibold transition`}
                onClick={() => {
                  if ((room?.length || 0) === 1) {
                    setTrimMode("global");
                    setStep("trimGlobalMethod");
                  } else {
                    setStep("trimChoice");
                  }
                }}
              >
                Trim {extras.trim.selected && `✔ ($${extras.trim.cost})`}
              </button>

              <button
                disabled={extras.transitions.selected}
                className={`py-6 text-lg ${
                  extras.transitions.selected
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
                } text-white rounded-xl font-semibold transition`}
                onClick={() => {
                  setStep("transitions")
                }}
              >
                Transitions {extras.transitions.selected && `✔ ($${extras.transitions.cost})`}
              </button>

              <button
                disabled={extras.floorPrep.selected}
                className={`py-6 text-lg ${
                  extras.floorPrep.selected
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
                } text-white rounded-xl font-semibold transition`}
                onClick={() => {
                  setStep("floorPrep")
                }}
              >
                Floor Prep {extras.floorPrep.selected && `✔ ($${extras.floorPrep.cost})`}
              </button>

              <button
                disabled={extras.furniture.selected}
                className={`py-6 text-lg ${
                  extras.furniture.selected
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
                } text-white rounded-xl font-semibold transition`}
                onClick={() => {
                  setStep("furniture")
                }}
              >
                Furniture / Appliances {extras.furniture.selected && `✔ ($${extras.furniture.cost})`}
              </button>

              <button
                disabled={extras.vents.selected}
                className={`py-6 text-lg ${
                  extras.vents.selected
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
                } text-white rounded-xl font-semibold transition`}
                onClick={() => {
                  setStep("vents")
                }}
              >
                Custom Vents {extras.vents.selected && `✔ ($${extras.vents.cost})`}
              </button>

              <button
                disabled={extras.other.selected}
                className={`py-6 text-lg ${
                  extras.other.selected
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
                } text-white rounded-xl font-semibold transition`}
                onClick={() => {
                  setStep("otherExtras")
                }}
              >
                Other {extras.other.selected && `✔ ($${extras.other.cost})`}
              </button>

            </div>
            <button
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              onClick={() => setStep("roomCost")}
            >
              Calculate
            </button>
          </div>
        )}

        {step === "trimChoice" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h1 className="text-3xl font-bold">
              Will trim be the same in all rooms?
            </h1>

            <div className="flex gap-4">
              <button
                className="flex-1 bg-blue-600 text-white rounded-xl"
                onClick={() => {
                  setTrimMode("global");
                  setStep("trimGlobalMethod")
                }}
              >
                Yes
              </button>

              <button
                className="flex-1 bg-blue-600 text-white rounded-xl"
                onClick={() => {
                  setTrimMode("separate")
                  initializeRoomTrim();
                  setStep("trimSeparate");
                }}
              >
                No
              </button>
            </div>
          </div>
        )}

        {step === "trimGlobalMethod" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h1 className="text-3xl font-bold">
              What type of trim work?
            </h1>

            <button
              className="w-full bg-blue-600 text-white p-4 rounded-xl"
              onClick={() => {
                const trim = { ...globalTrim, method: "reinstall" };
                setGlobalTrim(trim);
                completeTrim(trim); // done
              }}
            >
              Reinstall
            </button>

            <button
              className="w-full bg-blue-600 text-white p-4 rounded-xl"
              onClick={() => {
                const trim = { ...globalTrim, method: "doorstop", type: "doorstop" };
                setGlobalTrim(trim);
                completeTrim(trim); // done
              }}
            >
              Doorstop
            </button>

            <button
              className="w-full bg-blue-600 text-white p-4 rounded-xl"
              onClick={() => {
                setGlobalTrim(prev => ({ ...prev, method: "new"}));
                setStep("trimGlobalType");
              }}
            >
              New Install
            </button>
          </div>
        )}

        {step === "trimGlobalType" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h1 className="text-3xl font-bold">
              Select Trim Type
            </h1>

            <select
              onChange={(e) =>
                setGlobalTrim(prev => ({ ...prev, type: e.target.value}))
              }
            >
              <option value="">Select</option>
              <option value="4in">4" Base</option>
              <option value="5in">5" Base</option>
              <option value="custom">Custom</option>
            </select>

            {globalTrim.type === "custom" && (
              <input
                type="number"
                placeholder="$ / ft"
                onChange={(e) =>
                  setGlobalTrim(prev => ({
                    ...prev,
                    customCost: parseFloat(e.target.value) || 0
                  }))
                }
              />
            )}

            {globalTrim.type === "custom" && (
              <input
                type="number"
                placeholder="Length per piece (ft)"
                onChange={(e) => 
                  setGlobalTrim(prev => ({
                    ...prev,
                    customLength: parseFloat(e.target.value) || 0
                  }))
                }
              />
            )}

            <button
              className="bg-blue-600"
              onClick={() => completeTrim(globalTrim)}
            >
              Continue
            </button>
          </div>
        )}

        {step === "trimSeparate" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            {roomTrim.map((item, index) => {
              const room = rooms[item.roomIndex];

              return (
                <div key={index} className="grid grid-cols-4 gap-4">

                  <p>Room {index + 1}</p>

                  <select
                    onChange={(e) =>
                      updateRoomTrim(index, "method", e.target.value)
                    }
                  >
                    <option value="">Select</option>
                    <option value="reinstall">Reinstall</option>
                    <option value="new">New</option>
                    <option value="doorstop">Doorstop</option>
                  </select>

                  {item.method === "new" && (
                    <select
                      onChange={(e) =>
                        updateRoomTrim(index, "type", e.target.value)
                      }
                    >
                      <option value="">Type</option>
                      <option value="4in">4" Base</option>
                      <option value="5in">5" Base</option>
                      <option value="custom">Custom</option>
                    </select>
                  )}

                  {item.type === "custom" && (
                  <>
                    <input
                      type="number"
                      onChange={(e) =>
                        updateRoomTrim(
                          index,
                          "customCost",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />

                    <input
                      type="number"
                      placeholder="Length per piece (ft)"
                      onChange={(e) =>
                        updateRoomTrim(
                          index,
                          "customLength",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </>
                  )}
                </div>
              );
            })}

            <button onClick={() => completeTrim()}>
              Continue
            </button>
          </div>
        )}

        {step === "trim" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h1 className="text-3xl font-bold"
            >
              Total amount of length to cover?
            </h1>

            <input
              type="number"
              placeholder="Linear ft"
              className="border p-4 w-full text-lg rounded-lg"
              onChange={(e) =>
                setTrimLength(parseFloat(e.target.value) || 0)
              }
            />

            <button
              className="w-full py-4 bg-blue-600 text-white rounded-xl"
              onClick={calculateTrim}
            >
              Calculate Trim
            </button>
          </div>
        )}

        {step === "transitions" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            
          </div>
        )}

        {step === "floorPrep" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h1 className="text-3xl font-bold">
              
            </h1>
          </div>
        )}

        {step === "furniture" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h1 className="bg-blue-600 rounded-xl p-4 text-2xl font-bold">
              Select Furniture / Appliances

            </h1>
            <div className="grid grid-cols-2 gap-6 text-center justify-items-center">
              <div className="bg-blue-400 rounded-xl p-4 w-fit min-w-[150px]">
                <p className="text-2xl font-bold mb-2">Standard Room</p>
                <div className="flex justify-center gap-4">
                  <button onClick={() => changeFurniture("furniture", -1)}>-</button>

                  <span className="text-xl font-bold">
                     {furniture.furniture?.amount || 0}
                  </span>

                  <button onClick={() => changeFurniture("furniture", 1)}>+</button>
                </div>
              </div>
              <div className="bg-blue-400 rounded-xl p-4 w-fit min-w-[150px]">
                <p className="text-2xl font-bold mb-2">Appliances</p>
                <div className="flex justify-center gap-4">
                  <button onClick={() => changeFurniture("appliance", -1)}>-</button>

                  <span className="text-xl font-bold">
                    {furniture.appliance?.amount || 0}
                  </span>

                  <button onClick={() => changeFurniture("appliance", 1)}>+</button>
                </div>
              </div>

              <div className="col-span-2 bg-blue-400 rounded-xl p-4 w-fit min-w-[150px]">
                <p className="text-2xl font-bold mb-2">Lg Room</p>
                <div className="flex justify-center gap-4">
                  <button onClick={() => changeFurniture("furnitureLg", -1)}>-</button>

                  <span className="text-xl font-bold">
                    {furniture.furnitureLg?.amount || 0}
                  </span>

                  <button onClick={() => changeFurniture("furnitureLg", 1)}>+</button>
                </div>
              </div>

            </div>

            <button
              className="w-full py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
              onClick={furnitureCost}
            >
              Continue
            </button>
          </div>
        )}

        {step === "vents" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h1 className="text-3xl font-bold text-center">
              Select Vent Types
            </h1>

            <div className="space-y-4">
              {vents.map((vent, index) => {
                const isCustom = vent.type === "custom";

                const cost =
                  vent.type && !isCustom
                    ? VENT_COSTS[vent.type]
                    : vent.customCost;

                return (
                  <div
                    key={index}
                    className="grid grid-cols-4 gap-4 items-center"
                  >
                    {/* TYPE */}
                    <select
                      value={vent.type}
                      onChange={(e) =>
                        updateVent(index, "type", e.target.value)
                      }
                      className="border p-2 rounded-lg"
                    >
                      <option value="">Select</option>
                      <option value="4x10_black">4x10 Black</option>
                      <option value="4x10_grey">4x10 Grey</option>
                      <option value="4x10_white">4x10 Black</option>
                      <option value="3x10_black">3x10 Black</option>
                      <option value="3x10_grey">3x10 Grey</option>
                      <option value="3x10_white">3x10 White</option>
                      <option value="custom">Custom</option>
                    </select>

                    {/* COST */}
                    {isCustom ? (
                      <input
                        type="number"
                        placeholder="Custom $"
                        className="border p-2 rounded-lg"
                        value={vent.customCost}
                        onChange={(e) =>
                          updateVent(
                            index,
                            "customCost",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                      ) : (
                        <p className="text-center font-semibold">
                          ${cost || 0}
                        </p>
                    )}

                    {/* Quantity */}
                    <input
                      type="number"
                      min="0"
                      className="border p-2 rounded-lg"
                      value={vent.quantity}
                      onChange={(e) => 
                        updateVent(
                          index,
                          "quantity",
                          parseInt(e.target.value) || 0
                        )
                      }
                    />

                    {/* DELETE BUTTON */}
                    <button
                      onClick={() => removeVent(index)}
                      className="text-red-600 font-bold text-xl hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            {/* ADD ROW */}
            <button
              className="w-full py-3 bg-blue-500 text-white rounded-xl"
              onClick={addVent}
            >
              Add Another Vent
            </button>

            {/* CALCULATE */}
            <button
              className="w-full py-4 bg-blue-600 text-white rounded-xl"
              onClick={calculateVentCost}
            >
              Continue
            </button>
          </div>
        )}

        {step === "otherExtras" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
            <h1 className="text-3xl font-bold text-center">
              Enter total amount of other extra costs?
            </h1>

            <input
              type="number"
              placeholder="$"
              className="border p-4 w-full text-lg rounded-lg"
              onChange={(e) =>
                setOtherExtras(parseFloat(e.target.value) || 0)
              }
            />

            <button
              className="w-full py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
              onClick={() => {
                completeExtra("other", otherExtras)
                setStep("additionals")
              }}
            > 
              Submit
            </button>
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
            
            {/*}
            <p>
              Total Area: {getRoomsArea()} sqft
            </p>
            */}

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