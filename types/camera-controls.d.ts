import * as THREE from 'three';
import { EventDispatcher } from './event-dispatcher';

export { EventDispatcher, Event } from './event-dispatcher';

export default class CameraControls extends EventDispatcher {
  // static methods
  static install(libs: {THREE}): void;

  // constructor
  constructor(object: THREE.Object3D, domElement?: HTMLElement, options?: { ignoreDOMEventListeners?: boolean });

  // public members
  public object: THREE.Object3D;
  public enabled: boolean;
  public minDistance: number;
  public maxDistance: number;
  public minZoom: number;
  public maxZoom: number;
  public minPolarAngle: number;
  public maxPolarAngle: number;
  public minAzimuthAngle: number;
  public maxAzimuthAngle: number;
  public dampingFactor: number;
  public draggingDampingFactor: number;
  public phiSpeed: number;
  public thetaSpeed: number;
  public dollySpeed: number;
  public truckSpeed: number;
  public dollyToCursor: boolean;
  public verticalDragToForward: boolean;

  // public methods
  public rotate(rotX: number, rotY: number, enableTransition?: boolean): void;
  public rotateTo(rotX: number, rotY: number, enableTransition?: boolean): void;
  public dolly(distance: number, enableTransition?: boolean): void;
  public dollyTo(distance: number, enableTransition?: boolean): void;
  public pan(x: number, y: number, enableTransition?: boolean): void;
  public truck(x: number, y: number, enableTransition?: boolean): void;
  public forward(distance: number, enableTransition?: boolean): void;
  public moveTo(x: number, y: number, z: number, enableTransition?: boolean): void;
  public fitTo(objectOrBox3: THREE.Object3D | THREE.Box3, enableTransition?: boolean, options?: {
    paddingLeft?: number,
    paddingRight?: number,
    paddingBottom?: number,
    paddingTop?: number
  }): void;
  public setLookAt(
    positionX: number, positionY: number, positionZ: number,
    targetX: number, targetY: number, targetZ: number,
    enableTransition?: boolean
  ): void;
  public lerpLookAt(
    positionAX: number, positionAY: number, positionAZ: number,
    targetAX: number, targetAY: number, targetAZ: number,
    positionBX: number, positionBY: number, positionBZ: number,
    targetBX: number, targetBY: number, targetBZ: number,
    x: number, enableTransition?: boolean
  ): void;
  public setPosition(positionX: number, positionY: number, positionZ: number, enableTransition?: boolean): void;
  public setTarget(targetX: number, targetY: number, targetZ: number, enableTransition?: boolean): void;
  public getDistanceToFit(width: number, height: number, depth: number): number;
  public getTarget(out?: THREE.Vector3): THREE.Vector3;
  public getPosition(out?: THREE.Vector3): THREE.Vector3;
  public reset(enableTransition?: boolean): void;
  public saveState(): void;
  public update(delta: number): boolean;
  public toJSON(): string;
  public fromJSON(json: string, enableTransition?: boolean): void;
  public dispose(): void;

  // private members
  private _state: STATE;

  // private methods
  private _sanitizeSphericals(): void;
}

export enum STATE {
  NONE = -1,
  ROTATE = 0,
  DOLLY = 1,
  TRUCK = 2,
  TOUCH_ROTATE = 3,
  TOUCH_DOLLY_TRUCK = 4,
  TOUCH_TRUCK = 5
}
