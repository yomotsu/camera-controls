import { SIDE, Direction } from './types';

export const PI_2 = Math.PI * 2;
export const PI_HALF = Math.PI / 2;
export const FPS_60 = 1 / 0.016;
export const SIDES: { [side in SIDE]: Direction } = {
	[ SIDE.FRONT ]: { polarAngle:   PI_HALF, azimuthAngle:         0 },
	[ SIDE.BACK  ]: { polarAngle:   PI_HALF, azimuthAngle:   Math.PI },
	[ SIDE.UP    ]: { polarAngle: - PI_HALF, azimuthAngle:         0 },
	[ SIDE.DOWN  ]: { polarAngle: 	Math.PI, azimuthAngle:         0 },
	[ SIDE.RIGHT ]: { polarAngle:   PI_HALF, azimuthAngle:   PI_HALF },
	[ SIDE.LEFT  ]: { polarAngle:   PI_HALF, azimuthAngle: - PI_HALF }
};
