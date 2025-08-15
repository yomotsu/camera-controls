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

function createControls() {

	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
	domElement = document.createElement( 'div' );

	return new CameraControls( camera, domElement );

}

beforeEach( () => {

	controls = createControls();

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

test( 'toJSON/fromJSON', () => {

	//
	// from
	//

	const controls1 = createControls();

	// make a move
	controls1.setLookAt( 5, 3, 7, 2, 1, 0, false );
	controls1.setFocalOffset( 0.1, 0.2, 0.3, false );

	const position1 = controls1.getPosition( new THREE.Vector3() );
	const target1 = controls1.getTarget( new THREE.Vector3() );
	const spherical1 = controls1.getSpherical( new THREE.Spherical() );
	const focalOffset1 = controls1.getFocalOffset( new THREE.Vector3() );

	const jsonStr1 = controls1.toJSON();


	//
	// to
	//

	const controls2 = createControls();

	controls2.fromJSON( jsonStr1, false );

	const position2 = controls2.getPosition( new THREE.Vector3() );
	const target2 = controls2.getTarget( new THREE.Vector3() );
	const spherical2 = controls2.getSpherical( new THREE.Spherical() );
	const focalOffset2 = controls2.getFocalOffset( new THREE.Vector3() );

	expect( position2.x ).toBeCloseTo( position1.x );
	expect( position2.y ).toBeCloseTo( position1.y );
	expect( position2.z ).toBeCloseTo( position1.z );

	expect( target2.x ).toBeCloseTo( target1.x );
	expect( target2.y ).toBeCloseTo( target1.y );
	expect( target2.z ).toBeCloseTo( target1.z );

	expect( spherical2.radius ).toBeCloseTo( spherical1.radius );
	expect( spherical2.phi ).toBeCloseTo( spherical1.phi );
	expect( spherical2.theta ).toBeCloseTo( spherical1.theta );

	expect( focalOffset2.x ).toBeCloseTo( focalOffset1.x );
	expect( focalOffset2.y ).toBeCloseTo( focalOffset1.y );
	expect( focalOffset2.z ).toBeCloseTo( focalOffset1.z );

} );


