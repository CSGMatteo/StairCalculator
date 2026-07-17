import React, { useState } from "react";
import ScannerModal from "../ScannerModal";
import { REMOVAL_COSTS } from "../Data/removalCosts";
import { FLOORING } from "../Data/InstallCosts";
import App from "../../App";
import { MATERIAL_RULES } from "../Data/ExtraMaterials";

export default function LaminateRoom({ quote, setQuote, setMode, setPage }) {
    const WASTE_FACTOR = 1.05
    
    const {
        rooms,
        boxsqft,
        numberOfBoxes,
        roomCost,
        roomInstall,
        setRoomRemoval,
        roomTotal,
        globalRemovalType,
        extras,
        totals,
    } = quote;

    const [step, setStep] = useState("laminatePad");

    const [roomInput, setRoomInput] = useState({ width: "", length: "", removalType: ""});

    const [scannerOpen, setScannerOpen] = useState(false);
    const [scannedItem, setScannedItem] = useState(null);
    
    const [laminateHasPad, setLaminateHasPad] = useState(false)
    
    const [selectedFloor, setSelectedFloor] = useState("laminate")
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

        setQuote(prev => ({
            ...prev,
            rooms: [...prev.rooms, newRoom]
        }));
    }

    function getRoomPerimeter(room) {
        const width = room.width || 0;
        const length = room.length || 0;

        return 2 * (width + length);
    }

    function getTotalPerimeter() {
        return rooms.reduce((total,room) => {
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
            setQuote(prev => ({
                ...prev,
                numberOfBoxes: (totalArea / boxsqft)
            }))
        } else {
            totalArea = roomsArea;
            setQuote(prev => ({
                ...prev,
                numberOfBoxes: (0)
            }))
        }

        return(totalArea)
    }

    function calculateRoomTotal() {
        const totalArea = getProductArea();
        
        const productCost = totalArea * roomCost;
        const removalCost = calculateRemovalCost();
        const installCost = calculateInstallCost();
        const materialCost = calculateMaterialCosts();

        const total = (productCost + removalCost + installCost + materialCost) * 1.13;

        console.log("Product Cost:", productCost)
        console.log("Removal Cost:", removalCost)
        console.log("Install Cost:", installCost)
        console.log("Material Cost:", materialCost)
        setQuote(prev => ({
            ...prev,
            roomTotal: (total)
        }));
        setStep("roomResult")
    }

    function calculateInstallCost() {
        if (!roomInstall) return 0;

        const totalArea = getProductArea();

        let rate = 0;
        let min = 0;
        
        const floor = FLOORING[selectedFloor];

        if (!floor) return 0;

        min = floor.minInstall || 0;

        rate = floor.installRate || 0;

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

        console.log("MATERIAL RULES:", MATERIAL_RULES[selectedFloor]);
        console.log("STATE:", { laminateHasPad });

        const state = {
            laminateHasPad
        };

        materials.forEach(mat => {
            if (mat.condition && !mat.condition(state)) return;

            total += calculateUnitsNeeded(
                totalArea,
                mat.coverage,
                mat.cost
            );
        });

        return total;
    }

    function calculateRemovalCost() {
        // Keep track of the total area for each removal type
        const groupedAreas = {};

        rooms.forEach(room => {
            const type = globalRemovalType || room.removalType;

            if (!type) return;

            const area = 
                (parseFloat(room.width) || 0) *
                (parseFloat(room.length) || 0);
            
            groupedAreas[type] = (groupedAreas[type] || 0) + area;
        });

        let totalRemoval = 0;

        Object.entries(groupedAreas).forEach(([type, area]) => {
            const removal = REMOVAL_COSTS[type];

            if (!removal) return;

            console.log(removal);

            const cost = area * removal.removalRate;

            totalRemoval +=
             Math.max(cost, removal.minRemoval);
        });

        return totalRemoval
    }

    function reset() {
        setStep("roomsInput")
        setRoomInput({ width: 0, length: 0});
    }
    

    return (
        <>
            <button
                onClick={() => setPage("floorSelection")}
                className="fixed w-40 h-14 top-4 right-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-lg  font-semibold transition"
            >
                Flooring Selection
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

            {step === "laminatePad" && (
                <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
                    <h1 className="text-3xl font-bold text-center">
                        Does the laminate have a pad already attached?
                    </h1>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                            onClick={() => {
                                setLaminateHasPad(true)
                                setStep("roomsInput")
                            }}
                        >
                            Yes
                        </button>

                        <button
                            className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                            onClick={() => {
                                setLaminateHasPad(false)
                                setStep("roomsInput")
                            }}
                        >
                            No
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
                                setRoomInput({ width: 0, length: 0});
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
                        >
                            That's All
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
                        onClick={reset}
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
                        How many sqft per box?
                    </h1>

                    <input
                        type="nunmber"
                        placeholder="sqft/box"
                        className="border p-4 w-full text-lg rounded-lg"
                        onChange={(e) =>
                            setQuote(prev => ({
                                ...prev,
                                boxsqft: (parseFloat(e.target.value) || 0)
                            }))
                        }
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                            onClick={() => {
                                setQuote(prev => ({
                                    ...prev,
                                    roomInstall: false
                                }))
                                setStep("roomCost")
                            }}
                        >
                            Just Product
                        </button>

                        <button
                            className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                            onClick={() => {
                                setQuote(prev => ({
                                    ...prev,
                                    roomInstall: true
                                }))
                                setStep("roomRemoval")
                            }}
                        >
                            Install Costs
                        </button>
                    </div>
                </div>
            )}

            {step === "roomRemoval" && (
                <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
                    <h1 className="text-3xl font-bold text-center1">
                        Is there removal?
                    </h1>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                            onClick={() => {
                                setQuote(prev => ({
                                    ...prev,
                                    roomRemoval: true
                                }))
                                setStep("removalDetails")
                            }}
                        >
                            Yes
                        </button>

                        <button
                            className="py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
                            onClick={() => {
                                setQuote(prev => ({
                                    ...prev,
                                    roomRemoval: false
                                }))
                                setStep("roomCost")
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
                            onChange={(e) => 
                                setQuote(prev => ({
                                    ...prev,
                                    globalRemovalType: (e.target.value)
                                }))
                            }
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
                                        setQuote(prev => {
                                            const updatedRooms = [...prev.rooms];
                                            updatedRooms[index] = {
                                                ...updatedRooms[index],
                                                removalType: e.target.value
                                            };

                                            return {
                                                ...prev,
                                                rooms: updatedRooms
                                            };
                                        });
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
                        onClick={() => setStep("roomCost")}
                    >
                        Continue
                    </button>
                </div>
            )}

            {step === "roomCost" && (
                <div className="bg-white rounded-2xl shadow-xl p-10 text-center space-y-6">
                    <h1 className="text-3xl font-bold">
                        Cost per sq ft
                    </h1>

                    <input
                        type="number"
                        placeholder="$ / sqft"
                        className="border p-4 w-full text-lg rounded-lg"
                        onChange={(e) =>
                            setQuote(prev => ({
                                ...prev,
                                roomCost: (parseFloat(e.target.value) || 0)
                            }))
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
                    <h2 className="text-2xl font-semibold">
                        Room Total
                    </h2>
                    {(numberOfBoxes ?? 0) > 1 && (
                        <p>
                            Number of Cartons: {numberOfBoxes} Cartons
                        </p>
                    )}

                    <p className="text-5xl font-bold text-green-600">
                        {roomTotal?.toLocaleString("en-CA", {
                            style: "currency",
                            currency: "CAD"
                        })}
                    </p>

                    <button
                        className="w-full py-4 bg-blue-600 text-white rounded-xl"
                        onClick={reset}
                    >
                        Main Menu
                    </button>
                </div>
            )}

        </>
    )
}