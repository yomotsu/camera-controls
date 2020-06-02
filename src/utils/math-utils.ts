const EPSILON = 1e-5;

export function approxZero( number: number ): boolean {

	return Math.abs( number ) < EPSILON;

}

export function roundToStep( value: number, step: number ): number {

	return Math.round( value / step ) * step;

}

export function infinityToMaxNumber( value: number ): number {

	if ( isFinite( value ) ) return value;

	if ( value < 0 ) return - Number.MAX_VALUE;

	return Number.MAX_VALUE;

}

export function maxNumberToInfinity( value: number ): number {

	if ( Math.abs( value ) < Number.MAX_VALUE ) return value;

	return value * Infinity;

}

const fade = ( t: number ): number => {

	return t * t * t * ( t * ( 6 * t - 15 ) + 10 );

};


export function makePNoise1D( length: number = 0, step: number = 0 ): number[] {

	const noise = [];
	const gradients = [];

	for ( let i = 0; i < length; i ++ ) {

		gradients[ i ] = Math.random() * 2 - 1;

	};


	for ( let t = 0; t < step; t ++ ) {

		const x = ( length - 1 ) / ( step - 1 ) * t;

		const i0 = x;
		const i1 = i0 + 1;

		const g0 = gradients[ i0 ];
		const g1 = gradients[ i1 ] || gradients[ i0 ];

		const u0 = x - i0;
		const u1 = u0 - 1;

		const n0 = g0 * u0;
		const n1 = g1 * u1;

		noise.push( n0 * ( 1 - fade( u0 ) ) + n1 * fade( u0 ) );

	}

	return noise;

}
