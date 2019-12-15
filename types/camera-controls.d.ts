import * as THREE from 'three';
import { EventDispatcher } from './event-dispatcher';

export { EventDispatcher, Event } from './event-dispatcher';

export enum ACTION {
	NONE        = 0,
	ROTATE      = 1,
	TRUCK       = 2,
	DOLLY       = 3,
	ZOOM        = 4,
	DOLLY_TRUCK = 5,
	ZOOM_TRUCK  = 6,
}

export default class CameraControls extends EventDispatcher {
	// static methods
	static install( libs: { THREE: any } ): void;
	static ACTION: ACTION;

	// constructor
	constructor(
		camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
		domElement?: HTMLElement,
		options?: { ignoreDOMEventListeners?: boolean }
	);

	// public members
	public enabled: boolean;
	public minDistance: number;
	public maxDistance: number;
	public minZoom: number;
	public maxZoom: number;
	public minPolarAngle: number;
	public maxPolarAngle: number;
	public minAzimuthAngle: number;
	public maxAzimuthAngle: number;
	public boundaryFriction: number;
	public boundaryEnclosesCamera: boolean;
	public dampingFactor: number;
	public draggingDampingFactor: number;
	public phiSpeed: number; // deprecated. will be removed.
	public azimuthRotateSpeed: number;
	public thetaSpeed: number; // deprecated. will be removed.
	public polarRotateSpeed: number;
	public dollySpeed: number;
	public truckSpeed: number;
	public dollyToCursor: boolean;
	public verticalDragToForward: boolean;

	// public methods
	public rotate( azimuthAngle: number, polarAngle: number, enableTransition?: boolean ): void;
	public rotateTo( azimuthAngle: number, polarAngle: number, enableTransition?: boolean ): void;
	public dolly( distance: number, enableTransition?: boolean ): void;
	public dollyTo( distance: number, enableTransition?: boolean ): void;
	public zoom( zoomStep: number, enableTransition?: boolean ): void;
	public zoomTo( zoom: number, enableTransition?: boolean ): void;
	public pan( x: number, y: number, enableTransition?: boolean ): void;
	public truck( x: number, y: number, enableTransition?: boolean ): void;
	public forward( distance: number, enableTransition?: boolean ): void;
	public moveTo( x: number, y: number, z: number, enableTransition?: boolean ): void;
	public fitTo( objectOrBox3: THREE.Object3D | THREE.Box3, enableTransition?: boolean, options?: {
		paddingLeft?: number,
		paddingRight?: number,
		paddingBottom?: number,
		paddingTop?: number
	} ): void;
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
	public setPosition( positionX: number, positionY: number, positionZ: number, enableTransition?: boolean ): void;
	public setTarget( targetX: number, targetY: number, targetZ: number, enableTransition?: boolean ): void;
	public setBoundary( box3: THREE.Box3 ): void;
	public setViewport( viewport: THREE.Vector4 | null ): void;
	public setViewport( x: number, y: number, width: number, height: number ): void;
	public getDistanceToFit( width: number, height: number, depth: number ): number;
	public getTarget( out?: THREE.Vector3 ): THREE.Vector3;
	public getPosition( out?: THREE.Vector3 ): THREE.Vector3;
	public normalizeRotations(): void;
	public reset( enableTransition?: boolean ): void;
	public saveState(): void;
	public update( delta: number ): boolean;
	public toJSON(): string;
	public fromJSON( json: string, enableTransition?: boolean ): void;
	public dispose(): void;

	// private members
	protected _camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
	protected _state: ACTION;
	protected _domElement: HTMLElement;
	protected _target: THREE.Vector3;
	protected _targetEnd: THREE.Vector3;
	protected _spherical: THREE.Spherical;
	protected _sphericalEnd: THREE.Spherical;
	protected _zoom: number;
	protected _zoomEnd: number;
	protected _target0: THREE.Vector3;
	protected _position0: THREE.Vector3;
	protected _zoom0: number;
	protected _dollyControlAmount: number;
	protected _dollyControlCoord: THREE.Vector2;
	protected _boundary: THREE.Box3;
	protected _viewport: THREE.Vector4;
	protected _hasUpdated: boolean;

	// private methods
	protected _removeAllEventListeners: () => void;
	protected _sanitizeSphericals(): void;

	/**
	 * Get its client rect and package into given `THREE.Vector4` .
	 */
	protected _getClientRect( target: THREE.Vector4 ): THREE.Vector4;
}
