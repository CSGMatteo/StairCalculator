import React, { useState } from "react";
import ScannerModal from "./ScannerModal";
import Maintenance from "./Maintenance";
import VinylClickRoom from "./RoomCalculators/VinylClickRoom";

export default function RoomCalculator({ setMode }) {

    const INITIAL_EXTRAS = {
        trim: { selected: false, cost: 0 },
        transitions: { selected: false, cost: 0 },
        floorPrep: { selected: false, cost: 0 },
        furniture: { selected: false, cost: 0 },
        vents: { selected: false, cost: 0 },
        other: { selected: false, cost: 0 },
    };

    const TRIM_TYPES = {
        "4in": { cost: 1.00, length: 12 },
        "5in": { cost: 1.50, length: 12 },
        "doorstop": { cost: 0.75, length: 10 },
        "custom": { cost: 0, length: 0 }
    };

    const TRIM_INSTALL_RATES = {
        reinstall: 2.50,
        new: 3.50,
        doorstop: 2.00
    };

    const FLOOR_PREP_TYPES = [
        { key: "patch", label: "Patch / Repair" },
        { key: "underlayment", label: "Underlayment" },
        { key: "leveling", label: "Self Leveling" },
    ];

    const FLOOR_PREP_RATES = {
        patch: 2.0,
        underlayment: 5.0,
        leveling: 1.0
    };

    const INITIAL_FURNITURE = {
        furniture: { amount: 0, cost: 100 },
        appliance: { amount: 0, cost: 50 },
        furnitureLg: { amount: 0, cost: 200 },
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

    const [step, setStep] = useState("decideFloorRooms")

    const formatMoney = (value) =>
        value?.toLocaleString("en-CA", {
            style: "currency",
            currency: "CAD"
        });

    // Room Function Constants
    
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
    
    const [floorPrepItems, setFloorPrepItems] = useState([]);
    const [currentPrep, setCurrentPrep] = useState(null);
    
    const [furniture, setFurniture]  = useState(INITIAL_FURNITURE);
    
    const [otherExtras, setOtherExtras] = useState(null)
    
    const [showExtrasMenu, setShowExtrasMenu] = useState(false);
    
    const [globalRemovalType, setGlobalRemovalType] = useState("");
    
    const [vents, setVents] = useState([
        { type: "", quantity: 0, customCost: 0 }
    ]);

    const [scannerOpen, setScannerOpen] = useState(false);
    const [scannedItem, setScannedItem] = useState(null);

    // Room Logic

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
            setNumberOfBoxes(totalArea / boxsqft)
        } else {
            totalArea = roomsArea;
            setNumberOfBoxes(0);
        }

        return(totalArea)
    }

    function calculateRoomTotal() {
        const totalArea = getProductArea();

        const productCost = totalArea * roomCost;
        const removalCost = calculateRemovalCost();
        const extrasCost = calculateExtrasTotal();
        const materialCost = calculateMaterialCosts();
        const installCost = calculateInstallCost();

        const total = (productCost + removalCost + extrasCost + materialCost + installCost) * 1.13;

        console.log("Product Cost:", productCost)
        console.log("Removal Cost:", removalCost)
        console.log("Extras Cost:", extrasCost)
        console.log("Material Cost:", materialCost)
        console.log("Install Cost:", installCost)
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

    //Trim Logic

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
        setStep("additionals")
    }

    // Floor Prep Logic

    function getRoomArea(room) {
        return (room.length || 0) * (room.width || 0);
    }

    function getTotalArea() {
        return rooms.reduce((total, room) => {
            return total + getRoomArea(room);
        }, 0);
    }

    function calculateFloorPrepTotal() {
        return floorPrepItems.reduce((total, item) => {
            let affectedArea = 0;

            if (item.scope === "global") {
                affectedArea = getTotalArea();
            } else {
                affectedArea = item.rooms.reduce((sum, roomIndex) => {
                    return sum + getRoomArea(rooms[roomIndex]);
                }, 0);
            }

            const rate = FLOOR_PREP_RATES[item.type] || 0;

            return total + affectedArea * rate;
        }, 0);
    }

    // Furniture Logic

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

    // Reset Logic

    function resetExtra(extraKey) {
        setExtras(prev => ({
            ...prev,
            [extraKey]: {
                selected: false,
                cost: 0
            }
        }));
    }

    // Vent Logic

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

    function resetRoom() {
        setMode("menu");
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
        setSelectedFloor(null);
        setBoxsqft(null);
        setNumberOfBoxes(null);
        setTrimLength(null);
        setFurniture(INITIAL_FURNITURE);
        setExtras(INITIAL_EXTRAS);
        setGlobalRemovalType("");
    }

    return (
        <>
            <button
                onClick={resetRoom}
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
                            onClick={() => {setMode("vinylClickRoom")
                            }}
                        >
                            Vinyl Click
                        </button>

                        <button
                            className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                            onClick={() => {setMode("vinylGlueRoom")
                            }}
                        >
                            Vinyl Glue
                        </button>

                        <button
                            className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                            onClick={() => {setMode("maintenance")
                            }}
                        >
                            Vinyl Sheet
                        </button>

                        <button
                            className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                            onClick={() => {setMode("laminateRoom")
                            }}
                        >
                            Laminate
                        </button>

                        <button
                            className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                            onClick={() => {setMode("hardwoodRoom")
                            }}
                        >
                            Hardwood
                        </button>

                        <button
                            className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                            onClick={() => {setMode("maintenance")
                            }}
                        >
                            Carpet
                        </button>

                        <button
                            className="col-start-2 py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                            onClick={() => {setMode("maintenance")
                            }}
                        >
                            Tile
                        </button>
                    </div>
                </div>
            )}

            {step === "additionals" && (
                <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6 relative">
                    <h1 className="text-3xl font-bold"
                    >
                        Any additional costs?
                    </h1>

                    <div className="absolute right-16 top-4">

                        <button
                            className="bg-gray-800 hover:bg-gray-600 text-white px-4 pt-2 rounded-lg"
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
                                if ((rooms?.length || 0) === 1) {
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
                                setStep("floorPrepSelect")
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
                    <hi className="text-3xl font-bold">
                        Will trim be the same in all rooms?
                    </hi>

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

            {step === "transition" && (
                <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">

                </div>
            )}

            {step === "floorPrepSelect" && (
                <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
                    <h1 className="text-3xl font-bold">
                        Select Floor Prep
                    </h1>

                    {FLOOR_PREP_TYPES.map((prep) => (
                        <button
                            key={prep.key}
                            className="w-full bg-blue-600 text-white p-4 rounded-xl"
                            onClick={() => {
                                setCurrentPrep({
                                    type: prep.key,
                                    scope: "",
                                    rooms: [],
                                    cost: 0,
                                    extra: []
                                });
                                setStep("floorPrepScope");
                            }}
                        >
                            {prep.label}
                        </button>
                    ))}

                    {/* Done button */}
                    <button
                        className="w-full bg-green-600 text-white p-4 rounded-xl"
                        onClick={() => completeExtra("floorPrep", calculateFloorPrepTotal())}
                    >
                        Done
                    </button>
                </div>
            )}

            {step === "floorPrepScope" && (
                <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
                    <h1 className="text-2xl font-bold">
                        Apply to all rooms?
                    </h1>

                    <button
                        className="w-full bg-blue-600 text-white p-4 rounded-xl"
                        onClick={() => {
                            const updated = {
                                ...currentPrep,
                                scope: "global"
                            };

                            setFloorPrepItems(prev => [...prev, updated]);
                            setCurrentPrep(null);
                            setStep("floorPrepSelect");
                        }}
                    >
                        Yes
                    </button>

                    <button
                        className="w-full bg-blue-600 text-white p-4 rounded-xl"
                        onClick={() => {
                            setCurrentPrep(prev => ({
                                ...prev,
                                scope: "separate"
                            }));
                            setStep("floorPrepRooms");
                        }}
                    >
                        No
                    </button>
                </div>
            )}

            {step === "floorPrepRooms" && (
                <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
                    <h1 className="text-3xl font-bold">
                        Select Rooms
                    </h1>

                    {rooms.map((room, index) => (
                        <label key={index} className="flex itesm-center gap-2">
                            <input
                                type="checkbox"
                                onChange={(e) => {
                                    setCurrentPrep(prev => {
                                        const updatedRooms = e.target.checked
                                            ? [...prev.rooms, index]
                                            : prev.rooms.filter(r => r !== index);
                                        
                                        return { ...prev, rooms: updatedRooms };
                                    });
                                }}
                            />
                            Room {index + 1}
                        </label>
                    ))}

                    <button
                        className="w-full bg-green-600 text-white p-4 rounded-xl"
                        onClick={() => {
                            setFloorPrepItems(prev => [...prev, currentPrep]);
                            setCurrentPrep(null);
                            setStep("floorPrepSelect");
                        }}
                    >
                        Confirm
                    </button>
                </div>
            )}

            {step === "furniture" && (
                <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
                    <h1 className="bg-blue-600 rounded-xl p-4 text-2xl font-bold">
                        Select Furniture / Appliances
                    </h1>
                    <div className="grod grid-cols-2 gap-6 text-center justify-items-center">
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

                        <div className="bg-blue-400 rounded-xl p-4 w-fit min-w-[150px]">
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
                                        <option value="4x10_white">4x10 White</option>
                                        <option value="3x10_black">3x10 Black</option>
                                        <option value="3x10_grey">3x10 Grey</option>
                                        <option value="3x10_white">3x10 White</option>
                                        <option value="custom">4x10 Black</option>
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
                                        className="text-red-600 font-bold text-xl hover:test-red-800"
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

                    {/* CALCUALTE */}
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
                        Enter total amount of other extra costs
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
            
        </>
    )
}