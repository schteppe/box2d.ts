/*
* Copyright (c) 2006-2009 Erin Catto http://www.box2d.org
*
* This software is provided 'as-is', without any express or implied
* warranty.  In no event will the authors be held liable for any damages
* arising from the use of this software.
* Permission is granted to anyone to use this software for any purpose,
* including commercial applications, and to alter it and redistribute it
* freely, subject to the following restrictions:
* 1. The origin of this software must not be misrepresented; you must not
* claim that you wrote the original software. If you use this software
* in a product, an acknowledgment in the product documentation would be
* appreciated but is not required.
* 2. Altered source versions must be plainly marked as such, and must not be
* misrepresented as being the original software.
* 3. This notice may not be removed or altered from any source distribution.
*/

export var DEBUG: boolean = true;

export var ENABLE_ASSERTS: boolean = DEBUG;

export function b2Assert(condition: boolean, ...args: any[]): void
{
	if (!condition)
	{
		debugger;
	}
}

export var b2_maxFloat: number = 1E+37; // FLT_MAX instead of Number.MAX_VALUE;
export var b2_epsilon: number = 1E-5; // FLT_EPSILON instead of Number.MIN_VALUE;
export var b2_epsilon_sq: number = (b2_epsilon * b2_epsilon);
export var b2_pi: number = 3.14159265359; //Math.PI;

/// @file
/// Global tuning constants based on meters-kilograms-seconds (MKS) units.
///

// Collision

/// The maximum number of contact points between two convex shapes. Do
/// not change this value.
export var b2_maxManifoldPoints: number = 2;

/// The maximum number of vertices on a convex polygon. You cannot increase
/// this too much because b2BlockAllocator has a maximum object size.
export var b2_maxPolygonVertices: number = 8;

/// This is used to fatten AABBs in the dynamic tree. This allows proxies
/// to move by a small amount without triggering a tree adjustment.
/// This is in meters.
export var b2_aabbExtension: number = 0.1;

/// This is used to fatten AABBs in the dynamic tree. This is used to predict
/// the future position based on the current displacement.
/// This is a dimensionless multiplier.
export var b2_aabbMultiplier: number = 2;

/// A small length used as a collision and constraint tolerance. Usually it is
/// chosen to be numerically significant, but visually insignificant.
export var b2_linearSlop: number = 0.008; //0.005;

/// A small angle used as a collision and constraint tolerance. Usually it is
/// chosen to be numerically significant, but visually insignificant.
export var b2_angularSlop: number = 2 / 180 * b2_pi;

/// The radius of the polygon/edge shape skin. This should not be modified. Making
/// this smaller means polygons will have an insufficient buffer for continuous collision.
/// Making it larger may create artifacts for vertex collision.
export var b2_polygonRadius: number = 2 * b2_linearSlop;

/// Maximum number of sub-steps per contact in continuous physics simulation.
export var b2_maxSubSteps: number = 8;


// Dynamics

/// Maximum number of contacts to be handled to solve a TOI impact.
export var b2_maxTOIContacts: number = 32;

/// A velocity threshold for elastic collisions. Any collision with a relative linear
/// velocity below this threshold will be treated as inelastic.
export var b2_velocityThreshold: number = 1;

/// The maximum linear position correction used when solving constraints. This helps to
/// prevent overshoot.
export var b2_maxLinearCorrection: number = 0.2;

/// The maximum angular position correction used when solving constraints. This helps to
/// prevent overshoot.
export var b2_maxAngularCorrection: number = 8 / 180 * b2_pi;

/// The maximum linear velocity of a body. This limit is very large and is used
/// to prevent numerical problems. You shouldn't need to adjust this.
export var b2_maxTranslation: number = 2;
export var b2_maxTranslationSquared: number = b2_maxTranslation * b2_maxTranslation;

/// The maximum angular velocity of a body. This limit is very large and is used
/// to prevent numerical problems. You shouldn't need to adjust this.
export var b2_maxRotation: number = 0.5 * b2_pi;
export var b2_maxRotationSquared: number = b2_maxRotation * b2_maxRotation;

/// This scale factor controls how fast overlap is resolved. Ideally this would be 1 so
/// that overlap is removed in one time step. However using values close to 1 often lead
/// to overshoot.
export var b2_baumgarte: number = 0.2;
export var b2_toiBaumgarte: number = 0.75;


// Sleep

/// The time that a body must be still before it will go to sleep.
export var b2_timeToSleep: number = 0.5;

/// A body cannot sleep if its linear velocity is above this tolerance.
export var b2_linearSleepTolerance: number = 0.01;

/// A body cannot sleep if its angular velocity is above this tolerance.
export var b2_angularSleepTolerance: number = 2 / 180 * b2_pi;

// Memory Allocation

/// Implement this function to use your own memory allocator.
export function b2Alloc(size: number): any
{
	return null;
}

/// If you implement b2Alloc, you should also implement this function.
export function b2Free(mem: any): void
{
}

/// Logging function.
export function b2Log(message: string, ...args: any[]): void
{
	//var args = Array.prototype.slice.call(arguments);
	//var str = goog.string.format.apply(null, args.slice(0));
	//console.log(message);
}

/// Version numbering scheme.
/// See http://en.wikipedia.org/wiki/Software_versioning
export class b2Version
{
	public major: number = 0;		///< significant changes
	public minor: number = 0;       ///< incremental changes
	public revision: number = 0;    ///< bug fixes

	constructor(major: number = 0, minor: number = 0, revision: number = 0)
	{
		this.major = major;
		this.minor = minor;
		this.revision = revision;
	}

	public toString(): string
	{
		return this.major + "." + this.minor + "." + this.revision;
	}
}

/// Current version.
export var b2_version: b2Version = new b2Version(2, 3, 0);

export var b2_changelist: number = 251;

export function b2ParseInt(v: string): number
{
	return parseInt(v, 10);
}

export function b2ParseUInt(v: string): number
{
	return Math.abs(parseInt(v, 10));
}

export function b2MakeArray(length: number, init: { (i: number): any; }): any[]
{
	var a: any[] = [];
	for (var i: number = 0; i < length; ++i)
	{
		a.push(init(i));
	}
	return a;
}

export function b2MakeNumberArray(length: number): number[]
{
	return b2MakeArray(length, function (i: number): number { return 0; });
}
