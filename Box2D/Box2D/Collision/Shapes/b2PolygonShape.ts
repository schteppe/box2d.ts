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

import {b2Vec2, b2DistanceSquaredVV, b2Transform, b2MulXV, b2MinV, b2MaxV, b2SubVV, b2DotVV, b2Sq, b2Sqrt, b2AddVMulSV, b2Asin, b2Pow, b2MulTXV, b2MidVV, b2Min, b2CrossVV, b2MulRV, b2CrossVOne, b2MulSV, b2AddVV, b2MulTRV} from '../../Common/b2Math';
import {b2_polygonRadius, ENABLE_ASSERTS, b2Assert, b2_linearSlop, b2Log, b2_maxPolygonVertices, b2_epsilon, b2_pi, b2MakeNumberArray, b2_epsilon_sq} from '../../Common/b2Settings';
import {b2Shape, b2ShapeType, b2MassData} from '../../Collision/Shapes/b2Shape';
import {b2DistanceProxy} from '../../Collision/b2Distance';
import {b2RayCastOutput, b2RayCastInput, b2AABB} from '../../Collision/b2Collision';

/// A convex polygon. It is assumed that the interior of the polygon is to
/// the left of each edge.
/// Polygons have a maximum number of vertices equal to b2_maxPolygonVertices.
/// In most cases you should not need many vertices for a convex polygon.
export class b2PolygonShape extends b2Shape
{
	public m_centroid: b2Vec2 = new b2Vec2(0, 0);
	public m_vertices: b2Vec2[] = b2Vec2.MakeArray(b2_maxPolygonVertices);
	public m_normals: b2Vec2[] = b2Vec2.MakeArray(b2_maxPolygonVertices);
	public m_count: number = 0;

	constructor()
	{
		super(b2ShapeType.e_polygonShape, b2_polygonRadius);
	}

	/// Implement b2Shape.
	public Clone(): b2PolygonShape
	{
		return new b2PolygonShape().Copy(this);
	}

	public Copy(other: b2PolygonShape): b2PolygonShape
	{
		super.Copy(other);

		if (ENABLE_ASSERTS) { b2Assert(other instanceof b2PolygonShape); }

		this.m_centroid.Copy(other.m_centroid);
		this.m_count = other.m_count;
		for (var i: number = 0, ict = this.m_count; i < ict; ++i)
		{
			this.m_vertices[i].Copy(other.m_vertices[i]);
			this.m_normals[i].Copy(other.m_normals[i]);
		}
		return this;
	}

	/// @see b2Shape::GetChildCount
	public GetChildCount(): number
	{
		return 1;
	}

	/// Create a convex hull from the given array of points.
	/// The count must be in the range [3, b2_maxPolygonVertices].
	/// @warning the points may be re-ordered, even if they form a convex polygon
	/// @warning collinear points are handled but not removed. Collinear points
	/// may lead to poor stacking behavior.
	private static SetAsVector_s_ps = b2Vec2.MakeArray(b2_maxPolygonVertices);
	private static SetAsVector_s_hull = b2MakeNumberArray(b2_maxPolygonVertices);
	private static SetAsVector_s_r = new b2Vec2();
	private static SetAsVector_s_v = new b2Vec2();
	public SetAsVector(vertices, count: number): b2PolygonShape
	{
		if (count === undefined) count = vertices.length;

		if (ENABLE_ASSERTS) { b2Assert(3 <= count && count <= b2_maxPolygonVertices); }
		if (count < 3)
		{
			return this.SetAsBox(1, 1);
		}

		var n = b2Min(count, b2_maxPolygonVertices);

		// Copy vertices into local buffer
		var ps = b2PolygonShape.SetAsVector_s_ps;
		for (var i: number = 0; i < n; ++i)
		{
			ps[i].Copy(vertices[i]);
		}

		// Create the convex hull using the Gift wrapping algorithm
		// http://en.wikipedia.org/wiki/Gift_wrapping_algorithm

		// Find the right most point on the hull
		var i0: number = 0;
		var x0 = ps[0].x;
		for (var i: number = 1; i < count; ++i)
		{
			var x = ps[i].x;
			if (x > x0 || (x == x0 && ps[i].y < ps[i0].y))
			{
				i0 = i;
				x0 = x;
			}
		}

		var hull = b2PolygonShape.SetAsVector_s_hull;
		var m: number = 0;
		var ih = i0;

		for (;;)
		{
			hull[m] = ih;

			var ie: number = 0;
			for (var j: number = 1; j < n; ++j)
			{
				if (ie == ih)
				{
					ie = j;
					continue;
				}

				var r: b2Vec2 = b2SubVV(ps[ie], ps[hull[m]], b2PolygonShape.SetAsVector_s_r);
				var v: b2Vec2 = b2SubVV(ps[j], ps[hull[m]], b2PolygonShape.SetAsVector_s_v);
				var c: number = b2CrossVV(r, v);
				if (c < 0)
				{
					ie = j;
				}

				// Collinearity check
				if (c == 0 && v.GetLengthSquared() > r.GetLengthSquared())
				{
					ie = j;
				}
			}

			++m;
			ih = ie;

			if (ie == i0)
			{
				break;
			}
		}

		this.m_count = m;

		// Copy vertices.
		for (var i: number = 0; i < m; ++i)
		{
			this.m_vertices[i].Copy(ps[hull[i]]);
		}

		// Compute normals. Ensure the edges have non-zero length.
		for (var i: number = 0, ict = m; i < ict; ++i)
		{
			var vertexi1 = this.m_vertices[i];
			var vertexi2 = this.m_vertices[(i + 1) % ict];
			var edge: b2Vec2 = b2SubVV(vertexi2, vertexi1, b2Vec2.s_t0); // edge uses s_t0
			if (ENABLE_ASSERTS) { b2Assert(edge.GetLengthSquared() > b2_epsilon_sq); }
			b2CrossVOne(edge, this.m_normals[i]).SelfNormalize();
		}

		// Compute the polygon centroid.
		b2PolygonShape.ComputeCentroid(this.m_vertices, m, this.m_centroid);

		return this;
	}

	public SetAsArray(vertices, count: number): b2PolygonShape
	{
		return this.SetAsVector(vertices, count);
	}

	/// Build vertices to represent an axis-aligned box.
	/// @param hx the half-width.
	/// @param hy the half-height.
	public SetAsBox(hx: number, hy: number): b2PolygonShape
	{
		this.m_count = 4;
		this.m_vertices[0].SetXY((-hx), (-hy));
		this.m_vertices[1].SetXY(hx, (-hy));
		this.m_vertices[2].SetXY(hx, hy);
		this.m_vertices[3].SetXY((-hx), hy);
		this.m_normals[0].SetXY(0, (-1));
		this.m_normals[1].SetXY(1, 0);
		this.m_normals[2].SetXY(0, 1);
		this.m_normals[3].SetXY((-1), 0);
		this.m_centroid.SetZero();
		return this;
	}

	/// Build vertices to represent an oriented box.
	/// @param hx the half-width.
	/// @param hy the half-height.
	/// @param center the center of the box in local coordinates.
	/// @param angle the rotation of the box in local coordinates.
	public SetAsOrientedBox(hx: number, hy: number, center: b2Vec2, angle: number): b2PolygonShape
	{
		this.m_count = 4;
		this.m_vertices[0].SetXY((-hx), (-hy));
		this.m_vertices[1].SetXY(hx, (-hy));
		this.m_vertices[2].SetXY(hx, hy);
		this.m_vertices[3].SetXY((-hx), hy);
		this.m_normals[0].SetXY(0, (-1));
		this.m_normals[1].SetXY(1, 0);
		this.m_normals[2].SetXY(0, 1);
		this.m_normals[3].SetXY((-1), 0);
		this.m_centroid.Copy(center);

		var xf: b2Transform = new b2Transform();
		xf.SetPosition(center);
		xf.SetRotationAngleRadians(angle);

		// Transform vertices and normals.
		for (var i: number = 0, ict = this.m_count; i < ict; ++i)
		{
			b2MulXV(xf, this.m_vertices[i], this.m_vertices[i]);
			b2MulRV(xf.q, this.m_normals[i], this.m_normals[i]);
		}

		return this;
	}

	/// @see b2Shape::TestPoint
	private static TestPoint_s_pLocal = new b2Vec2();
	public TestPoint(xf: b2Transform, p: b2Vec2): boolean
	{
		var pLocal: b2Vec2 = b2MulTXV(xf, p, b2PolygonShape.TestPoint_s_pLocal);

		for (var i: number = 0, ict = this.m_count; i < ict; ++i)
		{
			var dot: number = b2DotVV(this.m_normals[i], b2SubVV(pLocal, this.m_vertices[i], b2Vec2.s_t0));
			if (dot > 0)
			{
				return false;
			}
		}

		return true;
	}

	/// Implement b2Shape.
	private static RayCast_s_p1 = new b2Vec2();
	private static RayCast_s_p2 = new b2Vec2();
	private static RayCast_s_d = new b2Vec2();
	public RayCast(output: b2RayCastOutput, input: b2RayCastInput, xf: b2Transform, childIndex: number): boolean
	{
		// Put the ray into the polygon's frame of reference.
		var p1: b2Vec2 = b2MulTXV(xf, input.p1, b2PolygonShape.RayCast_s_p1);
		var p2: b2Vec2 = b2MulTXV(xf, input.p2, b2PolygonShape.RayCast_s_p2);
		var d: b2Vec2 = b2SubVV(p2, p1, b2PolygonShape.RayCast_s_d);

		var lower: number = 0, upper = input.maxFraction;

		var index = -1;

		for (var i: number = 0, ict = this.m_count; i < ict; ++i)
		{
			// p = p1 + a * d
			// dot(normal, p - v) = 0
			// dot(normal, p1 - v) + a * dot(normal, d) = 0
			var numerator: number = b2DotVV(this.m_normals[i], b2SubVV(this.m_vertices[i], p1, b2Vec2.s_t0));
			var denominator: number = b2DotVV(this.m_normals[i], d);

			if (denominator == 0)
			{
				if (numerator < 0)
				{
					return false;
				}
			}
			else
			{
				// Note: we want this predicate without division:
				// lower < numerator / denominator, where denominator < 0
				// Since denominator < 0, we have to flip the inequality:
				// lower < numerator / denominator <==> denominator * lower > numerator.
				if (denominator < 0 && numerator < lower * denominator)
				{
					// Increase lower.
					// The segment enters this half-space.
					lower = numerator / denominator;
					index = i;
				}
				else if (denominator > 0 && numerator < upper * denominator)
				{
					// Decrease upper.
					// The segment exits this half-space.
					upper = numerator / denominator;
				}
			}

			// The use of epsilon here causes the assert on lower to trip
			// in some cases. Apparently the use of epsilon was to make edge
			// shapes work, but now those are handled separately.
			//if (upper < lower - b2_epsilon)
			if (upper < lower)
			{
				return false;
			}
		}

		if (ENABLE_ASSERTS) { b2Assert(0 <= lower && lower <= input.maxFraction); }

		if (index >= 0)
		{
			output.fraction = lower;
			b2MulRV(xf.q, this.m_normals[index], output.normal);
			return true;
		}

		return false;
	}

	/// @see b2Shape::ComputeAABB
	private static ComputeAABB_s_v = new b2Vec2();
	public ComputeAABB(aabb: b2AABB, xf: b2Transform, childIndex: number): void
	{
		var lower: b2Vec2 = b2MulXV(xf, this.m_vertices[0], aabb.lowerBound);
		var upper = aabb.upperBound.Copy(lower);

		for (var i: number = 0, ict = this.m_count; i < ict; ++i)
		{
			var v: b2Vec2 = b2MulXV(xf, this.m_vertices[i], b2PolygonShape.ComputeAABB_s_v);
			b2MinV(v, lower, lower);
			b2MaxV(v, upper, upper);
		}

		var r = this.m_radius;
		lower.SelfSubXY(r, r);
		upper.SelfAddXY(r, r);
	}

	/// @see b2Shape::ComputeMass
	private static ComputeMass_s_center = new b2Vec2();
	private static ComputeMass_s_s = new b2Vec2();
	private static ComputeMass_s_e1 = new b2Vec2();
	private static ComputeMass_s_e2 = new b2Vec2();
	public ComputeMass(massData: b2MassData, density: number): void
	{
		// Polygon mass, centroid, and inertia.
		// Let rho be the polygon density in mass per unit area.
		// Then:
		// mass = rho * int(dA)
		// centroid.x = (1/mass) * rho * int(x * dA)
		// centroid.y = (1/mass) * rho * int(y * dA)
		// I = rho * int((x*x + y*y) * dA)
		//
		// We can compute these integrals by summing all the integrals
		// for each triangle of the polygon. To evaluate the integral
		// for a single triangle, we make a change of variables to
		// the (u,v) coordinates of the triangle:
		// x = x0 + e1x * u + e2x * v
		// y = y0 + e1y * u + e2y * v
		// where 0 <= u && 0 <= v && u + v <= 1.
		//
		// We integrate u from [0,1-v] and then v from [0,1].
		// We also need to use the Jacobian of the transformation:
		// D = cross(e1, e2)
		//
		// Simplification: triangle centroid = (1/3) * (p1 + p2 + p3)
		//
		// The rest of the derivation is handled by computer algebra.

		if (ENABLE_ASSERTS) { b2Assert(this.m_count >= 3); }

		var center = b2PolygonShape.ComputeMass_s_center.SetZero();
		var area: number = 0;
		var I: number = 0;

		// s is the reference point for forming triangles.
		// It's location doesn't change the result (except for rounding error).
		var s = b2PolygonShape.ComputeMass_s_s.SetZero();

		// This code would put the reference point inside the polygon.
		for (var i: number = 0, ict = this.m_count; i < ict; ++i)
		{
			s.SelfAdd(this.m_vertices[i]);
		}
		s.SelfMul(1 / this.m_count);

		var k_inv3: number = 1 / 3;

		for (var i: number = 0, ict = this.m_count; i < ict; ++i)
		{
			// Triangle vertices.
			var e1: b2Vec2 = b2SubVV(this.m_vertices[i], s, b2PolygonShape.ComputeMass_s_e1);
			var e2: b2Vec2 = b2SubVV(this.m_vertices[(i + 1) % ict], s, b2PolygonShape.ComputeMass_s_e2);

			var D: number = b2CrossVV(e1, e2);

			var triangleArea: number = 0.5 * D;
			area += triangleArea;

			// Area weighted centroid
			center.SelfAdd(b2MulSV(triangleArea * k_inv3, b2AddVV(e1, e2, b2Vec2.s_t0), b2Vec2.s_t1));

			var ex1 = e1.x;
			var ey1 = e1.y;
			var ex2 = e2.x;
			var ey2 = e2.y;

			var intx2 = ex1*ex1 + ex2*ex1 + ex2*ex2;
			var inty2 = ey1*ey1 + ey2*ey1 + ey2*ey2;

			I += (0.25 * k_inv3 * D) * (intx2 + inty2);
		}

		// Total mass
		massData.mass = density * area;

		// Center of mass
		if (ENABLE_ASSERTS) { b2Assert(area > b2_epsilon); }
		center.SelfMul(1 / area);
		b2AddVV(center, s, massData.center);

		// Inertia tensor relative to the local origin (point s).
		massData.I = density * I;

		// Shift to center of mass then to original body origin.
		massData.I += massData.mass * (b2DotVV(massData.center, massData.center) - b2DotVV(center, center));
	}

	private static Validate_s_e = new b2Vec2();
	private static Validate_s_v = new b2Vec2();
	public Validate(): boolean
	{
		for (var i: number = 0; i < this.m_count; ++i)
		{
			var i1 = i;
			var i2 = (i + 1) % this.m_count;
			var p = this.m_vertices[i1];
			var e: b2Vec2 = b2SubVV(this.m_vertices[i2], p, b2PolygonShape.Validate_s_e);

			for (var j: number = 0; j < this.m_count; ++j)
			{
				if (j == i1 || j == i2)
				{
					continue;
				}

				var v: b2Vec2 = b2SubVV(this.m_vertices[j], p, b2PolygonShape.Validate_s_v);
				var c: number = b2CrossVV(e, v);
				if (c < 0)
				{
					return false;
				}
			}
		}

		return true;
	}

	public SetupDistanceProxy(proxy: b2DistanceProxy, index: number): void
	{
		proxy.m_vertices = this.m_vertices;
		proxy.m_count = this.m_count;
		proxy.m_radius = this.m_radius;
	}

	private static ComputeSubmergedArea_s_normalL = new b2Vec2();
	private static ComputeSubmergedArea_s_depths = b2MakeNumberArray(b2_maxPolygonVertices);
	private static ComputeSubmergedArea_s_md = new b2MassData();
	private static ComputeSubmergedArea_s_intoVec = new b2Vec2();
	private static ComputeSubmergedArea_s_outoVec = new b2Vec2();
	private static ComputeSubmergedArea_s_center = new b2Vec2();
	public ComputeSubmergedArea(normal: b2Vec2, offset: number, xf: b2Transform, c: b2Vec2): number
	{
		// Transform plane into shape co-ordinates
		var normalL: b2Vec2 = b2MulTRV(xf.q, normal, b2PolygonShape.ComputeSubmergedArea_s_normalL);
		var offsetL = offset - b2DotVV(normal, xf.p);

		var depths = b2PolygonShape.ComputeSubmergedArea_s_depths;
		var diveCount: number = 0;
		var intoIndex = -1;
		var outoIndex = -1;

		var lastSubmerged = false;
		for (var i: number = 0, ict = this.m_count; i < ict; ++i)
		{
			depths[i] = b2DotVV(normalL, this.m_vertices[i]) - offsetL;
			var isSubmerged = depths[i] < (-b2_epsilon);
			if (i > 0)
			{
				if (isSubmerged)
				{
					if (!lastSubmerged)
					{
						intoIndex = i - 1;
						diveCount++;
					}
				}
				else
				{
					if (lastSubmerged)
					{
						outoIndex = i - 1;
						diveCount++;
					}
				}
			}
			lastSubmerged = isSubmerged;
		}
		switch (diveCount)
		{
		case 0:
			if (lastSubmerged)
			{
				// Completely submerged
				var md = b2PolygonShape.ComputeSubmergedArea_s_md;
				this.ComputeMass(md, 1);
				b2MulXV(xf, md.center, c);
				return md.mass;
			}
			else
			{
				//Completely dry
				return 0;
			}
		case 1:
			if (intoIndex == (-1))
			{
				intoIndex = this.m_count - 1;
			}
			else
			{
				outoIndex = this.m_count - 1;
			}
			break;
		}
		var intoIndex2 = ((intoIndex + 1) % this.m_count);
		var outoIndex2 = ((outoIndex + 1) % this.m_count);
		var intoLamdda = (0 - depths[intoIndex]) / (depths[intoIndex2] - depths[intoIndex]);
		var outoLamdda = (0 - depths[outoIndex]) / (depths[outoIndex2] - depths[outoIndex]);

		var intoVec = b2PolygonShape.ComputeSubmergedArea_s_intoVec.SetXY(
			this.m_vertices[intoIndex].x * (1 - intoLamdda) + this.m_vertices[intoIndex2].x * intoLamdda,
			this.m_vertices[intoIndex].y * (1 - intoLamdda) + this.m_vertices[intoIndex2].y * intoLamdda);
		var outoVec = b2PolygonShape.ComputeSubmergedArea_s_outoVec.SetXY(
			this.m_vertices[outoIndex].x * (1 - outoLamdda) + this.m_vertices[outoIndex2].x * outoLamdda,
			this.m_vertices[outoIndex].y * (1 - outoLamdda) + this.m_vertices[outoIndex2].y * outoLamdda);

		// Initialize accumulator
		var area: number = 0;
		var center = b2PolygonShape.ComputeSubmergedArea_s_center.SetZero();
		var p2 = this.m_vertices[intoIndex2];
		var p3 = null;

		// An awkward loop from intoIndex2+1 to outIndex2
		var i = intoIndex2;
		while (i != outoIndex2)
		{
			i = (i + 1) % this.m_count;
			if (i == outoIndex2)
				p3 = outoVec;
			else
				p3	= this.m_vertices[i];

			var triangleArea: number = 0.5 * ((p2.x - intoVec.x) * (p3.y - intoVec.y) - (p2.y - intoVec.y) * (p3.x - intoVec.x));
			area += triangleArea;
			// Area weighted centroid
			center.x += triangleArea * (intoVec.x + p2.x + p3.x) / 3;
			center.y += triangleArea * (intoVec.y + p2.y + p3.y) / 3;

			p2 = p3;
		}

		//Normalize and transform centroid
		center.SelfMul(1 / area);
		b2MulXV(xf, center, c);

		return area;
	}

	public Dump(): void
	{
		b2Log("    var shape: b2PolygonShape = new b2PolygonShape();\n");
		b2Log("    var vs: b2Vec2[] = b2Vec2.MakeArray(%d);\n", b2_maxPolygonVertices);
		for (var i: number = 0; i < this.m_count; ++i)
		{
			b2Log("    vs[%d].SetXY(%.15f, %.15f);\n", i, this.m_vertices[i].x, this.m_vertices[i].y);
		}
		b2Log("    shape.SetAsVector(vs, %d);\n", this.m_count);
	}

	private static ComputeCentroid_s_pRef = new b2Vec2();
	private static ComputeCentroid_s_e1 = new b2Vec2();
	private static ComputeCentroid_s_e2 = new b2Vec2();
	public static ComputeCentroid(vs: b2Vec2[], count: number, out: b2Vec2): b2Vec2
	{
		if (ENABLE_ASSERTS) { b2Assert(count >= 3); }

		var c = out; c.SetZero();
		var area: number = 0;

		// s is the reference point for forming triangles.
		// It's location doesn't change the result (except for rounding error).
		var pRef = b2PolygonShape.ComputeCentroid_s_pRef.SetZero();
		/*
#if 0
		// This code would put the reference point inside the polygon.
		for (var i: number = 0; i < count; ++i)
		{
			pRef.SelfAdd(vs[i]);
		}
		pRef.SelfMul(1 / count);
#endif
		*/

		var inv3: number = 1 / 3;

		for (var i: number = 0; i < count; ++i)
		{
			// Triangle vertices.
			var p1 = pRef;
			var p2 = vs[i];
			var p3 = vs[(i + 1) % count];

			var e1: b2Vec2 = b2SubVV(p2, p1, b2PolygonShape.ComputeCentroid_s_e1);
			var e2: b2Vec2 = b2SubVV(p3, p1, b2PolygonShape.ComputeCentroid_s_e2);

			var D: number = b2CrossVV(e1, e2);

			var triangleArea: number = 0.5 * D;
			area += triangleArea;

			// Area weighted centroid
			c.x += triangleArea * inv3 * (p1.x + p2.x + p3.x);
			c.y += triangleArea * inv3 * (p1.y + p2.y + p3.y);
		}

		// Centroid
		if (ENABLE_ASSERTS) { b2Assert(area > b2_epsilon); }
		c.SelfMul(1 / area);
		return c;
	}

	/*
	public static ComputeOBB(obb, vs, count)
	{
		var i: number = 0;
		var p: Array = new Array(count + 1);
		for (i = 0; i < count; ++i)
		{
			p[i] = vs[i];
		}
		p[count] = p[0];
		var minArea = b2_maxFloat;
		for (i = 1; i <= count; ++i)
		{
			var root = p[i - 1];
			var uxX = p[i].x - root.x;
			var uxY = p[i].y - root.y;
			var length = b2Sqrt(uxX * uxX + uxY * uxY);
			uxX /= length;
			uxY /= length;
			var uyX = (-uxY);
			var uyY = uxX;
			var lowerX = b2_maxFloat;
			var lowerY = b2_maxFloat;
			var upperX = (-b2_maxFloat);
			var upperY = (-b2_maxFloat);
			for (var j: number = 0; j < count; ++j)
			{
				var dX = p[j].x - root.x;
				var dY = p[j].y - root.y;
				var rX = (uxX * dX + uxY * dY);
				var rY = (uyX * dX + uyY * dY);
				if (rX < lowerX) lowerX = rX;
				if (rY < lowerY) lowerY = rY;
				if (rX > upperX) upperX = rX;
				if (rY > upperY) upperY = rY;
			}
			var area = (upperX - lowerX) * (upperY - lowerY);
			if (area < 0.95 * minArea)
			{
				minArea = area;
				obb.R.ex.x = uxX;
				obb.R.ex.y = uxY;
				obb.R.ey.x = uyX;
				obb.R.ey.y = uyY;
				var center_x: number = 0.5 * (lowerX + upperX);
				var center_y: number = 0.5 * (lowerY + upperY);
				var tMat = obb.R;
				obb.center.x = root.x + (tMat.ex.x * center_x + tMat.ey.x * center_y);
				obb.center.y = root.y + (tMat.ex.y * center_x + tMat.ey.y * center_y);
				obb.extents.x = 0.5 * (upperX - lowerX);
				obb.extents.y = 0.5 * (upperY - lowerY);
			}
		}
	}
	*/
}
