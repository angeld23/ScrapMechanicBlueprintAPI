import { Vector3 } from "./class/vector3";
import partData from "./partData";
import { FileVector3, LogicMode } from "./types";
import uuids from "./uuids";

export function assume<T>(value: unknown): asserts value is T {}

export function getRotationPositionOffset(
    xaxis: number,
    zaxis: number
): Vector3 {
    let offset = new Vector3(0, 0, 0);
    const xAbs = Math.abs(xaxis);

    // thank you brent batch
    if (
        xaxis == -1 ||
        (zaxis == -1 && xAbs != 1) ||
        (xaxis == 2 && zaxis == 3) ||
        (xaxis == 3 && zaxis == -2) ||
        (xaxis == -2 && zaxis == -3) ||
        (xaxis == -3 && zaxis == 2)
    ) {
        offset = offset.add(new Vector3(1, 0, 0));
    }
    if (
        xaxis == -3 ||
        (zaxis == -3 && xAbs != 3) ||
        (xaxis == 1 && zaxis == 2) ||
        (xaxis == 2 && zaxis == -1) ||
        (xaxis == -1 && zaxis == -2) ||
        (xaxis == -2 && zaxis == 1)
    ) {
        offset = offset.add(new Vector3(0, 1, 0));
    }
    if (
        xaxis == -2 ||
        (zaxis == -2 && xAbs != 2) ||
        (xaxis == 3 && zaxis == 1) ||
        (xaxis == 1 && zaxis == -3) ||
        (xaxis == -3 && zaxis == -1) ||
        (xaxis == -1 && zaxis == 3)
    ) {
        offset = offset.add(new Vector3(0, 0, 1));
    }
    return offset;
}

const jointOffsets = {
    "1,-2": new Vector3(0, -1, 0),
    "1,3": new Vector3(0, 0, 1),
    "2,-1": new Vector3(-1, 0, 0),
    "2,1": new Vector3(1, 0, 0),
    "1,-3": new Vector3(0, 0, -1),
    "1,2": new Vector3(0, 1, 0),
};
export function getJointDirection(xaxis: number, zaxis: number): Vector3 {
    const offset = jointOffsets[
        (xaxis + "," + zaxis) as keyof typeof jointOffsets
    ] as Vector3 | undefined;
    if (!offset) throw new Error("Invalid piston rotation");
    return offset;
}

const suspensionLengths: { [shapeId: string]: number } = {
    [UUID("Off-Road Suspension")]: 3,
    [UUID("Off-Road Suspension 1")]: 3,
    [UUID("Off-Road Suspension 2")]: 3,
    [UUID("Off-Road Suspension 3")]: 3,
    [UUID("Off-Road Suspension 4")]: 3,
    [UUID("Off-Road Suspension 5")]: 3,

    [UUID("Sport Suspension")]: 2,
    [UUID("Sport Suspension 1")]: 2,
    [UUID("Sport Suspension 2")]: 2,
    [UUID("Sport Suspension 3")]: 2,
    [UUID("Sport Suspension 4")]: 2,
    [UUID("Sport Suspension 5")]: 2,
};
export function getSuspensionLength(shapeId: string): number {
    const length = suspensionLengths[shapeId];
    if (length === undefined)
        console.warn(
            "Unknown suspension length for shapeId " +
                shapeId +
                ", defaulting to 3!"
        );
    return length ?? 3;
}

export const logicGateModes = {
    AND: 0,
    OR: 1,
    XOR: 2,
    NAND: 3,
    NOR: 4,
    XNOR: 5,
};
export const logicGateModeNames: LogicMode[] = [
    "AND",
    "OR",
    "XOR",
    "NAND",
    "NOR",
    "XNOR",
];

export function getDefaultColor(shapeId: string) {
    return partData[shapeId]?.color ?? "DF7F01";
}

export function UUID(name: keyof typeof uuids) {
    return uuids[name];
}

export const engineLevels = [
    "8CBMVUEAAAABBQAAAAICAAAABoBiYXR0ZXJ5UG9pbnRzCAAEAAAAB2dlYXJJZHgIAQ",
    "8CBMVUEAAAABBQAAAAICAAAABoBiYXR0ZXJ5UG9pbnRzCAAEAAAAB2dlYXJJZHgIAg",
    "8CBMVUEAAAABBQAAAAICAAAABoBiYXR0ZXJ5UG9pbnRzCAAEAAAAB2dlYXJJZHgIAw",
    "8CBMVUEAAAABBQAAAAICAAAABoBiYXR0ZXJ5UG9pbnRzCAAEAAAAB2dlYXJJZHgIBA",
    "8CBMVUEAAAABBQAAAAICAAAABoBiYXR0ZXJ5UG9pbnRzCAAEAAAAB2dlYXJJZHgIBQ",
    "8CBMVUEAAAABBQAAAAICAAAABoBiYXR0ZXJ5UG9pbnRzCAAEAAAAB2dlYXJJZHgIBg",
    "8CBMVUEAAAABBQAAAAICAAAABoBiYXR0ZXJ5UG9pbnRzCAAEAAAAB2dlYXJJZHgIBw",
    "8CBMVUEAAAABBQAAAAICAAAABoBiYXR0ZXJ5UG9pbnRzCAAEAAAAB2dlYXJJZHgICA",
    "8CBMVUEAAAABBQAAAAICAAAABoBiYXR0ZXJ5UG9pbnRzCAAEAAAAB2dlYXJJZHgICQ",
    "8CBMVUEAAAABBQAAAAICAAAABoBiYXR0ZXJ5UG9pbnRzCAAEAAAAB2dlYXJJZHgICg",
    "8CBMVUEAAAABBQAAAAICAAAABoBiYXR0ZXJ5UG9pbnRzCAAEAAAAB2dlYXJJZHgICw",
    "8CBMVUEAAAABBQAAAAICAAAABoBiYXR0ZXJ5UG9pbnRzCAAEAAAAB2dlYXJJZHgIDA",
    "8CBMVUEAAAABBQAAAAICAAAABoBiYXR0ZXJ5UG9pbnRzCAAEAAAAB2dlYXJJZHgIDQ",
];

export const hornLevels = [
    "gExVQQAAAAEFBQDwAgIAAAAEgHNsaWRlclBvcwgA",
    "gExVQQAAAAEFBQDwAgIAAAAEgHNsaWRlclBvcwgB",
    "gExVQQAAAAEFBQDwAgIAAAAEgHNsaWRlclBvcwgC",
    "gExVQQAAAAEFBQDwAgIAAAAEgHNsaWRlclBvcwgD",
    "gExVQQAAAAEFBQDwAgIAAAAEgHNsaWRlclBvcwgE",
    "gExVQQAAAAEFBQDwAgIAAAAEgHNsaWRlclBvcwgF",
    "gExVQQAAAAEFBQDwAgIAAAAEgHNsaWRlclBvcwgG",
    "gExVQQAAAAEFBQDwAgIAAAAEgHNsaWRlclBvcwgH",
    "gExVQQAAAAEFBQDwAgIAAAAEgHNsaWRlclBvcwgI",
    "gExVQQAAAAEFBQDwAgIAAAAEgHNsaWRlclBvcwgJ",
    "gExVQQAAAAEFBQDwAgIAAAAEgHNsaWRlclBvcwgK",
];
