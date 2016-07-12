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

import {ENABLE_ASSERTS, b2Assert, b2MakeNumberArray, b2_epsilon, b2_epsilon_sq, b2_maxFloat} from '../../Box2D/Common/b2Settings';
import {b2Vec2, b2DotVV, b2Transform, b2MidVV, b2SubVV, b2DistanceVV, b2Max, b2MulXV, b2MulTRV, b2NegV, b2CrossVV, b2CrossOneV, b2CrossVOne} from '../../Box2D/Common/b2Math';
import {b2Shape} from '../../Box2D/Collision/Shapes/b2Shape';

/// A distance proxy is used by the GJK algorithm.
/// It encapsulates any shape.
export class b2DistanceProxy
{
	public m_buffer: b2Vec2[] = b2Vec2.MakeArray(2);
	public m_vertices: b2Vec2[] = null;
	public m_count: number = 0;
	public m_radius: number = 0;

	public Reset(): b2DistanceProxy
	{
		this.m_vertices = null;
		this.m_count = 0;
		this.m_radius = 0;
		return this;
	}

	public SetShape(shape: b2Shape, index: number): void
	{
		shape.SetupDistanceProxy(this, index);
//		switch (shape.GetType())
//		{
//		case b2ShapeType.e_circleShape:
//			{
//				var circle: b2CircleShape = <b2CircleShape> shape;
//				this.m_vertices = new Array(1, true);
//				this.m_vertices[0] = circle.m_p;
//				this.m_count = 1;
//				this.m_radius = circle.m_radius;
//			}
//			break;
//
//		case b2ShapeType.e_polygonShape:
//			{
//				var polygon: b2PolygonShape = <b2PolygonShape> shape;
//				this.m_vertices = polygon.m_vertices;
//				this.m_count = polygon.m_count;
//				this.m_radius = polygon.m_radius;
//			}
//			break;
//
//		case b2ShapeType.e_edgeShape:
//			{
//				var edge: b2EdgeShape = <b2EdgeShape> shape;
//				this.m_vertices = new Array(2);
//				this.m_vertices[0] = edge.m_vertex1;
//				this.m_vertices[1] = edge.m_vertex2;
//				this.m_count = 2;
//				this.m_radius = edge.m_radius;
//			}
//			break;
//
//		case b2ShapeType.e_chainShape:
//			{
//				var chain: b2ChainShape = <b2ChainShape> shape;
//				if (ENABLE_ASSERTS) { b2Assert(0 <= index && index < chain.m_count); }
//
//				this.m_buffer[0].Copy(chain.m_vertices[index]);
//				if (index + 1 < chain.m_count)
//				{
//					this.m_buffer[1].Copy(chain.m_vertices[index + 1]);
//				}
//				else
//				{
//					this.m_buffer[1].Copy(chain.m_vertices[0]);
//				}
//
//				this.m_vertices = this.m_buffer;
//				this.m_count = 2;
//				this.m_radius = chain.m_radius;
//			}
//			break;
//
//		default:
//			if (ENABLE_ASSERTS) { b2Assert(false); }
//			break;
//		}
	}

	public GetSupport(d: b2Vec2): number
	{
		var bestIndex: number = 0;
		var bestValue: number = b2DotVV(this.m_vertices[0], d);
		for (var i: number = 1; i < this.m_count; ++i)
		{
			var value: number = b2DotVV(this.m_vertices[i], d);
			if (value > bestValue)
			{
				bestIndex = i;
				bestValue = value;
			}
		}

		return bestIndex;
	}

	public GetSupportVertex(d: b2Vec2): b2Vec2
	{
		var bestIndex: number = 0;
		var bestValue: number = b2DotVV(this.m_vertices[0], d);
		for (var i: number = 1; i < this.m_count; ++i)
		{
			var value: number = b2DotVV(this.m_vertices[i], d);
			if (value > bestValue)
			{
				bestIndex = i;
				bestValue = value;
			}
		}

		return this.m_vertices[bestIndex];
	}

	public GetVertexCount(): number
	{
		return this.m_count;
	}

	public GetVertex(index: number): b2Vec2
	{
		if (ENABLE_ASSERTS) { b2Assert(0 <= index && index < this.m_count); }
		return this.m_vertices[index];
	}
}

export class b2SimplexCache
{
	public metric: number = 0;
	public count: number = 0;
	public indexA: number[] = b2MakeNumberArray(3);
	public indexB: number[] = b2MakeNumberArray(3);

	public Reset(): b2SimplexCache
	{
		this.metric = 0;
		this.count = 0;
		return this;
	}
}

export class b2DistanceInput
{
	public proxyA: b2DistanceProxy = new b2DistanceProxy();
	public proxyB: b2DistanceProxy = new b2DistanceProxy();
	public transformA: b2Transform = new b2Transform();
	public transformB: b2Transform = new b2Transform();
	public useRadii: boolean = false;

	public Reset(): b2DistanceInput
	{
		this.proxyA.Reset();
		this.proxyB.Reset();
		this.transformA.SetIdentity();
		this.transformB.SetIdentity();
		this.useRadii = false;
		return this;
	}
}

export class b2DistanceOutput
{
	public pointA: b2Vec2 = new b2Vec2();
	public pointB: b2Vec2 = new b2Vec2();
	public distance: number = 0;
	public iterations: number = 0; ///< number of GJK iterations used

	public Reset(): b2DistanceOutput
	{
		this.pointA.SetZero();
		this.pointB.SetZero();
		this.distance = 0;
		this.iterations = 0;
		return this;
	}
}


export var b2_gjkCalls: number = 0;
export var b2_gjkIters: number = 0;
export var b2_gjkMaxIters: number = 0;

export class b2SimplexVertex
{
	public wA: b2Vec2 = new b2Vec2(); // support point in proxyA
	public wB: b2Vec2 = new b2Vec2(); // support point in proxyB
	public w: b2Vec2 = new b2Vec2(); // wB - wA
	public a: number = 0; // barycentric coordinate for closest point
	public indexA: number = 0; // wA index
	public indexB: number = 0; // wB index

	public Copy(other: b2SimplexVertex): b2SimplexVertex
	{
		this.wA.Copy(other.wA);		// support point in proxyA
		this.wB.Copy(other.wB);     // support point in proxyB
		this.w.Copy(other.w);       // wB - wA
		this.a = other.a;           // barycentric coordinate for closest point
		this.indexA = other.indexA; // wA index
		this.indexB = other.indexB; // wB index
		return this;
	}
}

export class b2Simplex
{
	public m_v1: b2SimplexVertex = new b2SimplexVertex();
	public m_v2: b2SimplexVertex = new b2SimplexVertex();
	public m_v3: b2SimplexVertex = new b2SimplexVertex();
	public m_vertices: b2SimplexVertex[] = new Array(3);
	public m_count: number = 0;

	constructor()
	{
		this.m_vertices[0] = this.m_v1;
		this.m_vertices[1] = this.m_v2;
		this.m_vertices[2] = this.m_v3;
	}

	public ReadCache(cache: b2SimplexCache, proxyA: b2DistanceProxy, transformA: b2Transform, proxyB: b2DistanceProxy, transformB: b2Transform): void
	{
		if (ENABLE_ASSERTS) { b2Assert(0 <= cache.count && cache.count <= 3); }

		// Copy data from cache.
		this.m_count = cache.count;
		var vertices: b2SimplexVertex[] = this.m_vertices;
		for (var i: number = 0; i < this.m_count; ++i)
		{
			var v: b2SimplexVertex = vertices[i];
			v.indexA = cache.indexA[i];
			v.indexB = cache.indexB[i];
			var wALocal: b2Vec2 = proxyA.GetVertex(v.indexA);
			var wBLocal: b2Vec2 = proxyB.GetVertex(v.indexB);
			b2MulXV(transformA, wALocal, v.wA);
			b2MulXV(transformB, wBLocal, v.wB);
			b2SubVV(v.wB, v.wA, v.w);
			v.a = 0;
		}

		// Compute the new simplex metric, if it is substantially different than
		// old metric then flush the simplex.
		if (this.m_count > 1)
		{
			var metric1: number = cache.metric;
			var metric2: number = this.GetMetric();
			if (metric2 < 0.5 * metric1 || 2 * metric1 < metric2 || metric2 < b2_epsilon)
			{
				// Reset the simplex.
				this.m_count = 0;
			}
		}

		// If the cache is empty or invalid ...
		if (this.m_count == 0)
		{
			var v: b2SimplexVertex = vertices[0];
			v.indexA = 0;
			v.indexB = 0;
			var wALocal: b2Vec2 = proxyA.GetVertex(0);
			var wBLocal: b2Vec2 = proxyB.GetVertex(0);
			b2MulXV(transformA, wALocal, v.wA);
			b2MulXV(transformB, wBLocal, v.wB);
			b2SubVV(v.wB, v.wA, v.w);
			v.a = 1;
			this.m_count = 1;
		}
	}

	public WriteCache(cache: b2SimplexCache): void
	{
		cache.metric = this.GetMetric();
		cache.count = this.m_count;
		var vertices: b2SimplexVertex[] = this.m_vertices;
		for (var i: number = 0; i < this.m_count; ++i)
		{
			cache.indexA[i] = vertices[i].indexA;
			cache.indexB[i] = vertices[i].indexB;
		}
	}

	public GetSearchDirection(out: b2Vec2): b2Vec2
	{
		switch (this.m_count)
		{
		case 1:
			return b2NegV(this.m_v1.w, out);

		case 2:
			{
				var e12: b2Vec2 = b2SubVV(this.m_v2.w, this.m_v1.w, out);
				var sgn: number = b2CrossVV(e12, b2NegV(this.m_v1.w, b2Vec2.s_t0));
				if (sgn > 0)
				{
					// Origin is left of e12.
					return b2CrossOneV(e12, out);
				}
				else
				{
					// Origin is right of e12.
					return b2CrossVOne(e12, out);
				}
			}

		default:
			if (ENABLE_ASSERTS) { b2Assert(false); }
			return out.SetZero();
		}
	}

	public GetClosestPoint(out: b2Vec2): b2Vec2
	{
		switch (this.m_count)
		{
		case 0:
			if (ENABLE_ASSERTS) { b2Assert(false); }
			return out.SetZero();

		case 1:
			return out.Copy(this.m_v1.w);

		case 2:
			return out.SetXY(
				this.m_v1.a * this.m_v1.w.x + this.m_v2.a * this.m_v2.w.x,
				this.m_v1.a * this.m_v1.w.y + this.m_v2.a * this.m_v2.w.y);

		case 3:
			return out.SetZero();

		default:
			if (ENABLE_ASSERTS) { b2Assert(false); }
			return out.SetZero();
		}
	}

	public GetWitnessPoints(pA: b2Vec2, pB: b2Vec2): void
	{
		switch (this.m_count)
		{
		case 0:
			if (ENABLE_ASSERTS) { b2Assert(false); }
			break;

		case 1:
			pA.Copy(this.m_v1.wA);
			pB.Copy(this.m_v1.wB);
			break;

		case 2:
			pA.x = this.m_v1.a * this.m_v1.wA.x + this.m_v2.a * this.m_v2.wA.x;
			pA.y = this.m_v1.a * this.m_v1.wA.y + this.m_v2.a * this.m_v2.wA.y;
			pB.x = this.m_v1.a * this.m_v1.wB.x + this.m_v2.a * this.m_v2.wB.x;
			pB.y = this.m_v1.a * this.m_v1.wB.y + this.m_v2.a * this.m_v2.wB.y;
			break;

		case 3:
			pB.x = pA.x = this.m_v1.a * this.m_v1.wA.x + this.m_v2.a * this.m_v2.wA.x + this.m_v3.a * this.m_v3.wA.x;
			pB.y = pA.y = this.m_v1.a * this.m_v1.wA.y + this.m_v2.a * this.m_v2.wA.y + this.m_v3.a * this.m_v3.wA.y;
			break;

		default:
			if (ENABLE_ASSERTS) { b2Assert(false); }
			break;
		}
	}

	public GetMetric(): number
	{
		switch (this.m_count)
		{
		case 0:
			if (ENABLE_ASSERTS) { b2Assert(false); }
			return 0;

		case 1:
			return 0;

		case 2:
			return b2DistanceVV(this.m_v1.w, this.m_v2.w);

		case 3:
			return b2CrossVV(b2SubVV(this.m_v2.w, this.m_v1.w, b2Vec2.s_t0), b2SubVV(this.m_v3.w, this.m_v1.w, b2Vec2.s_t1));

		default:
			if (ENABLE_ASSERTS) { b2Assert(false); }
			return 0;
		}
	}

	public Solve2(): void
	{
		var w1: b2Vec2 = this.m_v1.w;
		var w2: b2Vec2 = this.m_v2.w;
		var e12: b2Vec2 = b2SubVV(w2, w1, b2Simplex.s_e12);

		// w1 region
		var d12_2: number = (-b2DotVV(w1, e12));
		if (d12_2 <= 0)
		{
			// a2 <= 0, so we clamp it to 0
			this.m_v1.a = 1;
			this.m_count = 1;
			return;
		}

		// w2 region
		var d12_1: number = b2DotVV(w2, e12);
		if (d12_1 <= 0)
		{
			// a1 <= 0, so we clamp it to 0
			this.m_v2.a = 1;
			this.m_count = 1;
			this.m_v1.Copy(this.m_v2);
			return;
		}

		// Must be in e12 region.
		var inv_d12: number = 1 / (d12_1 + d12_2);
		this.m_v1.a = d12_1 * inv_d12;
		this.m_v2.a = d12_2 * inv_d12;
		this.m_count = 2;
	}

	public Solve3(): void
	{
		var w1: b2Vec2 = this.m_v1.w;
		var w2: b2Vec2 = this.m_v2.w;
		var w3: b2Vec2 = this.m_v3.w;

		// Edge12
		// [1      1     ][a1] = [1]
		// [w1.e12 w2.e12][a2] = [0]
		// a3 = 0
		var e12: b2Vec2 = b2SubVV(w2, w1, b2Simplex.s_e12);
		var w1e12: number = b2DotVV(w1, e12);
		var w2e12: number = b2DotVV(w2, e12);
		var d12_1: number = w2e12;
		var d12_2: number = (-w1e12);

		// Edge13
		// [1      1     ][a1] = [1]
		// [w1.e13 w3.e13][a3] = [0]
		// a2 = 0
		var e13: b2Vec2 = b2SubVV(w3, w1, b2Simplex.s_e13);
		var w1e13: number = b2DotVV(w1, e13);
		var w3e13: number = b2DotVV(w3, e13);
		var d13_1: number = w3e13;
		var d13_2: number = (-w1e13);

		// Edge23
		// [1      1     ][a2] = [1]
		// [w2.e23 w3.e23][a3] = [0]
		// a1 = 0
		var e23: b2Vec2 = b2SubVV(w3, w2, b2Simplex.s_e23);
		var w2e23: number = b2DotVV(w2, e23);
		var w3e23: number = b2DotVV(w3, e23);
		var d23_1: number = w3e23;
		var d23_2: number = (-w2e23);

		// Triangle123
		var n123: number = b2CrossVV(e12, e13);

		var d123_1: number = n123 * b2CrossVV(w2, w3);
		var d123_2: number = n123 * b2CrossVV(w3, w1);
		var d123_3: number = n123 * b2CrossVV(w1, w2);

		// w1 region
		if (d12_2 <= 0 && d13_2 <= 0)
		{
			this.m_v1.a = 1;
			this.m_count = 1;
			return;
		}

		// e12
		if (d12_1 > 0 && d12_2 > 0 && d123_3 <= 0)
		{
			var inv_d12: number = 1 / (d12_1 + d12_2);
			this.m_v1.a = d12_1 * inv_d12;
			this.m_v2.a = d12_2 * inv_d12;
			this.m_count = 2;
			return;
		}

		// e13
		if (d13_1 > 0 && d13_2 > 0 && d123_2 <= 0)
		{
			var inv_d13: number = 1 / (d13_1 + d13_2);
			this.m_v1.a = d13_1 * inv_d13;
			this.m_v3.a = d13_2 * inv_d13;
			this.m_count = 2;
			this.m_v2.Copy(this.m_v3);
			return;
		}

		// w2 region
		if (d12_1 <= 0 && d23_2 <= 0)
		{
			this.m_v2.a = 1;
			this.m_count = 1;
			this.m_v1.Copy(this.m_v2);
			return;
		}

		// w3 region
		if (d13_1 <= 0 && d23_1 <= 0)
		{
			this.m_v3.a = 1;
			this.m_count = 1;
			this.m_v1.Copy(this.m_v3);
			return;
		}

		// e23
		if (d23_1 > 0 && d23_2 > 0 && d123_1 <= 0)
		{
			var inv_d23: number = 1 / (d23_1 + d23_2);
			this.m_v2.a = d23_1 * inv_d23;
			this.m_v3.a = d23_2 * inv_d23;
			this.m_count = 2;
			this.m_v1.Copy(this.m_v3);
			return;
		}

		// Must be in triangle123
		var inv_d123: number = 1 / (d123_1 + d123_2 + d123_3);
		this.m_v1.a = d123_1 * inv_d123;
		this.m_v2.a = d123_2 * inv_d123;
		this.m_v3.a = d123_3 * inv_d123;
		this.m_count = 3;
	}
	private static s_e12: b2Vec2 = new b2Vec2();
	private static s_e13: b2Vec2 = new b2Vec2();
	private static s_e23: b2Vec2 = new b2Vec2();
}

var b2Distance_s_simplex: b2Simplex = new b2Simplex();
var b2Distance_s_saveA = b2MakeNumberArray(3);
var b2Distance_s_saveB = b2MakeNumberArray(3);
var b2Distance_s_p: b2Vec2 = new b2Vec2();
var b2Distance_s_d: b2Vec2 = new b2Vec2();
var b2Distance_s_normal: b2Vec2 = new b2Vec2();
var b2Distance_s_supportA: b2Vec2 = new b2Vec2();
var b2Distance_s_supportB: b2Vec2 = new b2Vec2();
export function b2Distance(output: b2DistanceOutput, cache: b2SimplexCache, input: b2DistanceInput): void
{
	++b2_gjkCalls;

	var proxyA = input.proxyA;
	var proxyB = input.proxyB;

	var transformA = input.transformA;
	var transformB = input.transformB;

	// Initialize the simplex.
	var simplex: b2Simplex = b2Distance_s_simplex;
	simplex.ReadCache(cache, proxyA, transformA, proxyB, transformB);

	// Get simplex vertices as an array.
	var vertices: b2SimplexVertex[] = simplex.m_vertices;
	var k_maxIters: number = 20;

	// These store the vertices of the last simplex so that we
	// can check for duplicates and prevent cycling.
	var saveA: number[] = b2Distance_s_saveA;
	var saveB: number[] = b2Distance_s_saveB;
	var saveCount: number = 0;

	var distanceSqr1: number = b2_maxFloat;
	var distanceSqr2: number = distanceSqr1;

	// Main iteration loop.
	var iter: number = 0;
	while (iter < k_maxIters)
	{
		// Copy simplex so we can identify duplicates.
		saveCount = simplex.m_count;
		for (var i: number = 0; i < saveCount; ++i)
		{
			saveA[i] = vertices[i].indexA;
			saveB[i] = vertices[i].indexB;
		}

		switch (simplex.m_count)
		{
		case 1:
			break;

		case 2:
			simplex.Solve2();
			break;

		case 3:
			simplex.Solve3();
			break;

		default:
			if (ENABLE_ASSERTS) { b2Assert(false); }
			break;
		}

		// If we have 3 points, then the origin is in the corresponding triangle.
		if (simplex.m_count == 3)
		{
			break;
		}

		// Compute closest point.
		var p: b2Vec2 = simplex.GetClosestPoint(b2Distance_s_p);
		distanceSqr2 = p.GetLengthSquared();

		// Ensure progress
		/*
		TODO: to fix compile warning
		if (distanceSqr2 > distanceSqr1)
		{
			//break;
		}
		*/
		distanceSqr1 = distanceSqr2;

		// Get search direction.
		var d: b2Vec2 = simplex.GetSearchDirection(b2Distance_s_d);

		// Ensure the search direction is numerically fit.
		if (d.GetLengthSquared() < b2_epsilon_sq)
		{
			// The origin is probably contained by a line segment
			// or triangle. Thus the shapes are overlapped.

			// We can't return zero here even though there may be overlap.
			// In case the simplex is a point, segment, or triangle it is difficult
			// to determine if the origin is contained in the CSO or very close to it.
			break;
		}

		// Compute a tentative new simplex vertex using support points.
		var vertex: b2SimplexVertex = vertices[simplex.m_count];
		vertex.indexA = proxyA.GetSupport(b2MulTRV(transformA.q, b2NegV(d, b2Vec2.s_t0), b2Distance_s_supportA));
		b2MulXV(transformA, proxyA.GetVertex(vertex.indexA), vertex.wA);
		vertex.indexB = proxyB.GetSupport(b2MulTRV(transformB.q, d, b2Distance_s_supportB));
		b2MulXV(transformB, proxyB.GetVertex(vertex.indexB), vertex.wB);
		b2SubVV(vertex.wB, vertex.wA, vertex.w);

		// Iteration count is equated to the number of support point calls.
		++iter;
		++b2_gjkIters;

		// Check for duplicate support points. This is the main termination criteria.
		var duplicate: boolean = false;
		for (var i: number = 0; i < saveCount; ++i)
		{
			if (vertex.indexA == saveA[i] && vertex.indexB == saveB[i])
			{
				duplicate = true;
				break;
			}
		}

		// If we found a duplicate support point we must exit to avoid cycling.
		if (duplicate)
		{
			break;
		}

		// New vertex is ok and needed.
		++simplex.m_count;
	}

	b2_gjkMaxIters = b2Max(b2_gjkMaxIters, iter);

	// Prepare output.
	simplex.GetWitnessPoints(output.pointA, output.pointB);
	output.distance = b2DistanceVV(output.pointA, output.pointB);
	output.iterations = iter;

	// Cache the simplex.
	simplex.WriteCache(cache);

	// Apply radii if requested.
	if (input.useRadii)
	{
		var rA: number = proxyA.m_radius;
		var rB: number = proxyB.m_radius;

		if (output.distance > (rA + rB) && output.distance > b2_epsilon)
		{
			// Shapes are still no overlapped.
			// Move the witness points to the outer surface.
			output.distance -= rA + rB;
			var normal: b2Vec2 = b2SubVV(output.pointB, output.pointA, b2Distance_s_normal);
			normal.Normalize();
			output.pointA.SelfMulAdd(rA, normal);
			output.pointB.SelfMulSub(rB, normal);
		}
		else
		{
			// Shapes are overlapped when radii are considered.
			// Move the witness points to the middle.
			var p: b2Vec2 = b2MidVV(output.pointA, output.pointB, b2Distance_s_p);
			output.pointA.Copy(p);
			output.pointB.Copy(p);
			output.distance = 0;
		}
	}
}
