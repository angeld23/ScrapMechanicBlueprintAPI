import { getAxisFromTwistsAndFace } from "../rotations";
import { Face, Axis } from "../types";

export class PartRotation {
    public readonly Twists: 0 | 1 | 2 | 3;
    constructor(public readonly Face: Face, twists: 0 | 1 | 2 | 3 = 0) {
        this.Twists = twists;
    }

    toAxis(): Axis {
        return getAxisFromTwistsAndFace(this.Twists, this.Face);
    }
}
