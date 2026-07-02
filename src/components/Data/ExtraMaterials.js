export const MATERIAL_RULES = {
        vinylGlue: [
            { name: "Glue", coverage: 500, cost: 175 }
        ],

        carpet: [
            { name: "Pad", coverage: 1, cost: 0.85 }
        ],

        laminate: [
            { name: "Pad", coverage: 100, cost: 40, condition: (state) => !state.laminateHasPad }
        ],

        vinylSheet: [
            { name: "Glue", coverage: 500, cost: 175 }
        ],

        hardwood: [
            { name: "Glue", coverage: 60, cost: 30, condition: (state) => state.hardwoodType === "glueAssist" }
        ]
    };