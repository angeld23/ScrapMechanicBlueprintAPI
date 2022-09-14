import {
    ControllerControllerData,
    FileBlueprint,
    FileBody,
    FileChild,
    FileJoint,
    FileShape,
    GenericControllerData,
    LogicGateControllerData,
    LogicMode,
    PistonControllerData,
    SuspensionControllerData,
    Axis,
    SensorControllerData,
    FileVector3,
    EngineControllerData,
    ThrusterControllerData,
    HornControllerData,
    DriverSeatControllerData,
    SteeringSettings,
    TimerControllerData,
    LightControllerData,
    TotebotControllerData,
    TotebotType,
} from "../types";
import fs from "fs";
import {
    assume,
    getDefaultColor,
    getJointDirection,
    getRotationPositionOffset,
    getSuspensionLength,
    UUID,
    logicGateModeNames,
    logicGateModes,
    engineLevels,
    hornLevels,
    isDriverSeat,
    objectOrId,
} from "../util";
import { Vector3 } from "./vector3";

function getId(): number {
    return Math.floor(Math.random() * 99999999999);
}

/**
 * A base class for a part with a color and shapeId.
 */
export class Shape {
    constructor(public readonly fileShape: FileShape) {}

    /**
     * The color of this shape.
     */
    get color() {
        return this.fileShape.color;
    }
    set color(value) {
        this.fileShape.color = value;
    }

    /**
     * The shapeId of this shape. Determines the model and behavior in-game.
     */
    get shapeId() {
        return this.fileShape.shapeId;
    }
    set shapeId(value) {
        this.fileShape.shapeId = value;
    }
}

/**
 * A base class for a shape contained in a body. Has a position and rotation, and can be connected to other childs (assuming they are both interactable).
 */
export class Child extends Shape {
    constructor(public readonly fileChild: FileChild) {
        super(fileChild);

        this.desiredPosition = Vector3.fromFileVec3(fileChild.pos).add(
            getRotationPositionOffset(fileChild.xaxis, fileChild.zaxis)
        );
        fileChild._childId = fileChild._childId ?? getId();
    }
    /**
     * Attempts to convert a Shape to a Child. Only returns if the Shape's file object is a Child.
     * @param potential The Shape to convert.
     * @returns The converted Child, or undefined if the Shape was not a Child.
     */
    static convert(potential: Shape) {
        // @ts-ignore
        // prettier-ignore
        return "pos" in potential.fileShape ? new Child(potential.fileShape) : undefined;
    }

    private desiredPosition: Vector3;

    protected updateValues() {
        const rotOffset = getRotationPositionOffset(
            this.fileChild.xaxis,
            this.fileChild.zaxis
        );
        this.fileChild.pos = this.desiredPosition.sub(rotOffset).toFileVec3();
    }

    /**
     * The position of this child.
     */
    get position() {
        return this.desiredPosition;
    }
    set position(value) {
        this.desiredPosition = value;
        this.updateValues();
    }

    /**
     * The rotation of this child.
     */
    get rotation(): Axis {
        return [this.fileChild.xaxis, this.fileChild.zaxis];
    }
    set rotation(value) {
        this.fileChild.xaxis = value[0];
        this.fileChild.zaxis = value[1];
        this.updateValues();
    }

    private checkController() {
        this.fileChild.controller = this.fileChild.controller ?? {
            id: getId(),
        };
    }

    /**
     * Connects this child to another child. Both children must be interactable.
     * @param other The Child object or the ID of the child to connect to.
     */
    connectTo(other: Child | number) {
        this.checkController();
        const id = objectOrId(other);

        const casted = this.fileChild.controller as GenericControllerData;
        casted.controllers = casted.controllers ?? [];
        casted.controllers.push({ id: id });
    }
    /**
     * Disconnects this child from another child.
     * @param other The Child object or the ID of the child to disconnect from.
     */
    disconnectFrom(other: Child | number) {
        this.checkController();

        const casted = this.fileChild.controller as GenericControllerData;
        casted.controllers = casted.controllers ?? [];
        casted.controllers = casted.controllers.filter(
            (controller) => controller.id !== objectOrId(other)
        );
    }

    /**
     * Gets the ID of the child.
     * @returns The ID of the child.
     */
    getId() {
        this.checkController();
        return this.fileChild.controller!.id;
    }
    /**
     * Gets a list of the IDs of the children this child is connected to.
     * @returns The list of IDs.
     */
    getConnectedIds() {
        this.checkController();
        const casted = this.fileChild.controller as GenericControllerData;
        return casted.controllers?.map((controller) => controller.id) ?? [];
    }
}

/**
 * Represents any non-block part.
 */
export class Part extends Child {
    constructor(public readonly filePart: FileChild) {
        super(filePart);
    }
    /**
     * Creates a part.
     * @param shapeId The shapeId of the part.
     * @param position The position of the part.
     * @param rotation The rotation of the part.
     * @param color The color of the part. Fallbacks to the part's default color.
     * @returns The created part.
     */
    static create(
        shapeId: string,
        position: Vector3,
        rotation: Axis,
        color?: string
    ) {
        return new Part({
            shapeId: shapeId,
            pos: position
                .sub(getRotationPositionOffset(...rotation))
                .toFileVec3(),
            xaxis: rotation[0],
            zaxis: rotation[1],
            color: color ?? getDefaultColor(shapeId),
        });
    }

    /**
     * Attempts to convert a Child to a Part. Only returns if the Child's file object is a Part.
     * @param potential The Child to convert.
     * @returns The converted Part, or undefined if the Child was not a Part.
     */
    static convert(potential: Child) {
        return new Part(potential.fileChild);
    }
}

/**
 * Represents a group of blocks.
 */
export class Blocks extends Child {
    constructor(
        public readonly fileBlocks: FileChild & {
            bounds: FileVector3;
        }
    ) {
        super(fileBlocks);
    }
    /**
     * Creates a group of blocks.
     * @param shapeId The shapeId of the group of blocks.
     * @param position The position of the group of blocks.
     * @param bounds The bounds of the group of blocks.
     * @param color The color of the group of blocks. Fallbacks to the block's default color.
     * @returns The created group of blocks.
     */
    static create(
        shapeId: string,
        position: Vector3,
        bounds = new Vector3(1, 1, 1),
        color?: string
    ) {
        return new Blocks({
            pos: position.sub(getRotationPositionOffset(1, 3)).toFileVec3(),
            xaxis: 1,
            zaxis: 3,
            shapeId: shapeId,
            color: color ?? getDefaultColor(shapeId),
            bounds: bounds.toFileVec3(),
        });
    }
    /**
     * Attempts to convert a Child to Blocks. Only returns if the Child's file object is Blocks.
     * @param potential The Child to convert.
     * @returns The converted Blocks, or undefined if the Child was not Blocks.
     */
    static convert(potential: Child) {
        // @ts-ignore
        // prettier-ignore
        return "bounds" in potential.fileChild ? new Blocks(potential.fileChild) : undefined;
    }

    /**
     * The bounds of the group of blocks.
     */
    get bounds() {
        return Vector3.fromFileVec3(this.fileBlocks.bounds);
    }
    set bounds(value) {
        this.fileBlocks.bounds = value.toFileVec3();
    }
}

/**
 * A base class for a joint. (Bearing, Piston, etc.)
 */
export class Joint extends Shape {
    private desiredPosition: Vector3;
    constructor(public readonly fileJoint: FileJoint) {
        super(fileJoint);
        this.desiredPosition = Vector3.fromFileVec3(fileJoint.posA).add(
            getRotationPositionOffset(fileJoint.xaxisA, fileJoint.zaxisA)
        );
    }
    static _internalCreate(
        shapeId: string,
        position: Vector3,
        rotation: Axis,
        childA: Child,
        childB?: Child,
        color?: string
    ) {
        const fixedPos = position
            .sub(getRotationPositionOffset(...rotation))
            .toFileVec3();
        return new Joint({
            childA: childA.fileChild._childId ?? -1,
            childB: childB?.fileChild._childId ?? -1,
            posA: fixedPos,
            posB: fixedPos,
            xaxisA: rotation[0],
            zaxisA: rotation[1],
            xaxisB: rotation[0],
            zaxisB: rotation[1],
            shapeId: shapeId,
            color: color ?? getDefaultColor(shapeId),
            id: getId(),
        });
    }

    protected updateValues() {
        const rotOffset = getRotationPositionOffset(
            this.fileJoint.xaxisA,
            this.fileJoint.zaxisA
        );
        this.fileJoint.posA = this.desiredPosition.sub(rotOffset).toFileVec3();
        this.fileJoint.posB = this.fileJoint.posA;
    }

    /**
     * The position of this joint.
     */
    get position() {
        return this.desiredPosition;
    }
    set position(value) {
        this.desiredPosition = value;
        this.updateValues();
    }

    /**
     * The rotation of this joint.
     */
    get rotation(): Axis {
        return [this.fileJoint.xaxisA, this.fileJoint.zaxisA];
    }
    set rotation(value) {
        this.fileJoint.xaxisA = value[0];
        this.fileJoint.zaxisA = value[1];
        this.fileJoint.xaxisB = value[0];
        this.fileJoint.zaxisB = value[1];
        this.updateValues();
    }

    /**
     * Gets the ID of this joint.
     * @returns The ID.
     */
    getId() {
        return this.fileJoint.id;
    }
}

/**
 * Represents a piston joint.
 */
export class PistonJoint extends Joint {
    constructor(
        public readonly fileJoint: FileJoint & {
            controller: PistonControllerData;
        }
    ) {
        super(fileJoint);
    }
    /**
     * Creates a piston joint.
     * @param position The position of the piston joint.
     * @param rotation The rotation of the piston joint.
     * @param childA The first child of the piston joint.
     * @param childB The second child of the piston joint. Optional.
     * @param color The color of the piston joint. Fallbacks to the piston's default color.
     * @param length The length of the piston joint. Unused if the piston is connected to a controller. Defaults to 1.
     * @param speed The speed of the piston joint. Unused if the piston is connected to a controller. Defaults to 1.
     * @returns The created piston joint.
     */
    static create(
        position: Vector3,
        rotation: Axis,
        childA: Child,
        childB?: Child,
        color?: string,
        length = 1,
        speed = 1
    ) {
        const joint = Joint._internalCreate(
            UUID("Piston"),
            position,
            rotation,
            childA,
            childB,
            color
        );
        const controller: PistonControllerData = {
            id: getId(),
            length: length,
            speed: speed,
        };
        joint.fileJoint.controller = controller;
        const piston = new PistonJoint(
            joint.fileJoint as FileJoint & { controller: PistonControllerData }
        );
        piston.updateValues();
        return piston;
    }
    /**
     * Attempts to convert a Joint to PistonJoint. Only returns if the Joint's file object is a PistonJoint.
     * @param potential The Joint to convert.
     * @returns The converted PistonJoint, or undefined if the Joint was not a PistonJoint.
     */
    static convert(potential: Joint) {
        // @ts-ignore
        // prettier-ignore
        return "controller" in potential.fileJoint && potential.fileJoint.controller.length !== undefined ? new PistonJoint(potential.fileJoint) : undefined;
    }

    protected updateValues() {
        super.updateValues();
        this.fileJoint.posB = Vector3.fromFileVec3(this.fileJoint.posA)
            .add(
                getJointDirection(this.fileJoint.xaxisA, this.fileJoint.zaxisA)
            )
            .toFileVec3();
    }

    /**
     * The length of the piston joint.
     */
    get length() {
        return this.fileJoint.controller.length;
    }
    set length(value) {
        this.fileJoint.controller.length = value;
    }

    /**
     * The speed of the piston joint.
     */
    get speed() {
        return this.fileJoint.controller.speed;
    }
    set speed(value) {
        this.fileJoint.controller.speed = value;
    }
}

/**
 * Represents a bearing joint.
 */
export class BearingJoint extends Joint {
    constructor(
        public readonly fileJoint: FileJoint & {
            controller: undefined;
        }
    ) {
        super(fileJoint);
    }
    /**
     * Creates a bearing.
     * @param position The position of the bearing.
     * @param rotation The rotation of the bearing.
     * @param childA The first child of the bearing.
     * @param childB The second child of the bearing. Optional.
     * @param color The color of the bearing. Fallbacks to the bearing's default color.
     * @returns The created bearing.
     */
    static create = Joint._internalCreate.bind(undefined, UUID("Bearing"));
    /**
     * Attempts to convert a Joint to BearingJoint. Only returns if the Joint's file object is a BearingJoint.
     * @param potential The Joint to convert.
     * @returns The converted BearingJoint, or undefined if the Joint was not a BearingJoint.
     */
    static convert(potential: Joint) {
        // @ts-ignore
        // prettier-ignore
        return !("controller" in potential.fileJoint) ? new BearingJoint(potential.fileJoint) : undefined;
    }
}

/**
 * Represents a suspension joint.
 */
export class SuspensionJoint extends Joint {
    constructor(
        public readonly fileJoint: FileJoint & {
            controller: SuspensionControllerData;
        }
    ) {
        super(fileJoint);
    }
    /**
     * Creates a suspension joint.
     * @param position The position of the suspension joint.
     * @param rotation The rotation of the suspension joint.
     * @param childA The first child of the suspension joint.
     * @param childB The second child of the suspension joint. Optional.
     * @param color The color of the suspension joint. Fallbacks to the suspension's default color.
     * @param sportSuspension Whether the suspension is a sport suspension. Defaults to false.
     * @param stiffness The stiffness of the suspension. Defaults to 6.
     * @returns
     */
    static create(
        position: Vector3,
        rotation: Axis,
        childA: Child,
        childB?: Child,
        color?: string,
        sportSuspension = false,
        stiffness = 6
    ) {
        const joint = Joint._internalCreate(
            sportSuspension
                ? UUID("Sport Suspension")
                : UUID("Off-Road Suspension"),
            position,
            rotation,
            childA,
            childB,
            color
        );
        const controller: SuspensionControllerData = {
            id: getId(),
            stiffnessLevel: stiffness,
        };
        joint.fileJoint.controller = controller;
        const suspension = new SuspensionJoint(
            joint.fileJoint as FileJoint & {
                controller: SuspensionControllerData;
            }
        );
        suspension.updateValues();
        return suspension;
    }
    /**
     * Attempts to convert a Joint to SuspensionJoint. Only returns if the Joint's file object is a SuspensionJoint.
     * @param potential The Joint to convert.
     * @returns The converted SuspensionJoint, or undefined if the Joint was not a SuspensionJoint.
     */
    static convert(potential: Joint) {
        // @ts-ignore
        // prettier-ignore
        return "controller" in potential.fileJoint && potential.fileJoint.controller.stiffnessLevel !== undefined ? new SuspensionJoint(potential.fileJoint) : undefined;
    }

    protected updateValues() {
        super.updateValues();
        this.fileJoint.posB = Vector3.fromFileVec3(this.fileJoint.posA)
            .add(
                getJointDirection(
                    this.fileJoint.xaxisA,
                    this.fileJoint.zaxisA
                ).mul(getSuspensionLength(this.shapeId))
            )
            .toFileVec3();
    }

    /**
     * The stiffness of the suspension joint.
     */
    get stiffnessLevel() {
        return this.fileJoint.controller.stiffnessLevel;
    }
    set stiffnessLevel(value) {
        this.fileJoint.controller.stiffnessLevel = value;
    }
}

/**
 * Represents a Controller.
 */
export class ControllerPart extends Child {
    constructor(
        private fileController: FileChild & {
            controller: ControllerControllerData;
        }
    ) {
        super(fileController);
    }
    /**
     * Creates a controller.
     * @param position The position of the controller.
     * @param rotation The rotation of the controller.
     * @param color The color of the controller. Fallbacks to the controller's default color.
     * @param looped Whether the controller is looped. Defaults to false.
     * @param timePerFrame The time per frame of the controller. Defaults to 1.
     * @returns The created controller.
     */
    static create(
        position: Vector3,
        rotation: Axis,
        color?: string,
        looped = false,
        timePerFrame = 1
    ) {
        return new ControllerPart({
            pos: position
                .sub(getRotationPositionOffset(...rotation))
                .toFileVec3(),
            xaxis: rotation[0],
            zaxis: rotation[1],
            shapeId: UUID("Controller"),
            color: color ?? getDefaultColor(UUID("Controller")),
            controller: {
                playMode: looped ? 2 : 0,
                timePerFrame: timePerFrame,
                id: getId(),
            },
        });
    }
    /**
     * Attempts to convert a Child to ControllerPart. Only returns if the Child's file object is a ControllerPart.
     * @param potential The Child to convert.
     * @returns The converted ControllerPart, or undefined if the Child was not a ControllerPart.
     */
    static convert(potential: Child) {
        // @ts-ignore
        // prettier-ignore
        return "controller" in potential.fileChild && potential.fileChild.controller.timePerFrame !== undefined ? new ControllerPart(potential.fileChild) : undefined;
    }

    /**
     * Adds or updates a sequence for a joint in the controller.
     * @param index The index of the sequence. Controls where in the UI the sequence is.
     * @param joint The piston or bearing to add or update.
     * @param sequence The sequence of frames to add or update. The first element is the starting frame, when the controller is off. Missing values are filled in. Any items in the array past index 10 are ignored.
     * @param reversed Whether positive angles will spin the bearing counter-clockwise (looking from the front). Only applies when this sequence is for a bearing. Defaults to false.
     */
    setSequence(
        index: number,
        joint: PistonJoint | BearingJoint,
        sequence: number[],
        reversed = false
    ) {
        this.removeSequence(joint);

        const controller = this.fileController.controller;

        if ("controller" in joint.fileJoint) {
            controller.controllers = controller.controllers ?? [];
            assume<PistonJoint>(joint);
            const frames: { setting: number }[] = [];
            let last = 0;
            for (let i = 0; i < 11; i++) {
                frames.push({ setting: sequence[i] ?? last });
                if (sequence[i] !== undefined) last = sequence[i];
            }

            controller.controllers.push({
                index: index,
                id: joint.getId(),
                frames: frames,
            });
        } else {
            controller.joints = controller.joints ?? [];
            assume<BearingJoint>(joint);

            const frames: { targetAngle: number }[] = [];
            let endAngle = sequence[0];
            for (let i = 0; i < 10; i++) {
                endAngle += sequence[i + 1] ?? 0;
                frames.push({ targetAngle: sequence[i + 1] ?? 0 });
            }
            controller.joints.push({
                id: joint.getId(),
                index: index,
                reverse: reversed,
                startAngle: sequence[0],
                frames: frames,
                endAngle: endAngle,
            });
        }
    }
    /**
     * Removes a sequence for a given joint from the controller if it exists.
     * @param joint The piston or bearing to remove the sequence for. Can be an ID.
     */
    removeSequence(joint: PistonJoint | BearingJoint | number) {
        const controller = this.fileController.controller;

        const id = objectOrId(joint);
        if (controller.joints) {
            controller.joints = controller.joints.filter((j) => j.id !== id);
        }
        if (controller.controllers) {
            // @ts-ignore -- for some reason it's screaming at me so whatever
            controller.controllers = controller.controllers.filter(
                (j) => j.id !== id
            );
        }
    }
    /**
     * Retrieves the sequence for a given joint if it exists.
     * @param joint The piston or bearing to retrieve the sequence for.
     * @returns The sequence of the joint, or undefined if it does not exist.
     */
    getSequence(joint: PistonJoint | BearingJoint | number):
        | {
              frames: number[];
              reversed: boolean;
          }
        | undefined {
        const controller = this.fileController
            .controller as ControllerControllerData;

        const id = objectOrId(joint);
        if (controller.joints) {
            const jointController = controller.joints.find((j) => j.id === id);
            if (jointController) {
                return {
                    frames: [
                        jointController.startAngle,
                        ...jointController.frames.map((f) => f.targetAngle),
                    ],
                    reversed: jointController.reverse,
                };
            }
        }
        if (controller.controllers) {
            const jointController = controller.controllers.find(
                (j) => j.id === id
            );
            if (jointController) {
                return {
                    frames: jointController.frames.map((f) => f.setting),
                    reversed: false,
                };
            }
        }
    }
    /**
     * Gets a list of the IDs of all joints this controller is connected to.
     * @returns The list of joint IDs.
     */
    getConnectedJointIds() {
        const controller = this.fileController.controller;
        const joints: number[] = [];
        if (controller.joints) {
            joints.push(...controller.joints.map((j) => j.id));
        }
        if (controller.controllers) {
            joints.push(...controller.controllers.map((j) => j.id));
        }
        return joints;
    }

    /**
     * Whether the controller is looped.
     */
    get looped() {
        return this.fileController.controller.playMode === 2;
    }
    set looped(value) {
        this.fileController.controller.playMode = value ? 2 : 0;
    }

    /**
     * The time per frame of the controller.
     */
    get timePerFrame() {
        return this.fileController.controller.timePerFrame;
    }
    set timePerFrame(value) {
        this.fileController.controller.timePerFrame = value;
    }
}

/**
 * Represents a logic gate.
 */
export class LogicGatePart extends Child {
    constructor(
        private fileLogicGate: FileChild & {
            controller: LogicGateControllerData;
        }
    ) {
        super(fileLogicGate);
    }
    /**
     * Creates a logic gate.
     * @param position The position of the logic gate.
     * @param rotation The rotation of the logic gate.
     * @param color The color of the logic gate. Fallbacks to the logic gate's default color.
     * @param mode The mode of the logic gate. Defaults to AND.
     * @returns The created logic gate.
     */
    static create(
        position: Vector3,
        rotation: Axis,
        color?: string,
        mode: LogicMode = "AND"
    ) {
        return new LogicGatePart({
            pos: position
                .sub(getRotationPositionOffset(...rotation))
                .toFileVec3(),
            xaxis: rotation[0],
            zaxis: rotation[1],
            shapeId: UUID("Logic Gate"),
            color: color ?? getDefaultColor(UUID("Logic Gate")),
            controller: {
                id: getId(),
                mode: logicGateModes[mode],
            },
        });
    }
    /**
     * Attempts to convert a Child to a LogicGatePart. Only returns if the Child's file object is a LogicGatePart.
     * @param potential The Child to convert.
     * @returns The converted LogicGatePart, or undefined if the Child is not a LogicGatePart.
     */
    static convert(potential: Child) {
        // @ts-ignore
        // prettier-ignore
        return "controller" in potential.fileChild && potential.fileChild.controller.mode !== undefined ? new LogicGatePart(potential.fileChild) : undefined;
    }

    /**
     * The mode of the logic gate.
     */
    get mode(): LogicMode {
        return logicGateModeNames[this.fileLogicGate.controller.mode];
    }
    set mode(value: LogicMode) {
        this.fileLogicGate.controller.mode = logicGateModes[value];
    }
}

/**
 * Represents a sensor.
 */
export class SensorPart extends Child {
    constructor(
        private fileSensor: FileChild & {
            controller: SensorControllerData;
        }
    ) {
        super(fileSensor);
    }
    /**
     * Creates a sensor.
     * @param position The position of the sensor.
     * @param rotation The rotation of the sensor.
     * @param color The color of the sensor. Fallbacks to the sensor's default color.
     * @param range The range of the sensor. Defaults to 10.
     * @param audioEnabled Whether the sensor plays audio when activated. Defaults to false.
     * @param buttonMode Whether the sensor will only be active while sensing, instead of toggling when being triggered. Defaults to true.
     * @param colorMode Whether the sensor will only activate when a block of a certain color is sensed. Defaults to false.
     * @param filterColor The color to filter for if colorMode is true. Defaults to "FFFFFF".
     * @returns The created sensor.
     */
    static create(
        position: Vector3,
        rotation: Axis,
        color?: string,
        range = 10,
        audioEnabled = false,
        buttonMode = true,
        colorMode = false,
        filterColor = "FFFFFF"
    ) {
        return new SensorPart({
            pos: position
                .sub(getRotationPositionOffset(...rotation))
                .toFileVec3(),
            xaxis: rotation[0],
            zaxis: rotation[1],
            shapeId: UUID("Sensor"),
            color: color ?? getDefaultColor(UUID("Sensor")),
            controller: {
                id: getId(),
                range: range,
                audioEnabled: audioEnabled,
                buttonMode: buttonMode,
                colorMode: colorMode,
                color: filterColor,
            },
        });
    }
    /**
     * Attempts to convert a Child to a SensorPart. Only returns if the Child's file object is a SensorPart.
     * @param potential The Child to convert.
     * @returns The converted SensorPart, or undefined if the Child is not a SensorPart.
     */
    static convert(potential: Child) {
        // @ts-ignore
        // prettier-ignore
        return "controller" in potential.fileChild && potential.fileChild.controller.range !== undefined ? new SensorPart(potential.fileChild) : undefined;
    }

    /**
     * Whether the sensor plays audio when activated.
     */
    get audioEnabled() {
        return this.fileSensor.controller.audioEnabled;
    }
    set audioEnabled(value) {
        this.fileSensor.controller.audioEnabled = value;
    }

    /**
     * Whether the sensor will only be active while sensing, instead of toggling when being triggered.
     */
    get buttonMode() {
        return this.fileSensor.controller.buttonMode;
    }
    set buttonMode(value) {
        this.fileSensor.controller.buttonMode = value;
    }

    /**
     * The color to filter for if colorMode is true.
     */
    get filterColor() {
        return this.fileSensor.controller.color;
    }
    set filterColor(value) {
        this.fileSensor.controller.color = value;
    }

    /**
     * Whether the sensor will only activate when a block of a certain color is sensed.
     */
    get colorMode() {
        return this.fileSensor.controller.colorMode;
    }
    set colorMode(value) {
        this.fileSensor.controller.colorMode = value;
    }

    /**
     * The range of the sensor.
     */
    get range() {
        return this.fileSensor.controller.range;
    }
    set range(value) {
        this.fileSensor.controller.range = value;
    }
}

/**
 * Represents an engine.
 */
export class EnginePart extends Child {
    constructor(
        private fileEngine: FileChild & {
            controller: EngineControllerData;
        }
    ) {
        super(fileEngine);
    }
    /**
     * Creates an engine.
     * @param position The position of the engine.
     * @param rotation The rotation of the engine.
     * @param color The color of the engine. Fallbacks to the engine's default color.
     * @param level The level of the engine. Defaults to 0.
     * @param electric Whether the engine is electric. Defaults to false.
     * @returns The created engine.
     */
    static create(
        position: Vector3,
        rotation: Axis,
        color?: string,
        level = 0,
        electric = false
    ) {
        const uuid = UUID(electric ? "Electric Engine" : "Gas Engine");
        return new EnginePart({
            pos: position
                .sub(getRotationPositionOffset(...rotation))
                .toFileVec3(),
            xaxis: rotation[0],
            zaxis: rotation[1],
            shapeId: uuid,
            color: color ?? getDefaultColor(uuid),
            controller: {
                id: getId(),
                data: engineLevels[level],
            },
        });
    }
    /**
     * Attempts to convert a Child to an EnginePart. Only returns if the Child's file object is an EnginePart.
     */
    static convert(potential: Child) {
        // @ts-ignore
        // prettier-ignore
        return "controller" in potential.fileChild && potential.fileChild.controller.data !== undefined && potential.shapeId !== UUID("Horn") ? new EnginePart(potential.fileChild) : undefined;
    }

    /**
     * The level of the engine.
     * @note Attempting to get this property from an engine in a blueprint saved in-game, without first setting it with this API, has a chance to return 0 instead of the actual level. This is due to some shenanigans with the way engine levels are stored within serialized Lua data.
     */
    get level() {
        const index = engineLevels.findIndex(
            (l) => l === this.fileEngine.controller.data
        );
        return index === -1 ? 0 : index;
    }
    set level(value) {
        this.fileEngine.controller.data = engineLevels[value];
    }

    /**
     * Adds or updates a connection to a bearing.
     * @param bearing The bearing to connect to. Can be an ID.
     * @param reversed Whether the bearing spins counter-clockwise looking from the front. Defaults to false.
     */
    setBearing(bearing: BearingJoint | number, reversed = false) {
        this.disconnectBearing(bearing);
        const id = objectOrId(bearing);
        this.fileEngine.controller.joints!.push({
            id: id,
            reverse: reversed ? 1 : 0,
        });
    }

    /**
     * Removes a connection to a bearing.
     * @param bearing The bearing to disconnect from. Can be an ID.
     */
    disconnectBearing(bearing: BearingJoint | number) {
        const id = objectOrId(bearing);
        this.fileEngine.controller.joints =
            this.fileEngine.controller.joints?.filter(
                (bearing) => bearing.id !== id
            ) ?? [];
    }

    /**
     * Gets a list of IDs for any bearings connected to this engine.
     * @returns
     */
    getConnectedBearingIds() {
        return this.fileEngine.controller.joints?.map((j) => j.id) ?? [];
    }
}

/**
 * Represents a thruster.
 */
export class ThrusterPart extends Child {
    constructor(
        private fileThruster: FileChild & {
            controller: ThrusterControllerData;
        }
    ) {
        super(fileThruster);
    }
    /**
     * Creates a thruster.
     * @param position The position of the thruster.
     * @param rotation The rotation of the thruster.
     * @param color The color of the thruster. Fallbacks to the thruster's default color.
     * @param level The level of the thruster. Defaults to 5.
     * @returns The created thruster.
     */
    static create(
        position: Vector3,
        rotation: Axis,
        color?: string,
        level = 5
    ) {
        return new ThrusterPart({
            pos: position
                .sub(getRotationPositionOffset(...rotation))
                .toFileVec3(),
            xaxis: rotation[0],
            zaxis: rotation[1],
            shapeId: UUID("Thruster"),
            color: color ?? getDefaultColor(UUID("Thruster")),
            controller: {
                id: getId(),
                level: level,
            },
        });
    }
    /**
     * Attempts to convert a Child to a ThrusterPart. Only returns if the Child's file object is a ThrusterPart.
     */
    static convert(potential: Child) {
        // @ts-ignore
        // prettier-ignore
        return "controller" in potential.fileChild && potential.fileChild.controller.level !== undefined ? new ThrusterPart(potential.fileChild) : undefined;
    }

    /**
     * The level of the thruster.
     */
    get level() {
        return this.fileThruster.controller.level;
    }
    set level(value) {
        this.fileThruster.controller.level = value;
    }
}

/**
 * Represents a horn.
 */
export class HornPart extends Child {
    constructor(
        private fileHorn: FileChild & {
            controller: HornControllerData;
        }
    ) {
        super(fileHorn);
    }
    /**
     * Creates a horn.
     * @param position The position of the horn.
     * @param rotation The rotation of the horn.
     * @param color The color of the horn. Fallbacks to the horn's default color.
     * @param pitch The pitch of the horn. Defaults to 0.
     * @returns The created horn.
     */
    static create(
        position: Vector3,
        rotation: Axis,
        color?: string,
        pitch = 0
    ) {
        return new HornPart({
            pos: position
                .sub(getRotationPositionOffset(...rotation))
                .toFileVec3(),
            xaxis: rotation[0],
            zaxis: rotation[1],
            shapeId: UUID("Horn"),
            color: color ?? getDefaultColor(UUID("Horn")),
            controller: {
                id: getId(),
                data: hornLevels[pitch],
            },
        });
    }
    /**
     * Attempts to convert a Child to a HornPart. Only returns if the Child's file object is a HornPart.
     * @param potential The Child to convert.
     * @returns The converted HornPart, or undefined if the Child is not a HornPart.
     */
    static convert(potential: Child) {
        // @ts-ignore
        // prettier-ignore
        return potential.shapeId === UUID("Horn") ? new HornPart(potential.fileChild) : undefined;
    }

    /**
     * The pitch of the horn.
     * @note Attempting to get this property from a horn in a blueprint saved in-game, without first setting it with this API, has a chance to return 0 instead of the actual pitch. This is due to some shenanigans with the way horn pitches are stored within serialized Lua data.
     */
    get pitch() {
        const index = hornLevels.findIndex(
            (l) => l === this.fileHorn.controller.data
        );
        return index === -1 ? 0 : index;
    }
    set pitch(value) {
        this.fileHorn.controller.data = hornLevels[value];
    }
}

/**
 * Represents a driver seat.
 */
export class DriverSeatPart extends Child {
    constructor(
        private fileDriverSeat: FileChild & {
            controller: DriverSeatControllerData;
        }
    ) {
        super(fileDriverSeat);
    }
    /**
     * Creates a driver seat.
     * @param position The position of the driver seat.
     * @param rotation The rotation of the driver seat.
     * @param color The color of the driver seat. Fallbacks to the driver seat's default color.
     * @param saddle Whether the driver seat is a saddle. Defaults to false.
     * @returns The created driver seat.
     */
    static create(
        position: Vector3,
        rotation: Axis,
        color?: string,
        saddle = false
    ) {
        const uuid = UUID(saddle ? "Driver's Saddle" : "Driver's Seat");
        return new DriverSeatPart({
            pos: position
                .sub(getRotationPositionOffset(...rotation))
                .toFileVec3(),
            xaxis: rotation[0],
            zaxis: rotation[1],
            shapeId: uuid,
            color: color ?? getDefaultColor(uuid),
            controller: {
                id: getId(),
            },
        });
    }
    /**
     * Attempts to convert a Child to a DriverSeatPart. Only returns if the Child's file object is a DriverSeatPart.
     * @param potential The Child to convert.
     * @returns The converted DriverSeatPart, or undefined if the Child is not a DriverSeatPart.
     */
    static convert(potential: Child) {
        // @ts-ignore
        // prettier-ignore
        return isDriverSeat(potential.shapeId) ? new DriverSeatPart(potential.fileChild) : undefined;
    }

    /**
     * Adds or updates a connection to a bearing for steering.
     * @param bearing The bearing to connect to. Can be an ID.
     * @param reverse Determines what direction the bearing turns when pressing A or D. 0 = normal, 1 = reversed. Usually, front-wheel-steering cars will have the bearings set to reversed. Defaults to false.
     * @param steeringSettings The steering settings for the bearing. Not required.
     */
    setBearing(
        bearing: BearingJoint | number,
        reverse = false,
        steeringSettings?: Omit<Partial<SteeringSettings>, "id">
    ) {
        this.disconnectBearing(bearing);
        const controller = this.fileDriverSeat.controller;
        controller.joints = controller.joints ?? [];
        controller.steering = controller.steering ?? [];
        if (steeringSettings) {
            controller.steering.push({
                id: getId(),
                leftAngleLimit: steeringSettings.leftAngleLimit ?? 27,
                rightAngleLimit: steeringSettings.rightAngleLimit ?? 27,
                leftAngleSpeed: steeringSettings.leftAngleSpeed ?? 4.244,
                rightAngleSpeed: steeringSettings.rightAngleSpeed ?? 4.244,
                unlocked: steeringSettings.unlocked ?? true,
            });
        }
        controller.joints.push({
            id: objectOrId(bearing),
            reverse: reverse ? 1 : 0,
        });
    }
    /**
     * Removes a connection to a bearing.
     * @param bearing
     */
    disconnectBearing(bearing: BearingJoint | number) {
        const id = objectOrId(bearing);
        const controller = this.fileDriverSeat.controller;
        controller.joints = controller.joints?.filter((j) => j.id !== id) ?? [];
        controller.steering =
            controller.steering?.filter((j) => j.id !== id) ?? [];
    }
    /**
     * Gets a list of IDs of bearings connected to this driver seat.
     * @returns The list of IDs.
     */
    getConnectedBearingIds() {
        return this.fileDriverSeat.controller.joints?.map((j) => j.id) ?? [];
    }
}

/**
 * Represents a timer.
 */
export class TimerPart extends Child {
    constructor(
        private fileTimer: FileChild & {
            controller: TimerControllerData;
        }
    ) {
        super(fileTimer);
    }
    /**
     * Creates a timer.
     * @param position The position of the timer.
     * @param rotation The rotation of the timer.
     * @param color The color of the timer. Fallbacks to the timer's default color.
     * @param seconds The number of seconds the timer should delay signals. Defaults to 0.
     * @param ticks The number of ticks (1/40s) the timer should delay signals. Added onto the seconds. Defaults to 0.
     */
    static create(
        position: Vector3,
        rotation: Axis,
        color?: string,
        seconds = 0,
        ticks = 0
    ) {
        return new TimerPart({
            pos: position
                .sub(getRotationPositionOffset(...rotation))
                .toFileVec3(),
            xaxis: rotation[0],
            zaxis: rotation[1],
            shapeId: UUID("Timer"),
            color: color ?? getDefaultColor(UUID("Timer")),
            controller: {
                id: getId(),
                seconds: seconds,
                ticks: ticks,
            },
        });
    }
    /**
     * Attempts to convert a Child to a TimerPart. Only returns if the Child's file object is a TimerPart.
     * @param potential The Child to convert.
     * @returns The converted TimerPart, or undefined if the Child is not a TimerPart.
     */
    static convert(potential: Child) {
        // @ts-ignore
        // prettier-ignore
        return potential.shapeId === UUID("Timer") ? new TimerPart(potential.fileChild) : undefined;
    }

    /**
     * Gets the number of total seconds (including decimals) the timer delays signals, using both the seconds value and the ticks value.
     * @returns The number of seconds the timer delays signals.
     */
    getDelay() {
        return (
            this.fileTimer.controller.seconds +
            this.fileTimer.controller.ticks / 40
        );
    }

    /**
     * Sets the number of total seconds (including decimals) the timer delays signals, converting it to seconds and ticks.
     * @param seconds The number of seconds the timer should delay signals.
     */
    setDelay(seconds: number) {
        this.fileTimer.controller.seconds = Math.floor(seconds);
        this.fileTimer.controller.ticks = Math.floor((seconds % 1) * 40);
    }

    /**
     * The seconds value of the timer's delay.
     */
    get seconds() {
        return this.fileTimer.controller.seconds;
    }
    set seconds(value) {
        this.fileTimer.controller.seconds = value;
    }

    /**
     * The ticks value of the timer's delay.
     */
    get ticks() {
        return this.fileTimer.controller.ticks;
    }
    set ticks(value) {
        this.fileTimer.controller.ticks = value;
    }
}

/**
 * Represents a light.
 */
export class LightPart extends Child {
    constructor(
        private fileLight: FileChild & {
            controller: LightControllerData;
        }
    ) {
        super(fileLight);
    }
    /**
     * Creates a light.
     * @param position The position of the light.
     * @param rotation The rotation of the light.
     * @param color The color of the light. Fallbacks to the light's default color.
     * @param luminance The luminance of the light. Defaults to 1.
     * @returns The created light.
     */
    static create(
        position: Vector3,
        rotation: Axis,
        color?: string,
        luminance = 1
    ) {
        return new LightPart({
            pos: position
                .sub(getRotationPositionOffset(...rotation))
                .toFileVec3(),
            xaxis: rotation[0],
            zaxis: rotation[1],
            shapeId: UUID("Headlight"),
            color: color ?? getDefaultColor(UUID("Headlight")),
            controller: {
                id: getId(),
                luminance: luminance,
            },
        });
    }
    /**
     * Attempts to convert a Child to a LightPart. Only returns if the Child's file object is a LightPart.
     * @param potential The Child to convert.
     * @returns The converted LightPart, or undefined if the Child is not a LightPart.
     */
    static convert(potential: Child) {
        // @ts-ignore
        // prettier-ignore
        return "controller" in potential.fileChild && "luminance" in potential.fileChild.controller ? new LightPart(potential.fileChild) : undefined;
    }

    /**
     * The luminance of the light.
     */
    get luminance() {
        return this.fileLight.controller.luminance;
    }
    set luminance(value) {
        this.fileLight.controller.luminance = value;
    }
}

/**
 * Represents a totebot head.
 */
export class TotebotPart extends Child {
    constructor(
        private fileTotebot: FileChild & {
            controller: TotebotControllerData;
        }
    ) {
        super(fileTotebot);
    }
    /**
     * Creates a totebot head.
     * @param position The position of the totebot head.
     * @param rotation The rotation of the totebot head.
     * @param color The color of the totebot head. Fallbacks to the totebot head's default color.
     * @param headType The type of the totebot head. Defaults to "Synth Voice".
     * @param pitch The pitch of the totebot head (0-1). Defaults to 0.48.
     * @param volume The volume of the totebot head (0-100). Defaults to 100.
     * @param dance Whether the totebot's sounds are in dance mode. Defaults to false.
     * @returns
     */
    static create(
        position: Vector3,
        rotation: Axis,
        color?: string,
        headType: TotebotType = "Synth Voice",
        pitch = 0.48,
        volume = 100,
        dance = false
    ) {
        // @ts-ignore
        const uuid = UUID("Totebot Head: " + headType);
        return new TotebotPart({
            pos: position
                .sub(getRotationPositionOffset(...rotation))
                .toFileVec3(),
            xaxis: rotation[0],
            zaxis: rotation[1],
            shapeId: uuid,
            color: color ?? getDefaultColor(uuid),
            controller: {
                id: getId(),
                pitch: pitch,
                volume: volume,
                audioIndex: dance ? 1 : 0,
            },
        });
    }
    /**
     * Attempts to convert a Child to a TotebotPart. Only returns if the Child's file object is a TotebotPart.
     * @param potential The Child to convert.
     * @returns The converted TotebotPart, or undefined if the Child is not a TotebotPart.
     */
    static convert(potential: Child) {
        // @ts-ignore
        // prettier-ignore
        return "controller" in potential.fileChild && "audioIndex" in potential.fileChild.controller ? new TotebotPart(potential.fileChild) : undefined;
    }

    /**
     * The pitch of the totebot head (0-1).
     */
    get pitch() {
        return this.fileTotebot.controller.pitch;
    }
    set pitch(value) {
        this.fileTotebot.controller.pitch = value;
    }

    /**
     * The volume of the totebot head (0-100).
     */
    get volume() {
        return this.fileTotebot.controller.volume;
    }
    set volume(value) {
        this.fileTotebot.controller.volume = value;
    }

    /**
     * Whether the totebot's sounds are in dance mode.
     */
    get dance() {
        return this.fileTotebot.controller.audioIndex === 1;
    }
    set dance(value) {
        this.fileTotebot.controller.audioIndex = value ? 1 : 0;
    }

    /**
     * The type of the totebot head.
     */
    get headType() {
        return this.fileTotebot.shapeId.split(": ")[1] as TotebotType;
    }
    set headType(value) {
        // @ts-ignore
        this.fileTotebot.shapeId = UUID("Totebot Head: " + value);
    }
}

/**
 * A collection of children that are part of the same rigid body.
 */
export class Body {
    constructor(public readonly fileBody: FileBody) {}
    /**
     * Creates a body.
     * @returns The created body.
     */
    static create() {
        return new Body({
            childs: [],
        });
    }

    /**
     * Gets a list of all the children in the body.
     * @returns The list of children.
     */
    getChildren() {
        return this.fileBody.childs.map((child) => new Child(child));
    }
    /**
     * Adds a child to the body.
     * @param child The child to add.
     * @returns The added child.
     */
    addChild<T extends Child>(child: T): T {
        this.fileBody.childs.push(child.fileChild);
        return child;
    }
    /**
     * Removes a child from the body, if it is present.
     * @param child The child to remove.
     */
    removeChild(child: Child) {
        this.fileBody.childs = this.fileBody.childs.filter(
            (fileChild) => fileChild !== child.fileChild
        );
    }
}

/**
 * Represents an entire blueprint file.
 */
export class Blueprint {
    private readonly fileBlueprint: FileBlueprint;

    constructor(fileBlueprint?: FileBlueprint) {
        this.fileBlueprint = fileBlueprint ?? {
            version: 4,
            bodies: [],
        };
    }
    /**
     * Creates a blank blueprint.
     * @returns The created blueprint.
     */
    static create() {
        return new Blueprint();
    }
    /**
     * Creates a blueprint from a JSON string.
     * @param text The JSON string.
     * @returns The created blueprint.
     */
    static fromJson(text: string): Blueprint {
        return new Blueprint(JSON.parse(text));
    }
    /**
     * Creates a blueprint from a file path.
     * @param path The file path.
     * @returns The created blueprint.
     */
    static fromFile(path: fs.PathOrFileDescriptor): Blueprint {
        return Blueprint.fromJson(fs.readFileSync(path).toString());
    }

    /**
     * Gets a list of all the bodies in the blueprint.
     * @returns The list of bodies.
     */
    getBodies() {
        return this.fileBlueprint.bodies.map((body) => new Body(body));
    }
    /**
     * Gets a list of all the joints in the blueprint.
     * @returns The list of joints.
     */
    getJoints() {
        return this.fileBlueprint.joints
            ? this.fileBlueprint.joints.map((joint) => {
                  const controller = joint.controller;
                  if (!controller) return new Joint(joint);
                  if ("length" in controller)
                      return new PistonJoint(joint as any);
                  if ("stiffnessLevel" in controller)
                      return new SuspensionJoint(joint as any);
                  return new Joint(joint);
              })
            : [];
    }
    /**
     * Converts the blueprint to a JSON string.
     * @returns The JSON string.
     */
    toJSON() {
        const blueprint = JSON.parse(
            JSON.stringify(this.fileBlueprint)
        ) as FileBlueprint;
        let i = 0;
        const blueprintWideIndexes = new Map<number, number>();
        blueprint.bodies.forEach((body) => {
            body.childs.forEach((child) => {
                if (child._childId === undefined)
                    throw new Error("A child is missing a _childId property!");
                blueprintWideIndexes.set(child._childId, i++);
                child._childId = undefined;
            });
        });

        blueprint.joints?.forEach((joint) => {
            joint.childA = blueprintWideIndexes.get(joint.childA) ?? -1;
            joint.childB = blueprintWideIndexes.get(joint.childB) ?? -1;
        });

        return JSON.stringify(blueprint);
    }
    /**
     * Converts the blueprint to a JSON string and writes it to a file.
     * @param path The file path.
     */
    writeToFile(path: fs.PathOrFileDescriptor) {
        fs.writeFileSync(path, this.toJSON());
    }
    /**
     * Adds a joint to the blueprint.
     * @param joint The joint to add.
     * @returns The added joint.
     */
    addJoint<T extends Joint>(joint: T): T {
        this.fileBlueprint.joints = this.fileBlueprint.joints ?? [];
        this.fileBlueprint.joints.push(joint.fileJoint);
        return joint;
    }
    /**
     * Removes a joint from the blueprint, if it is present.
     * @param joint The joint to remove.
     */
    removeJoint(joint: Joint) {
        if (!this.fileBlueprint.joints) return;
        this.fileBlueprint.joints = this.fileBlueprint.joints.filter(
            (fileJoint) => fileJoint !== joint.fileJoint
        );
    }
    /**
     * Adds a body to the blueprint.
     * @param body The body to add.
     * @returns The added body.
     */
    addBody(body?: Body): Body {
        body = body ?? Body.create();
        this.fileBlueprint.bodies.push(body.fileBody);
        return body;
    }
    /**
     * Removes a body from the blueprint, if it is present.
     * @param body The body to remove.
     */
    removeBody(body: Body) {
        this.fileBlueprint.bodies = this.fileBlueprint.bodies.filter(
            (fileBody) => fileBody !== body.fileBody
        );
    }
    /**
     * Gets a joint in the blueprint with the given ID if it exists.
     * @param id The ID of the joint.
     * @returns The joint, if it exists.
     */
    getJointFromId(id: number) {
        return this.getJoints().find((joint) => joint.getId() === id);
    }
}
