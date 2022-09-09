import {
    BaseControllerData,
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
} from "../util";
import { Vector3 } from "./vector3";
import { Direction } from "readline";
import { PartRotation } from "./partRotation";
import uuids from "../uuids";

let id = 0;
function getId(): number {
    return id++;
}

export class Shape {
    constructor(public readonly fileShape: FileShape) {}

    get color() {
        return this.fileShape.color;
    }
    set color(value) {
        this.fileShape.color = value;
    }

    get shapeId() {
        return this.fileShape.shapeId;
    }
    set shapeId(value) {
        this.fileShape.shapeId = value;
    }
}

export class Child extends Shape {
    constructor(public readonly fileChild: FileChild) {
        super(fileChild);

        this.desiredPosition = Vector3.fromFileVec3(fileChild.pos).add(
            getRotationPositionOffset(fileChild.xaxis, fileChild.zaxis)
        );
        fileChild._childId = fileChild._childId ?? getId();
    }
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

    get position() {
        return this.desiredPosition;
    }
    set position(value) {
        this.desiredPosition = value;
        this.updateValues();
    }

    get rotation(): Axis {
        return [this.fileChild.xaxis, this.fileChild.zaxis];
    }
    set rotation(value) {
        this.fileChild.xaxis = value[0];
        this.fileChild.zaxis = value[1];
        this.updateValues();
    }

    checkController() {
        if (!this.fileChild.controller) {
            throw new Error(
                "Attempt to use controller operation on a non-interactive part"
            );
        }
    }

    connectTo(other: Child) {
        this.checkController();
        const id = other.getId();

        const casted = this.fileChild.controller as GenericControllerData;
        casted.controllers = casted.controllers ?? [];
        casted.controllers.push({ id: id });
    }
    disconnectFrom(other: Child) {
        this.checkController();

        const casted = this.fileChild.controller as GenericControllerData;
        casted.controllers = casted.controllers ?? [];
        casted.controllers = casted.controllers.filter(
            (controller) => controller.id != other.getId()
        );
    }
    getId() {
        this.checkController();
        return this.fileChild.controller!.id;
    }
    getConnectedIds() {
        this.checkController();
        const casted = this.fileChild.controller as GenericControllerData;
        return casted.controllers?.map((controller) => controller.id) ?? [];
    }

    get shapeId() {
        return this.fileChild.shapeId;
    }
    set shapeId(value) {
        this.fileChild.shapeId = value;
    }
}

export class Part extends Child {
    constructor(public readonly filePart: FileChild) {
        super(filePart);
    }
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
    static convert(potential: Child) {
        return new Part(potential.fileChild);
    }
}

export class Blocks extends Child {
    constructor(
        public readonly fileBlocks: FileChild & {
            bounds: FileVector3;
        }
    ) {
        super(fileBlocks);
    }
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
    static convert(potential: Child) {
        // @ts-ignore
        // prettier-ignore
        return "bounds" in potential.fileChild ? new Blocks(potential.fileChild) : undefined;
    }

    get bounds() {
        return Vector3.fromFileVec3(this.fileBlocks.bounds);
    }
    set bounds(value) {
        this.fileBlocks.bounds = value.toFileVec3();
    }
}

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

    get position() {
        return this.desiredPosition;
    }
    set position(value) {
        this.desiredPosition = value;
        this.updateValues();
    }

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

    getId() {
        return this.fileJoint.id;
    }
}

export class PistonJoint extends Joint {
    constructor(
        public readonly fileJoint: FileJoint & {
            controller: PistonControllerData;
        }
    ) {
        super(fileJoint);
    }
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

    get length() {
        return this.fileJoint.controller.length;
    }
    set length(value) {
        this.fileJoint.controller.length = value;
    }

    get speed() {
        return this.fileJoint.controller.speed;
    }
    set speed(value) {
        this.fileJoint.controller.speed = value;
    }
}

export class BearingJoint extends Joint {
    constructor(
        public readonly fileJoint: FileJoint & {
            controller: undefined;
        }
    ) {
        super(fileJoint);
    }
    static create = Joint._internalCreate.bind(undefined, UUID("Bearing"));
    static convert(potential: Joint) {
        // @ts-ignore
        // prettier-ignore
        return !("controller" in potential.fileJoint) ? new BearingJoint(potential.fileJoint) : undefined;
    }
}

export class SuspensionJoint extends Joint {
    constructor(
        public readonly fileJoint: FileJoint & {
            controller: SuspensionControllerData;
        }
    ) {
        super(fileJoint);
    }
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

    get stiffnessLevel() {
        return this.fileJoint.controller.stiffnessLevel;
    }
    set stiffnessLevel(value) {
        this.fileJoint.controller.stiffnessLevel = value;
    }
}

export class ControllerPart extends Child {
    constructor(
        private fileController: FileChild & {
            controller: ControllerControllerData;
        }
    ) {
        super(fileController);
    }
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
    static convert(potential: Child) {
        // @ts-ignore
        // prettier-ignore
        return "controller" in potential.fileChild && potential.fileChild.controller.timePerFrame !== undefined ? new ControllerPart(potential.fileChild) : undefined;
    }

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
            for (let i = 0; i < 11; i++) {
                frames.push({ setting: sequence[i] ?? 0 });
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
    removeSequence(joint: PistonJoint | BearingJoint) {
        const controller = this.fileController.controller;

        if (controller.joints) {
            controller.joints = controller.joints.filter(
                (j) => j.id !== joint.getId()
            );
        }
        if (controller.controllers) {
            // @ts-ignore -- for some reason it's screaming at me so whatever
            controller.controllers = controller.controllers.filter(
                (j) => j.id !== joint.getId()
            );
        }
    }
    getSequence(joint: PistonJoint | BearingJoint):
        | {
              frames: number[];
              reversed: boolean;
          }
        | undefined {
        const controller = this.fileController
            .controller as ControllerControllerData;

        if (controller.joints) {
            const jointController = controller.joints.find(
                (j) => j.id === joint.getId()
            );
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
                (j) => j.id === joint.getId()
            );
            if (jointController) {
                return {
                    frames: jointController.frames.map((f) => f.setting),
                    reversed: false,
                };
            }
        }
    }
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

    get looped() {
        return this.fileController.controller.playMode === 2;
    }
    set looped(value) {
        this.fileController.controller.playMode = value ? 2 : 0;
    }

    get timePerFrame() {
        return this.fileController.controller.timePerFrame;
    }
    set timePerFrame(value) {
        this.fileController.controller.timePerFrame = value;
    }
}

export class LogicGatePart extends Child {
    constructor(
        private fileLogicGate: FileChild & {
            controller: LogicGateControllerData;
        }
    ) {
        super(fileLogicGate);
    }
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
    static convert(potential: Child) {
        // @ts-ignore
        // prettier-ignore
        return "controller" in potential.fileChild && potential.fileChild.controller.mode !== undefined ? new LogicGatePart(potential.fileChild) : undefined;
    }

    get mode(): LogicMode {
        return logicGateModeNames[this.fileLogicGate.controller.mode];
    }
    set mode(value: LogicMode) {
        this.fileLogicGate.controller.mode = logicGateModes[value];
    }
}

export class SensorPart extends Child {
    constructor(
        private fileSensor: FileChild & {
            controller: SensorControllerData;
        }
    ) {
        super(fileSensor);
    }
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
    static convert(potential: Child) {
        // @ts-ignore
        // prettier-ignore
        return "controller" in potential.fileChild && potential.fileChild.controller.range !== undefined ? new SensorPart(potential.fileChild) : undefined;
    }

    get audioEnabled() {
        return this.fileSensor.controller.audioEnabled;
    }
    set audioEnabled(value) {
        this.fileSensor.controller.audioEnabled = value;
    }

    get buttonMode() {
        return this.fileSensor.controller.buttonMode;
    }
    set buttonMode(value) {
        this.fileSensor.controller.buttonMode = value;
    }

    get filterColor() {
        return this.fileSensor.controller.color;
    }
    set filterColor(value) {
        this.fileSensor.controller.color = value;
    }

    get colorMode() {
        return this.fileSensor.controller.colorMode;
    }
    set colorMode(value) {
        this.fileSensor.controller.colorMode = value;
    }

    get range() {
        return this.fileSensor.controller.range;
    }
    set range(value) {
        this.fileSensor.controller.range = value;
    }
}

export class EnginePart extends Child {
    constructor(
        private fileEngine: FileChild & {
            controller: EngineControllerData;
        }
    ) {
        super(fileEngine);
    }
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
    static convert(potential: Child) {
        // @ts-ignore
        // prettier-ignore
        return "controller" in potential.fileChild && potential.fileChild.controller.data !== undefined && potential.shapeId !== UUID("Horn") ? new EnginePart(potential.fileChild) : undefined;
    }

    get level() {
        const index = engineLevels.findIndex(
            (l) => l === this.fileEngine.controller.data
        );
        return index === -1 ? 0 : index;
    }
    set level(value) {
        this.fileEngine.controller.data = engineLevels[value];
    }

    getConnectedJointIds() {
        return this.fileEngine.controller.joints?.map((j) => j.id) ?? [];
    }
}

export class ThrusterPart extends Child {
    constructor(
        private fileThruster: FileChild & {
            controller: ThrusterControllerData;
        }
    ) {
        super(fileThruster);
    }
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
    static convert(potential: Child) {
        // @ts-ignore
        // prettier-ignore
        return "controller" in potential.fileChild && potential.fileChild.controller.level !== undefined ? new ThrusterPart(potential.fileChild) : undefined;
    }

    get level() {
        return this.fileThruster.controller.level;
    }
    set level(value) {
        this.fileThruster.controller.level = value;
    }
}

export class HornPart extends Child {
    constructor(
        private fileHorn: FileChild & {
            controller: HornControllerData;
        }
    ) {
        super(fileHorn);
    }
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
    static convert(potential: Child) {
        // @ts-ignore
        // prettier-ignore
        return potential.shapeId === UUID("Horn") ? new HornPart(potential.fileChild) : undefined;
    }

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

export class DriverSeatPart extends Child {
    constructor(
        private fileDriverSeat: FileChild & {
            controller: DriverSeatControllerData;
        }
    ) {
        super(fileDriverSeat);
    }
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
    static convert(potential: Child) {
        // @ts-ignore
        // prettier-ignore
        return isDriverSeat(potential.shapeId) ? new DriverSeatPart(potential.fileChild) : undefined;
    }

    setBearing(
        bearing: BearingJoint,
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
            id: bearing.getId(),
            reverse: reverse ? 1 : 0,
        });
    }
    disconnectBearing(bearing: BearingJoint) {
        const controller = this.fileDriverSeat.controller;
        controller.joints =
            controller.joints?.filter((j) => j.id !== bearing.getId()) ?? [];
        controller.steering =
            controller.steering?.filter((j) => j.id !== bearing.getId()) ?? [];
    }
    getConnectedBearingIds() {
        return this.fileDriverSeat.controller.joints?.map((j) => j.id) ?? [];
    }
}

export class TimerPart extends Child {
    constructor(
        private fileTimer: FileChild & {
            controller: TimerControllerData;
        }
    ) {
        super(fileTimer);
    }
    static create(
        position: Vector3,
        rotation: Axis,
        color?: string,
        delay = 0
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
                seconds: Math.floor(delay),
                ticks: Math.floor((delay % 1) * 40),
            },
        });
    }
    static convert(potential: Child) {
        // @ts-ignore
        // prettier-ignore
        return potential.shapeId === UUID("Timer") ? new TimerPart(potential.fileChild) : undefined;
    }

    get delay() {
        return (
            this.fileTimer.controller.seconds +
            this.fileTimer.controller.ticks / 40
        );
    }
    set delay(value) {
        this.fileTimer.controller.seconds = Math.floor(value);
        this.fileTimer.controller.ticks = Math.floor((value % 1) * 40);
    }
}

export class LightPart extends Child {
    constructor(
        private fileLight: FileChild & {
            controller: LightControllerData;
        }
    ) {
        super(fileLight);
    }
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
    static convert(potential: Child) {
        // @ts-ignore
        // prettier-ignore
        return "controller" in potential.fileChild && "luminance" in potential.fileChild.controller ? new LightPart(potential.fileChild) : undefined;
    }

    get luminance() {
        return this.fileLight.controller.luminance;
    }
    set luminance(value) {
        this.fileLight.controller.luminance = value;
    }
}

export class TotebotPart extends Child {
    constructor(
        private fileTotebot: FileChild & {
            controller: TotebotControllerData;
        }
    ) {
        super(fileTotebot);
    }
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
    static convert(potential: Child) {
        // @ts-ignore
        // prettier-ignore
        return "controller" in potential.fileChild && "audioIndex" in potential.fileChild.controller ? new TotebotPart(potential.fileChild) : undefined;
    }

    get pitch() {
        return this.fileTotebot.controller.pitch;
    }
    set pitch(value) {
        this.fileTotebot.controller.pitch = value;
    }

    get volume() {
        return this.fileTotebot.controller.volume;
    }
    set volume(value) {
        this.fileTotebot.controller.volume = value;
    }

    get dance() {
        return this.fileTotebot.controller.audioIndex === 1;
    }
    set dance(value) {
        this.fileTotebot.controller.audioIndex = value ? 1 : 0;
    }

    get headType() {
        return this.fileTotebot.shapeId.split(": ")[1] as TotebotType;
    }
    set headType(value) {
        // @ts-ignore
        this.fileTotebot.shapeId = UUID("Totebot Head: " + value);
    }
}

export class Body {
    constructor(public readonly fileBody: FileBody) {}
    static create() {
        return new Body({
            childs: [],
        });
    }

    getChildren() {
        return this.fileBody.childs.map((child) => new Child(child));
    }
    addChild<T extends Child>(child: T): T {
        this.fileBody.childs.push(child.fileChild);
        return child;
    }
    removeChild(child: Child) {
        this.fileBody.childs = this.fileBody.childs.filter(
            (fileChild) => fileChild !== child.fileChild
        );
    }
}

export class Blueprint {
    private readonly fileBlueprint: FileBlueprint;

    constructor(fileBlueprint?: FileBlueprint) {
        this.fileBlueprint = fileBlueprint ?? {
            version: 4,
            bodies: [],
        };
    }
    static create() {
        return new Blueprint();
    }
    static fromJson(text: string): Blueprint {
        return new Blueprint(JSON.parse(text));
    }
    static fromFile(path: fs.PathOrFileDescriptor): Blueprint {
        return Blueprint.fromJson(fs.readFileSync(path).toString());
    }

    getBodies() {
        return this.fileBlueprint.bodies.map((body) => new Body(body));
    }
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
    writeToFile(path: fs.PathOrFileDescriptor) {
        fs.writeFileSync(path, this.toJSON());
    }
    addJoint<T extends Joint>(joint: T): T {
        this.fileBlueprint.joints = this.fileBlueprint.joints ?? [];
        this.fileBlueprint.joints.push(joint.fileJoint);
        return joint;
    }
    removeJoint(joint: Joint) {
        if (!this.fileBlueprint.joints) return;
        this.fileBlueprint.joints = this.fileBlueprint.joints.filter(
            (fileJoint) => fileJoint !== joint.fileJoint
        );
    }
    addBody(body?: Body): Body {
        body = body ?? Body.create();
        this.fileBlueprint.bodies.push(body.fileBody);
        return body;
    }
    removeBody(body: Body) {
        this.fileBlueprint.bodies = this.fileBlueprint.bodies.filter(
            (fileBody) => fileBody !== body.fileBody
        );
    }
}
