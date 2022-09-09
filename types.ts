export type Face = "Front" | "Back" | "Left" | "Right" | "Top" | "Bottom";

export type LogicMode = "AND" | "OR" | "XOR" | "NAND" | "NOR" | "XNOR";

export type Axis = [xaxis: number, zaxis: number];

export interface FileShape {
    /** Color of the shape. */
    color: string;
    /** UUID for the type of part or block the shape is. */
    shapeId: string;
}

export interface FileVector3 {
    /** X coordinate. */
    x: number;
    /** Y coordinate. */
    y: number;
    /** Z coordinate. */
    z: number;
}

export interface BaseControllerData {
    /** Identifier for this controller object. */
    id: number;
}

export interface GenericControllerData extends BaseControllerData {
    /** Array of pointers to connected parts' controller objects. */
    controllers?: {
        /** Identifier for the controller object of the target of the connection. */
        id: number;
    }[];
}

/** Slightly confusing naming quirk: There's controller objects, which are a feature of the blueprint format, and then there's an actual Scrap Mechanic part named 'Controller'. */
export interface ControllerControllerData extends BaseControllerData {
    /** Array of data for piston length sequences. Only present if at least one piston is connected to the Controller. */
    controllers?: {
        /** Array of data for each frame in the sequence. */
        frames: {
            /** The desired length of the piston at that frame. */
            setting: number;
        }[];
        /** Identifier for the *controller object* of the piston joint that this sequence controls. */
        id: number;
        /** The index of the sequence. Controls where in the list this sequence appears on the Controller UI. */
        index: number;
    }[];
    /** Array of data for rotation sequences of bearings. Only present if at least one bearing is connected to the Controller. */
    joints?: {
        /** The angle of the bearing at the end of the sequence. */
        endAngle: number;
        /** Identifier for the bearing joint that this sequence controls. */
        id: number;
        /** Array of data for each frame in the sequence. */
        frames: {
            /** The desired angle of the bearing at that frame. */
            targetAngle: number;
        }[];
        /** The index of the sequence. Controls where in the list this sequence appears on the Controller UI. */
        index: number;
        /** Whether positive angles will spin the bearing counter-clockwise (looking from the front). */
        reverse: boolean;
        /** The angle that the bearing should default to when the controller isn't on. */
        startAngle: number;
    }[];
    /** The play mode of the controller. 0 = default, 2 = loop. playMode=1 was originally the forward-reverse loop setting, but for unknown reasons, it was removed before launch. */
    playMode: 0 | 2;
    /** The time between each frame in the sequence. In-game this can only be set in a range from 5 seconds to 1 second, but in blueprint files the only limit is how fast the strength of the bearing can keep up. */
    timePerFrame: number;
}

export interface LogicGateControllerData extends GenericControllerData {
    /** The mode of the logic gate. The possible modes are:
     * 0 = AND
     * 1 = OR
     * 2 = XOR
     * 3 = NAND
     * 4 = NOR
     * 5 = XNOR
     */
    mode: number;
}

export interface SensorControllerData extends BaseControllerData {
    /** Whether the sensor will make a sound when triggering. */
    audioEnabled: boolean;
    /** Whether the sensor will only be active while sensing, instead of toggling when being triggered. */
    buttonMode: boolean;
    /** The hex code of the color that the sensor will exclusively detect when colorMode is true. */
    color: string;
    /** Whether the sensor will only be active when detecting a specific color. */
    colorMode: boolean;
    /** The range of the sensor. */
    range: number;
}

export interface EngineControllerData extends BaseControllerData {
    /** Base64-encoded serialized Lua data for the engine. Always present on unmodified blueprints, but isn't required. */
    data?: string;
    /** List of data for bearings that this engine is connected to. Only present if at least one bearing is connected to the engine. */
    joints?: {
        /** Identifier for the bearing joint that this engine controls. */
        id: number;
        /** Whether the bearing spins counter-clockwise looking from the front. 0 = false, 1 = true. */
        reverse: 0 | 1;
    }[];
}

export interface ThrusterControllerData extends BaseControllerData {
    /** The power level of the thruster. */
    level: number;
}

export interface HornControllerData extends BaseControllerData {
    /** Base64-encoded serialized Lua data for the horn. Always present on unmodified blueprints, but isn't required. */
    data?: string;
}

export interface SteeringSettings {
    /** Identifier for the bearing. */
    id: number;
    /** The angle that the bearing will turn left to. */
    leftAngleLimit: number;
    /** The speed at which the bearing will turn left. */
    leftAngleSpeed: number;
    /** The angle that the bearing will turn right to. */
    rightAngleLimit: number;
    /** The speed at which the bearing will turn right. */
    rightAngleSpeed: number;
    /** Whether the bearing is unlocked. If false, the bearing won't turn. */
    unlocked: boolean;
}

export interface DriverSeatControllerData extends GenericControllerData {
    /** Array of steering direction data for each bearing connected to the driver's seat. Only present if at least 1 bearing is connected. */
    joints?: {
        /** Identifier for the bearing. */
        id: number;
        /** Determines what direction the bearing turns when pressing A or D. 0 = normal, 1 = reversed. Usually, front-wheel-steering cars will have the bearings set to reversed.*/
        reverse: 0 | 1;
    }[];
    /** Steering settings. Not required when constructing a blueprint file. Only present if at least 1 bearing is connected, regardless of if the driver's seat is upgraded enough to utilize these settings. */
    steering?: SteeringSettings[];
}

export interface TimerControllerData extends BaseControllerData {
    /** The amount of seconds that the timer will delay signals. */
    seconds: number;
    /** The amount of ticks (1/40s) that the timer will delay signals (added to seconds). */
    ticks: number;
}

export interface LightControllerData extends BaseControllerData {
    /** The intensity of the light. In-game this can range from 10 to 100. */
    luminance: number;
}

export type TotebotType = "Bass" | "Percussion" | "Synth Voice" | "Blip";

export interface TotebotControllerData extends BaseControllerData {
    /** The audio type of the totebot. 0 = retro, 1 = dance. */
    audioIndex: 0 | 1;
    /** The pitch of the totebot. Values range from 0 to 1. In-game, the range is split into 25 notes. 0 is C-1, 1 is C+1 */
    pitch: number;
    /** The volume of the totebot. Values range from 0 to 100. */
    volume: number;
}

/** NOTE: Pistons aren't children of bodies */
export interface PistonControllerData extends BaseControllerData {
    /** The target length of the piston. If the piston is connected to a controller, this is ignored. */
    length: number;
    /** The speed of the piston. If the piston is connected to a controller, this is ignored. */
    speed: number;
}

/** NOTE: Suspensions aren't children of bodies */
export interface SuspensionControllerData extends BaseControllerData {
    /** The stiffness level of the suspension. */
    stiffnessLevel: number;
}

export interface FileChild extends FileShape {
    /** Size of the child. Extends towards positive XYZ. This property is only present if the child is a group of blocks instead of a part. */
    bounds?: FileVector3;
    /** Position of the child. If this child is group of blocks, this represents the lowest corner of the group.*/
    pos: FileVector3;
    /** The X-axis rotation of the child. */
    xaxis: number;
    /** The Z-axis rotation of the child. */
    zaxis: number;
    /** Controller data. Only present if the child is an interactive part. */
    controller?:
        | GenericControllerData
        | ControllerControllerData
        | LogicGateControllerData
        | SensorControllerData
        | EngineControllerData
        | ThrusterControllerData
        | HornControllerData
        | DriverSeatControllerData
        | TimerControllerData
        | LightControllerData
        | TotebotControllerData;
    /** Array of pointers to joints that this child is connected to. Only present if the child is connected to at least 1 joint. */
    joints?: {
        /** Identifier for the joint. */
        id: number;
    }[];

    /** @hidden */
    _childId?: number;
}

export interface FileBody {
    /** An array containing the body's children. */
    childs: FileChild[];
}

export interface FileJoint extends FileShape {
    /** Identifier for the joint. */
    id: number;
    /** Blueprint-wide index of the first body child that is connected to this joint. */
    childA: number;
    /** Blueprint-wide index of the second body child that is connected to this joint. If the joint is not connected to anything, this will be set to -1. */
    childB: number;
    /** Position of the start of the joint. For bearings, this is always the same as the end position. */
    posA: FileVector3;
    /** Position of the end of the joint. For connected bearings, this is always the same as the start position. If the joint is not connected to anything, this will be set to (0, 0, 0). */
    posB: FileVector3;
    /** Rotation x-axis of the first body child that is connected to this joint. */
    xaxisA: number;
    /** Rotation x-axis of the second body child that is connected to this joint. */
    xaxisB: number;
    /** Rotation z-axis of the first body child that is connected to this joint. */
    zaxisA: number;
    /** Rotation z-axis of the second body child that is connected to this joint. */
    zaxisB: number;
    /** Controller data. Only present if the joint is a piston or suspension. */
    controller?: PistonControllerData | SuspensionControllerData;
}

export interface FileBlueprint {
    /** The version of the blueprint format. This is always set to 4. */
    version: 4;
    /** A list of bodies contained in the blueprint. */
    bodies: FileBody[];
    /** An optional list of joints in the blueprint. */
    joints?: FileJoint[];
}
