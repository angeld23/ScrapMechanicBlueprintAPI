import { FileVector3 } from "../types";

export class Vector3 implements FileVector3 {
    constructor(
        public readonly x: number,
        public readonly y: number,
        public readonly z: number
    ) {}
    static fromFileVec3(vec: FileVector3): Vector3 {
        return new Vector3(vec.x, vec.y, vec.z);
    }
    static zero = new Vector3(0, 0, 0);
    static one = new Vector3(1, 1, 1);

    add(other: Vector3): Vector3 {
        return new Vector3(
            this.x + other.x,
            this.y + other.y,
            this.z + other.z
        );
    }
    sub(other: Vector3): Vector3 {
        return new Vector3(
            this.x - other.x,
            this.y - other.y,
            this.z - other.z
        );
    }
    mul(other: Vector3 | number): Vector3 {
        if (typeof other === "number") {
            return new Vector3(this.x * other, this.y * other, this.z * other);
        }
        return new Vector3(
            this.x * other.x,
            this.y * other.y,
            this.z * other.z
        );
    }
    div(other: Vector3 | number): Vector3 {
        if (typeof other === "number") {
            return new Vector3(this.x / other, this.y / other, this.z / other);
        }
        return new Vector3(
            this.x / other.x,
            this.y / other.y,
            this.z / other.z
        );
    }
    negate(): Vector3 {
        return Vector3.zero.sub(this);
    }

    magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    unit(): Vector3 {
        return this.div(this.magnitude());
    }
    cross(other: Vector3): Vector3 {
        return new Vector3(
            this.y * other.z - this.z * other.y,
            this.z * other.x - this.x * other.z,
            this.x * other.y - this.y * other.x
        );
    }
    dot(other: Vector3): number {
        return this.x * other.x + this.y * other.y + this.z * other.z;
    }

    toFileVec3(): FileVector3 {
        return { x: this.x, y: this.y, z: this.z };
    }
}
