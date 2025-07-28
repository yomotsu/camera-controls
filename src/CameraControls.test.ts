import { beforeEach, expect, test } from 'vitest';
import { CameraControls } from './CameraControls';

import * as THREE from 'three';

const subsetOfTHREE = {
	Vector2: THREE.Vector2,
	Vector3: THREE.Vector3,
	Vector4: THREE.Vector4,
	Quaternion: THREE.Quaternion,
	Matrix4: THREE.Matrix4,
	Spherical: THREE.Spherical,
	Box3: THREE.Box3,
	Sphere: THREE.Sphere,
	Raycaster: THREE.Raycaster,
};
CameraControls.install( { THREE: subsetOfTHREE } );

let controls: CameraControls;
let camera: THREE.PerspectiveCamera;
let domElement: HTMLDivElement;

beforeEach( () => {

	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
	domElement = document.createElement( 'div' );
	controls = new CameraControls( camera, domElement );

} );

test( 'CameraControls can be constructed', () => {

	expect( controls ).toBeInstanceOf( CameraControls );

} );

test( 'setLookat', () => {

	controls.setLookAt( 0, 0, 1, 0, 0, 0, false );

	const position = controls.getPosition( new THREE.Vector3() );
	expect( position.x ).toBeCloseTo( 0 );
	expect( position.y ).toBeCloseTo( 0 );
	expect( position.z ).toBeCloseTo( 1 );

	const target = controls.getTarget( new THREE.Vector3() );
	expect( target.x ).toBeCloseTo( 0 );
	expect( target.y ).toBeCloseTo( 0 );
	expect( target.z ).toBeCloseTo( 0 );



} );
