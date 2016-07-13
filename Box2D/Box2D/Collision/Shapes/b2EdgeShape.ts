/*
* Copyright (c) 2006-2010 Erin Catto http://www.box2d.org
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

import {b2Vec2, b2DistanceSquaredVV, b2Transform, b2MulXV, b2MinV, b2MaxV, b2SubVV, b2DotVV, b2Sq, b2Sqrt, b2AddVMulSV, b2Asin, b2Pow, b2MulTXV, b2MidVV} from '../../Common/b2Math';
import {b2_polygonRadius, ENABLE_ASSERTS, b2Assert, b2_linearSlop, b2Log, b2_maxPolygonVertices, b2_epsilon, b2_pi} from '../../Common/b2Settings';
import {b2Shape, b2ShapeType, b2MassData} from '../../Collision/Shapes/b2Shape';
import {b2DistanceProxy} from '../../Collision/b2Distance';
import {b2RayCastOutput, b2RayCastInput, b2AABB} from '../../Collision/b2Collision';

/// A line segment (edge) shape. These can be connected in chains or loops
/// to other edge shapes. The connectivity information is used to ensure
/// correct contact normals.
export class b2EdgeShape extends b2Shape
{
	public m_vertex1: b2Vec2 = new b2Vec2();
	public m_vertex2: b2Vec2 = new b2Vec2();
	public m_vertex0: b2Vec2 = new b2Vec2();
	public m_vertex3: b2Vec2 = new b2Vec2();
	public m_hasVertex0: boolean = false;
	public m_hasVertex3: boolean = false;

	constructor()
	{
		super(b2ShapeType.e_edgeShape, b2_polygonRadius);
	}

	/// Set this as an isolated edge.
	public SetAsEdge(v1: b2Vec2, v2: b2Vec2): b2EdgeShape
	{
		this.m_vertex1.Copy(v1);
		this.m_vertex2.Copy(v2);
		this.m_hasVertex0 = false;
		this.m_hasVertex3 = false;
		return this;
	}

	/// Implement b2Shape.
	public Clone(): b2EdgeShape
	{
		return new b2EdgeShape().Copy(this);
	}

	public Copy(other: b2EdgeShape): b2EdgeShape
	{
		super.Copy(other);

		if (ENABLE_ASSERTS) { b2Assert(other instanceof b2EdgeShape); }

		this.m_vertex1.Copy(other.m_vertex1);
		this.m_vertex2.Copy(other.m_vertex2);
		this.m_vertex0.Copy(other.m_vertex0);
		this.m_vertex3.Copy(other.m_vertex3);
		this.m_hasVertex0 = other.m_hasVertex0;
		this.m_hasVertex3 = other.m_hasVertex3;

		return this;
	}

	/// @see b2Shape::GetChildCount
	public GetChildCount(): number
	{
		return 1;
	}

	/// @see b2Shape::TestPoint
	public TestPoint(xf: b2Transform, p: b2Vec2): boolean
	{
		return false;
	}

	/// Implement b2Shape.
	// p = p1 + t * d
	// v = v1 + s * e
	// p1 + t * d = v1 + s * e
	// s * e - t * d = p1 - v1
	private static RayCast_s_p1 = new b2Vec2();
	private static RayCast_s_p2 = new b2Vec2();
	private static RayCast_s_d = new b2Vec2();
	private static RayCast_s_e = new b2Vec2();
	private static RayCast_s_q = new b2Vec2();
	private static RayCast_s_r = new b2Vec2();
	public RayCast(output: b2RayCastOutput, input: b2RayCastInput, xf: b2Transform, childIndex: number): boolean
	{
		// Put the ray into the edge's frame of reference.
		var p1: b2Vec2 = b2MulTXV(xf, input.p1, b2EdgeShape.RayCast_s_p1);
		var p2: b2Vec2 = b2MulTXV(xf, input.p2, b2EdgeShape.RayCast_s_p2);
		var d: b2Vec2 = b2SubVV(p2, p1, b2EdgeShape.RayCast_s_d);

		var v1 = this.m_vertex1;
		var v2 = this.m_vertex2;
		var e: b2Vec2 = b2SubVV(v2, v1, b2EdgeShape.RayCast_s_e);
		var normal = output.normal.SetXY(e.y, -e.x).SelfNormalize();

		// q = p1 + t * d
		// dot(normal, q - v1) = 0
		// dot(normal, p1 - v1) + t * dot(normal, d) = 0
		var numerator: number = b2DotVV(normal, b2SubVV(v1, p1, b2Vec2.s_t0));
		var denominator: number = b2DotVV(normal, d);

		if (denominator == 0)
		{
			return false;
		}

		var t = numerator / denominator;
		if (t < 0 || input.maxFraction < t)
		{
			return false;
		}

		var q: b2Vec2 = b2AddVMulSV(p1, t, d, b2EdgeShape.RayCast_s_q);

		// q = v1 + s * r
		// s = dot(q - v1, r) / dot(r, r)
		var r: b2Vec2 = b2SubVV(v2, v1, b2EdgeShape.RayCast_s_r);
		var rr: number = b2DotVV(r, r);
		if (rr == 0)
		{
			return false;
		}

		var s: number = b2DotVV(b2SubVV(q, v1, b2Vec2.s_t0), r) / rr;
		if (s < 0 || 1 < s)
		{
			return false;
		}

		output.fraction = t;
		if (numerator > 0)
		{
			output.normal.SelfNeg();
		}
		return true;
	}

	/// @see b2Shape::ComputeAABB
	private static ComputeAABB_s_v1 = new b2Vec2();
	private static ComputeAABB_s_v2 = new b2Vec2();
	public ComputeAABB(aabb: b2AABB, xf: b2Transform, childIndex: number): void
	{
		var v1: b2Vec2 = b2MulXV(xf, this.m_vertex1, b2EdgeShape.ComputeAABB_s_v1);
		var v2: b2Vec2 = b2MulXV(xf, this.m_vertex2, b2EdgeShape.ComputeAABB_s_v2);

		b2MinV(v1, v2, aabb.lowerBound);
		b2MaxV(v1, v2, aabb.upperBound);

		var r = this.m_radius;
		aabb.lowerBound.SelfSubXY(r, r);
		aabb.upperBound.SelfAddXY(r, r);
	}

	/// @see b2Shape::ComputeMass
	public ComputeMass(massData: b2MassData, density: number): void
	{
		massData.mass = 0;
		b2MidVV(this.m_vertex1, this.m_vertex2, massData.center);
		massData.I = 0;
	}

	public SetupDistanceProxy(proxy: b2DistanceProxy, index: number): void
	{
		proxy.m_vertices = new Array(2);
		proxy.m_vertices[0] = this.m_vertex1;
		proxy.m_vertices[1] = this.m_vertex2;
		proxy.m_count = 2;
		proxy.m_radius = this.m_radius;
	}

	public ComputeSubmergedArea(normal: b2Vec2, offset: number, xf: b2Transform, c: b2Vec2): number
	{
		c.SetZero();
		return 0;
	}

	public Dump(): void
	{
		b2Log("    var shape: b2EdgeShape = new b2EdgeShape();\n");
		b2Log("    shape.m_radius = %.15f;\n", this.m_radius);
		b2Log("    shape.m_vertex0.SetXY(%.15f, %.15f);\n", this.m_vertex0.x, this.m_vertex0.y);
		b2Log("    shape.m_vertex1.SetXY(%.15f, %.15f);\n", this.m_vertex1.x, this.m_vertex1.y);
		b2Log("    shape.m_vertex2.SetXY(%.15f, %.15f);\n", this.m_vertex2.x, this.m_vertex2.y);
		b2Log("    shape.m_vertex3.SetXY(%.15f, %.15f);\n", this.m_vertex3.x, this.m_vertex3.y);
		b2Log("    shape.m_hasVertex0 = %s;\n", this.m_hasVertex0);
		b2Log("    shape.m_hasVertex3 = %s;\n", this.m_hasVertex3);
	}
}
