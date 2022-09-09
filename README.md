# scrap-blueprint

A Typescript library for building and editing Scrap Mechanic blueprint files.

# Basic Usage

```ts
import { Blueprint, Blocks, UUID, Vector3 } from "scrap-blueprint";

const blueprint = Blueprint.create();
const body = blueprint.addBody();
body.addChild(
    Blocks.create(
        UUID("Wood Block 1"),
        new Vector3(0, 0, 0),
        new Vector3(16, 16, 1),
        "FF0000"
    )
);
blueprint.writeToFile("./blueprint.json");
```
This creates a new blueprint, adds a red 16x16 square of wood, then saves it to "blueprint.json" in the local directory.