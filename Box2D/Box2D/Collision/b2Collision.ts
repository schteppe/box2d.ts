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

import {
	b2MakeArray,
	b2_maxManifoldPoints,
	ENABLE_ASSERTS,
	b2Assert,
	b2_epsilon_sq,
	b2_maxFloat,
	b2_epsilon
} from '../../../Box2D/Box2D/Common/b2Settings';
import {
	b2Vec2,
	b2Transform,
	b2DotVV,
	b2MulXV,
	b2DistanceSquaredVV,
	b2AddVMulSV,
	b2SubVV,
	b2MulRV,
	b2SubVMulSV,
	b2MidVV,
	b2ExtVV,
	b2Min,
	b2Max,
	b2Abs
} from '../../../Box2D/Box2D/Common/b2Math';
import {b2Distance, b2DistanceInput, b2SimplexCache, b2DistanceOutput} from '../../../Box2D/Box2D/Collision/b2Distance';
import {b2Shape} from '../../../Box2D/Box2D/Collision/Shapes/b2Shape';

/// @file
/// Structures and functions used for computing contact points, distance
/// queries, and TOI queries.

export enum b2ContactFeatureType
{
	e_vertex	= 0,
	e_face		= 1
}

/// The features that intersect to form the contact point
/// This must be 4 bytes or less.
export class b2ContactFeature
{
	public _id: b2ContactID = null;
	public _indexA: number = 0;
	public _indexB: number = 0;
	public _typeA: number = 0;
	public _typeB: number = 0;

	constructor(id: b2ContactID)
	{
		this._id = id;
	}

	public get indexA(): number
	{
		return this._indexA;
	}

	public set indexA(value: number)
	{
		this._indexA = value;
		// update the b2ContactID
		this._id._key = (this._id._key & 0xffffff00) | (this._indexA & 0x000000ff);
	}

	public get indexB(): number
	{
		return this._indexB;
	}

	public set indexB(value: number)
	{
		this._indexB = value;
		// update the b2ContactID
		this._id._key = (this._id._key & 0xffff00ff) | ((this._indexB << 8) & 0x0000ff00);
	}

	public get typeA(): number
	{
		return this._typeA;
	}

	public set typeA(value: number)
	{
		this._typeA = value;
		// update the b2ContactID
		this._id._key = (this._id._key & 0xff00ffff) | ((this._typeA << 16) & 0x00ff0000);
	}

	public get typeB(): number
	{
		return this._typeB;
	}

	public set typeB(value: number)
	{
		this._typeB = value;
		// update the b2ContactID
		this._id._key = (this._id._key & 0x00ffffff) | ((this._typeB << 24) & 0xff000000);
	}
}

/// Contact ids to facilitate warm starting.
export class b2ContactID
{
	public cf: b2ContactFeature = null;
	public _key: number = 0;

	constructor()
	{
		this.cf = new b2ContactFeature(this);
	}

	public Copy(o: b2ContactID): b2ContactID
	{
		this.key = o.key;
		return this;
	}

	public Clone(): b2ContactID
	{
		return new b2ContactID().Copy(this);
	}

	public get key(): number
	{
		return this._key;
	}

	public set key(value: number)
	{
		this._key = value;
		// update the b2ContactFeature
		this.cf._indexA = this._key & 0x000000ff;
		this.cf._indexB = (this._key >> 8) & 0x000000ff;
		this.cf._typeA = (this._key >> 16) & 0x000000ff;
		this.cf._typeB = (this._key >> 24) & 0x000000ff;
	}
}

/// A manifold point is a contact point belonging to a contact
/// manifold. It holds details related to the geometry and dynamics
/// of the contact points.
/// The local point usage depends on the manifold type:
/// -e_circles: the local center of circleB
/// -e_faceA: the local center of cirlceB or the clip point of polygonB
/// -e_faceB: the clip point of polygonA
/// This structure is stored across time steps, so we keep it small.
/// Note: the impulses are used for internal caching and may not
/// provide reliable contact forces, especially for high speed collisions.
export class b2ManifoldPoint
{
	public localPoint: b2Vec2 = new b2Vec2();	///< usage depends on manifold type
	public normalImpulse: number = 0;			///< the non-penetration impulse
	public tangentImpulse: number = 0;			///< the friction impulse
	public id: b2ContactID = new b2ContactID();	///< uniquely identifies a contact point between two shapes

	public static MakeArray(length: number): b2ManifoldPoint[]
	{
		return b2MakeArray(length, function (i: number): b2ManifoldPoint { return new b2ManifoldPoint(); } );
	}

	public Reset(): void
	{
		this.localPoint.SetZero();
		this.normalImpulse = 0;
		this.tangentImpulse = 0;
		this.id.key = 0;
	}

	public Copy(o: b2ManifoldPoint): b2ManifoldPoint
	{
		this.localPoint.Copy(o.localPoint);
		this.normalImpulse = o.normalImpulse;
		this.tangentImpulse = o.tangentImpulse;
		this.id.Copy(o.id);
		return this;
	}
}

export enum b2ManifoldType
{
	e_unknown	= -1,
	e_circles	= 0,
	e_faceA		= 1,
	e_faceB		= 2
}

/// A manifold for two touching convex shapes.
/// Box2D supports multiple types of contact:
/// - clip point versus plane with radius
/// - point versus point with radius (circles)
/// The local point usage depends on the manifold type:
/// -e_circles: the local center of circleA
/// -e_faceA: the center of faceA
/// -e_faceB: the center of faceB
/// Similarly the local normal usage:
/// -e_circles: not used
/// -e_faceA: the normal on polygonA
/// -e_faceB: the normal on polygonB
/// We store contacts in this way so that position correction can
/// account for movement, which is critical for continuous physics.
/// All contact scenarios must be expressed in one of these types.
/// This structure is stored across time steps, so we keep it small.
export class b2Manifold
{
	public points: b2ManifoldPoint[] = b2ManifoldPoint.MakeArray(b2_maxManifoldPoints);
	public localNormal: b2Vec2 = new b2Vec2();
	public localPoint: b2Vec2 = new b2Vec2();
	public type: number = b2ManifoldType.e_unknown;
	public pointCount: number = 0;

	public Reset(): void
	{
		for (var i: number = 0, ict = b2_maxManifoldPoints; i < ict; ++i)
		{
			if (ENABLE_ASSERTS) { b2Assert(this.points[i] instanceof b2ManifoldPoint); }
			this.points[i].Reset();
		}
		this.localNormal.SetZero();
		this.localPoint.SetZero();
		this.type = b2ManifoldType.e_unknown;
		this.pointCount = 0;
	}

	public Copy(o: b2Manifold): b2Manifold
	{
		this.pointCount = o.pointCount;
		for (var i: number = 0, ict = b2_maxManifoldPoints; i < ict; ++i)
		{
			if (ENABLE_ASSERTS) { b2Assert(this.points[i] instanceof b2ManifoldPoint); }
			this.points[i].Copy(o.points[i]);
		}
		this.localNormal.Copy(o.localNormal);
		this.localPoint.Copy(o.localPoint);
		this.type = o.type;
		return this;
	}

	public Clone(): b2Manifold
	{
		return new b2Manifold().Copy(this);
	}
}

export class b2WorldManifold
{
	public normal: b2Vec2 = new b2Vec2();
	public points: b2Vec2[] = b2Vec2.MakeArray(b2_maxManifoldPoints);

	private static Initialize_s_pointA = new b2Vec2();
	private static Initialize_s_pointB = new b2Vec2();
	private static Initialize_s_cA = new b2Vec2();
	private static Initialize_s_cB = new b2Vec2();
	private static Initialize_s_planePoint = new b2Vec2();
	private static Initialize_s_clipPoint = new b2Vec2();
	public Initialize(manifold: b2Manifold, xfA: b2Transform, radiusA: number, xfB: b2Transform, radiusB: number): void
	{
		if (manifold.pointCount == 0)
		{
			return;
		}

		switch (manifold.type)
		{
		case b2ManifoldType.e_circles:
			{
				this.normal.SetXY(1, 0);
				var pointA: b2Vec2 = b2MulXV(xfA, manifold.localPoint, b2WorldManifold.Initialize_s_pointA);
				var pointB: b2Vec2 = b2MulXV(xfB, manifold.points[0].localPoint, b2WorldManifold.Initialize_s_pointB);
				if (b2DistanceSquaredVV(pointA, pointB) > b2_epsilon_sq)
				{
					b2SubVV(pointB, pointA, this.normal).SelfNormalize();
				}

				var cA: b2Vec2 = b2AddVMulSV(pointA, radiusA, this.normal, b2WorldManifold.Initialize_s_cA);
				var cB: b2Vec2 = b2SubVMulSV(pointB, radiusB, this.normal, b2WorldManifold.Initialize_s_cB);
				b2MidVV(cA, cB, this.points[0]);
			}
			break;

		case b2ManifoldType.e_faceA:
			{
				b2MulRV(xfA.q, manifold.localNormal, this.normal);
				var planePoint: b2Vec2 = b2MulXV(xfA, manifold.localPoint, b2WorldManifold.Initialize_s_planePoint);

				for (var i: number = 0, ict = manifold.pointCount; i < ict; ++i)
				{
					var clipPoint: b2Vec2 = b2MulXV(xfB, manifold.points[i].localPoint, b2WorldManifold.Initialize_s_clipPoint);
					var s = radiusA - b2DotVV(b2SubVV(clipPoint, planePoint, b2Vec2.s_t0), this.normal);
					var cA: b2Vec2 = b2AddVMulSV(clipPoint, s, this.normal, b2WorldManifold.Initialize_s_cA);
					var cB: b2Vec2 = b2SubVMulSV(clipPoint, radiusB, this.normal, b2WorldManifold.Initialize_s_cB);
					b2MidVV(cA, cB, this.points[i]);
				}
			}
			break;

		case b2ManifoldType.e_faceB:
			{
				b2MulRV(xfB.q, manifold.localNormal, this.normal);
				var planePoint: b2Vec2 = b2MulXV(xfB, manifold.localPoint, b2WorldManifold.Initialize_s_planePoint);

				for (var i: number = 0, ict = manifold.pointCount; i < ict; ++i)
				{
					var clipPoint: b2Vec2 = b2MulXV(xfA, manifold.points[i].localPoint, b2WorldManifold.Initialize_s_clipPoint);
					var s = radiusB - b2DotVV(b2SubVV(clipPoint, planePoint, b2Vec2.s_t0), this.normal);
					var cB: b2Vec2 = b2AddVMulSV(clipPoint, s, this.normal, b2WorldManifold.Initialize_s_cB);
					var cA: b2Vec2 = b2SubVMulSV(clipPoint, radiusA, this.normal, b2WorldManifold.Initialize_s_cA);
					b2MidVV(cA, cB, this.points[i]);
				}

				// Ensure normal points from A to B.
				this.normal.SelfNeg();
			}
			break;
		}
	}
}

/// This is used for determining the state of contact points.
export enum b2PointState
{
	b2_nullState	= 0, ///< point does not exist
	b2_addState		= 1, ///< point was added in the update
	b2_persistState	= 2, ///< point persisted across the update
	b2_removeState	= 3  ///< point was removed in the update
}

/// Compute the point states given two manifolds. The states pertain to the transition from manifold1
/// to manifold2. So state1 is either persist or remove while state2 is either add or persist.
export function b2GetPointStates(state1: b2PointState[], state2: b2PointState[], manifold1: b2Manifold, manifold2: b2Manifold): void
{
	// Detect persists and removes.
	for (var i: number = 0, ict = manifold1.pointCount; i < ict; ++i)
	{
		var id = manifold1.points[i].id;
		var key = id.key;

		state1[i] = b2PointState.b2_removeState;

		for (var j: number = 0, jct = manifold2.pointCount; j < jct; ++j)
		{
			if (manifold2.points[j].id.key == key)
			{
				state1[i] = b2PointState.b2_persistState;
				break;
			}
		}
	}
	for (var ict = b2_maxManifoldPoints; i < ict; ++i)
	{
		state1[i] = b2PointState.b2_nullState;
	}

	// Detect persists and adds.
	for (var i: number = 0, ict = manifold2.pointCount; i < ict; ++i)
	{
		var id = manifold2.points[i].id;
		var key = id.key;

		state2[i] = b2PointState.b2_addState;

		for (var j: number = 0, jct = manifold1.pointCount; j < jct; ++j)
		{
			if (manifold1.points[j].id.key == key)
			{
				state2[i] = b2PointState.b2_persistState;
				break;
			}
		}
	}
	for (var ict = b2_maxManifoldPoints; i < ict; ++i)
	{
		state2[i] = b2PointState.b2_nullState;
	}
}

/// Used for computing contact manifolds.
export class b2ClipVertex
{
	public v: b2Vec2 = new b2Vec2();
	public id: b2ContactID = new b2ContactID();

	public static MakeArray(length: number): b2ClipVertex[]
	{
		return b2MakeArray(length, function (i: number): b2ClipVertex { return new b2ClipVertex(); });
	}

	public Copy(other: b2ClipVertex): b2ClipVertex
	{
		this.v.Copy(other.v);
		this.id.Copy(other.id);
		return this;
	}
}

/// Ray-cast input data. The ray extends from p1 to p1 + maxFraction * (p2 - p1).
export class b2RayCastInput
{
	public p1: b2Vec2 = new b2Vec2();
	public p2: b2Vec2 = new b2Vec2();
	public maxFraction: number = 1;

	public Copy(o: b2RayCastInput): b2RayCastInput
	{
		this.p1.Copy(o.p1);
		this.p2.Copy(o.p2);
		this.maxFraction = o.maxFraction;
		return this;
	}
}

/// Ray-cast output data. The ray hits at p1 + fraction * (p2 - p1), where p1 and p2
/// come from b2RayCastInput.
export class b2RayCastOutput
{
	public normal: b2Vec2 = new b2Vec2();
	public fraction: number = 0;

	public Copy(o: b2RayCastOutput): b2RayCastOutput
	{
		this.normal.Copy(o.normal);
		this.fraction = o.fraction;
		return this;
	}
}

/// An axis aligned bounding box.
export class b2AABB
{
	public lowerBound: b2Vec2 = new b2Vec2(); ///< the lower vertex
	public upperBound: b2Vec2 = new b2Vec2(); ///< the upper vertex

	private m_cache_center: b2Vec2 = new b2Vec2(); // access using GetCenter()
	private m_cache_extent: b2Vec2 = new b2Vec2(); // access using GetExtents()

	public Copy(o: b2AABB): b2AABB
	{
		this.lowerBound.Copy(o.lowerBound);
		this.upperBound.Copy(o.upperBound);
		return this;
	}

	/// Verify that the bounds are sorted.
	public IsValid(): boolean
	{
		var d_x = this.upperBound.x - this.lowerBound.x;
		var d_y = this.upperBound.y - this.lowerBound.y;
		var valid = d_x >= 0 && d_y >= 0;
		valid = valid && this.lowerBound.IsValid() && this.upperBound.IsValid();
		return valid;
	}

	/// Get the center of the AABB.
	public GetCenter(): b2Vec2
	{
		return b2MidVV(this.lowerBound, this.upperBound, this.m_cache_center);
	}

	/// Get the extents of the AABB (half-widths).
	public GetExtents(): b2Vec2
	{
		return b2ExtVV(this.lowerBound, this.upperBound, this.m_cache_extent);
	}

	/// Get the perimeter length
	public GetPerimeter(): number
	{
		var wx = this.upperBound.x - this.lowerBound.x;
		var wy = this.upperBound.y - this.lowerBound.y;
		return 2 * (wx + wy);
	}

	/// Combine an AABB into this one.
	public Combine1(aabb: b2AABB): b2AABB
	{
		this.lowerBound.x = b2Min(this.lowerBound.x, aabb.lowerBound.x);
		this.lowerBound.y = b2Min(this.lowerBound.y, aabb.lowerBound.y);
		this.upperBound.x = b2Max(this.upperBound.x, aabb.upperBound.x);
		this.upperBound.y = b2Max(this.upperBound.y, aabb.upperBound.y);
		return this;
	}

	/// Combine two AABBs into this one.
	public Combine2(aabb1: b2AABB, aabb2: b2AABB): b2AABB
	{
		this.lowerBound.x = b2Min(aabb1.lowerBound.x, aabb2.lowerBound.x);
		this.lowerBound.y = b2Min(aabb1.lowerBound.y, aabb2.lowerBound.y);
		this.upperBound.x = b2Max(aabb1.upperBound.x, aabb2.upperBound.x);
		this.upperBound.y = b2Max(aabb1.upperBound.y, aabb2.upperBound.y);
		return this;
	}

	public static Combine(aabb1: b2AABB, aabb2: b2AABB, out: b2AABB): b2AABB
	{
		out.Combine2(aabb1, aabb2);
		return out;
	}

	/// Does this aabb contain the provided AABB.
	public Contains(aabb: b2AABB): boolean
	{
		var result = true;
		result = result && this.lowerBound.x <= aabb.lowerBound.x;
		result = result && this.lowerBound.y <= aabb.lowerBound.y;
		result = result && aabb.upperBound.x <= this.upperBound.x;
		result = result && aabb.upperBound.y <= this.upperBound.y;
		return result;
	}

	// From Real-time Collision Detection, p179.
	public RayCast(output: b2RayCastOutput, input: b2RayCastInput): boolean
	{
		var tmin = (-b2_maxFloat);
		var tmax = b2_maxFloat;

		var p_x = input.p1.x;
		var p_y = input.p1.y;
		var d_x = input.p2.x - input.p1.x;
		var d_y = input.p2.y - input.p1.y;
		var absD_x = b2Abs(d_x);
		var absD_y = b2Abs(d_y);

		var normal = output.normal;

		if (absD_x < b2_epsilon)
		{
			// Parallel.
			if (p_x < this.lowerBound.x || this.upperBound.x < p_x)
			{
				return false;
			}
		}
		else
		{
			var inv_d: number = 1 / d_x;
			var t1 = (this.lowerBound.x - p_x) * inv_d;
			var t2 = (this.upperBound.x - p_x) * inv_d;

			// Sign of the normal vector.
			var s = (-1);

			if (t1 > t2)
			{
				var t3 = t1;
				t1 = t2;
				t2 = t3;
				s = 1;
			}

			// Push the min up
			if (t1 > tmin)
			{
				normal.x = s;
				normal.y = 0;
				tmin = t1;
			}

			// Pull the max down
			tmax = b2Min(tmax, t2);

			if (tmin > tmax)
			{
				return false;
			}
		}

		if (absD_y < b2_epsilon)
		{
			// Parallel.
			if (p_y < this.lowerBound.y || this.upperBound.y < p_y)
			{
				return false;
			}
		}
		else
		{
			var inv_d: number = 1 / d_y;
			var t1 = (this.lowerBound.y - p_y) * inv_d;
			var t2 = (this.upperBound.y - p_y) * inv_d;

			// Sign of the normal vector.
			var s = (-1);

			if (t1 > t2)
			{
				var t3 = t1;
				t1 = t2;
				t2 = t3;
				s = 1;
			}

			// Push the min up
			if (t1 > tmin)
			{
				normal.x = 0;
				normal.y = s;
				tmin = t1;
			}

			// Pull the max down
			tmax = b2Min(tmax, t2);

			if (tmin > tmax)
			{
				return false;
			}
		}

		// Does the ray start inside the box?
		// Does the ray intersect beyond the max fraction?
		if (tmin < 0 || input.maxFraction < tmin)
		{
			return false;
		}

		// Intersection.
		output.fraction = tmin;

		return true;
	}

	public TestOverlap(other: b2AABB): boolean
	{
		var d1_x = other.lowerBound.x - this.upperBound.x;
		var d1_y = other.lowerBound.y - this.upperBound.y;
		var d2_x = this.lowerBound.x - other.upperBound.x;
		var d2_y = this.lowerBound.y - other.upperBound.y;

		if (d1_x > 0 || d1_y > 0)
			return false;

		if (d2_x > 0 || d2_y > 0)
			return false;

		return true;
	}
}

export function b2TestOverlapAABB(a: b2AABB, b: b2AABB): boolean
{
	var d1_x = b.lowerBound.x - a.upperBound.x;
	var d1_y = b.lowerBound.y - a.upperBound.y;
	var d2_x = a.lowerBound.x - b.upperBound.x;
	var d2_y = a.lowerBound.y - b.upperBound.y;

	if (d1_x > 0 || d1_y > 0)
		return false;

	if (d2_x > 0 || d2_y > 0)
		return false;

	return true;
}

/// Clipping for contact manifolds.
export function b2ClipSegmentToLine(vOut: b2ClipVertex[], vIn: b2ClipVertex[], normal: b2Vec2, offset: number, vertexIndexA: number): number
{
	// Start with no output points
	var numOut: number = 0;

	var vIn0 = vIn[0];
	var vIn1 = vIn[1];

	// Calculate the distance of end points to the line
	var distance0: number = b2DotVV(normal, vIn0.v) - offset;
	var distance1: number = b2DotVV(normal, vIn1.v) - offset;

	// If the points are behind the plane
	if (distance0 <= 0) vOut[numOut++].Copy(vIn0);
	if (distance1 <= 0) vOut[numOut++].Copy(vIn1);

	// If the points are on different sides of the plane
	if (distance0 * distance1 < 0)
	{
		// Find intersection point of edge and plane
		var interp = distance0 / (distance0 - distance1);
		var v = vOut[numOut].v;
		v.x = vIn0.v.x + interp * (vIn1.v.x - vIn0.v.x);
		v.y = vIn0.v.y + interp * (vIn1.v.y - vIn0.v.y);

		// VertexA is hitting edgeB.
		var id = vOut[numOut].id;
		id.cf.indexA = vertexIndexA;
		id.cf.indexB = vIn0.id.cf.indexB;
		id.cf.typeA = b2ContactFeatureType.e_vertex;
		id.cf.typeB = b2ContactFeatureType.e_face;
		++numOut;
	}

	return numOut;
}

/// Determine if two generic shapes overlap.
var b2TestOverlapShape_s_input: b2DistanceInput = new b2DistanceInput();
var b2TestOverlapShape_s_simplexCache: b2SimplexCache = new b2SimplexCache();
var b2TestOverlapShape_s_output: b2DistanceOutput = new b2DistanceOutput();
export function b2TestOverlapShape(shapeA: b2Shape, indexA: number, shapeB: b2Shape, indexB: number, xfA: b2Transform, xfB: b2Transform): boolean
{
	var input = b2TestOverlapShape_s_input.Reset();
	input.proxyA.SetShape(shapeA, indexA);
	input.proxyB.SetShape(shapeB, indexB);
	input.transformA.Copy(xfA);
	input.transformB.Copy(xfB);
	input.useRadii = true;

	var simplexCache = b2TestOverlapShape_s_simplexCache.Reset();
	simplexCache.count = 0;

	var output = b2TestOverlapShape_s_output.Reset();

	b2Distance(output, simplexCache, input);

	return output.distance < 10 * b2_epsilon;
}
