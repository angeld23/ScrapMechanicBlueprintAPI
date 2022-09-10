import { Axis, Face } from "./types";

const twistsAndFaceToAxis = [
    // 0 twists
    {
        Down: [1, 2],
        Up: [1, -2],
        Forward: [-3, 1],
        Right: [-3, -2],
        Backward: [-3, -1],
        Left: [-3, 2],
    },
    // 1 twist
    {
        Down: [2, -1],
        Left: [2, 3],
        Backward: [-1, 3],
        Up: [-2, -1],
        Forward: [1, 3],
        Right: [-2, 3],
    },
    // 2 twists
    {
        Down: [-1, -2],
        Forward: [3, -1],
        Up: [-1, 2],
        Backward: [3, 1],
        Right: [3, 2],
        Left: [3, -2],
    },
    // 3 twists
    {
        Down: [-2, 1],
        Up: [2, 1],
        Left: [-2, -3],
        Backward: [1, -3],
        Right: [2, -3],
        Forward: [-1, -3],
    },
];

const axisToTwistsAndFace = new Map<string, [number, string]>();
twistsAndFaceToAxis.forEach((twists, twistCount) => {
    Object.entries(twists).forEach(([face, axis]) => {
        axisToTwistsAndFace.set(axis[0] + "," + axis[1], [
            twistCount,
            face as Face,
        ]);
    });
});

export function getAxisFromTwistsAndFace(
    twists: 0 | 1 | 2 | 3,
    face: Face
): Axis {
    return twistsAndFaceToAxis[twists][face] as Axis;
}

export function getTwistsAndFaceFromAxis(
    xaxis: number,
    zaxis: number
): [twists: 0 | 1 | 2 | 3, face: Face] {
    return axisToTwistsAndFace.get(xaxis + "," + zaxis) as [
        0 | 1 | 2 | 3,
        Face
    ];
}
