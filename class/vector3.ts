import { FileVector3 } from "../types";

/**
 * A 3D vector.
 */
export class Vector3 implements FileVector3 {
    /**
     * Constructs a new vector from the given x, y, and z values.
     * @param x The x coordinate.
     * @param y The y coordinate.
     * @param z The z coordinate.
     */
    constructor(
        public readonly x: number,
        public readonly y: number,
        public readonly z: number
    ) {}
    /**
     * Constructs a new vector from a FileVector3, which is the format used in blueprints.
     * @param vec The FileVector3 to construct from.
     * @returns The new vector.
     */
    static fromFileVec3(vec: FileVector3): Vector3 {
        return new Vector3(vec.x, vec.y, vec.z);
    }
    /**
     * A vector with all components set to 0.
     */
    static zero = new Vector3(0, 0, 0);
    /**
     * A vector with all components set to 1.
     */
    static one = new Vector3(1, 1, 1);

    /**
     * Adds two vectors together.
     * @param other The other vector to add.
     * @returns The sum of the two vectors.
     */
    add(other: Vector3): Vector3 {
        return new Vector3(
            this.x + other.x,
            this.y + other.y,
            this.z + other.z
        );
    }
    /**
     * Subtracts two vectors.
     * @param other The other vector to subtract.
     * @returns The difference of the two vectors.
     */
    sub(other: Vector3): Vector3 {
        return new Vector3(
            this.x - other.x,
            this.y - other.y,
            this.z - other.z
        );
    }
    /**
     * Multiplies a vector by another, or by a scalar.
     * @param other The other vector to multiply by, or a scalar.
     * @returns The product of the two values.
     */
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
    /**
     * Divides a vector by another, or by a scalar.
     * @param other The other vector to divide by, or a scalar.
     * @returns The quotient of the two values.
     */
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
    /**
     * Negates a vector.
     * @returns The negated vector.
     */
    negate(): Vector3 {
        return Vector3.zero.sub(this);
    }

    /**
     * Calculates the magnitude of the vector.
     * @returns The magnitude of the vector.
     */
    magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    /**
     * Normalizes the vector.
     * @returns The normalized vector.
     */
    unit(): Vector3 {
        return this.div(this.magnitude());
    }
    /**
     * Calculates the [cross product](https://en.wikipedia.org/wiki/Cross_product) of two vectors.
     * @param other The other vector to calculate the cross product with.
     * @returns The cross product of the two vectors.
     */
    cross(other: Vector3): Vector3 {
        return new Vector3(
            this.y * other.z - this.z * other.y,
            this.z * other.x - this.x * other.z,
            this.x * other.y - this.y * other.x
        );
    }

    /**
     * Calculates the [dot product](https://en.wikipedia.org/wiki/Dot_product) of two vectors.
     * @param other The other vector to calculate the dot product with.
     * @returns The dot product of the two vectors.
     */
    dot(other: Vector3): number {
        return this.x * other.x + this.y * other.y + this.z * other.z;
    }

    /**
     * Converts the vector to a FileVector3, which is the format used in blueprints.
     * @returns The FileVector3.
     */
    toFileVec3(): FileVector3 {
        return { x: this.x, y: this.y, z: this.z };
    }
}
