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

import {ENABLE_ASSERTS, b2Assert, b2MakeArray, b2_maxManifoldPoints, DEBUG, b2_velocityThreshold, b2_toiBaumgarte, b2_linearSlop, b2_maxLinearCorrection, b2_baumgarte} from '../../Common/b2Settings';
import {
	b2Vec2,
	b2Mat22,
	b2MulXV,
	b2SubVV,
	b2MidVV,
	b2DotVV,
	b2MulRV,
	b2Max,
	b2Transform,
	b2CrossVV,
	b2AddVV,
	b2MulSV,
	b2AddVCrossSV,
	b2Clamp,
	b2CrossVOne,
	b2MulMV,
	b2Min
} from '../../Common/b2Math';
import {b2Fixture} from '../../Dynamics/b2Fixture';
import {b2Body} from '../../Dynamics/b2Body';
import {b2TimeStep, b2Position, b2Velocity} from '../../Dynamics/b2TimeStep';
import {b2Shape} from '../../Collision/Shapes/b2Shape';
import {b2Contact} from '../../Dynamics/Contacts/b2Contact';
import {b2ManifoldType, b2Manifold, b2ManifoldPoint, b2WorldManifold} from '../../Collision/b2Collision';

export class b2VelocityConstraintPoint
{
	public rA: b2Vec2 = new b2Vec2();
	public rB: b2Vec2 = new b2Vec2();
	public normalImpulse: number = 0;
	public tangentImpulse: number = 0;
	public normalMass: number = 0;
	public tangentMass: number = 0;
	public velocityBias: number = 0;

	public static MakeArray(length)
	{
		return b2MakeArray(length, function (i) { return new b2VelocityConstraintPoint(); });
	}
}

export class b2ContactVelocityConstraint
{
	public points: b2VelocityConstraintPoint[] = b2VelocityConstraintPoint.MakeArray(b2_maxManifoldPoints);
	public normal: b2Vec2 = new b2Vec2();
	public tangent: b2Vec2 = new b2Vec2();
	public normalMass: b2Mat22 = new b2Mat22();
	public K: b2Mat22 = new b2Mat22();
	public indexA: number = 0;
	public indexB: number = 0;
	public invMassA: number = 0;
	public invMassB: number = 0;
	public invIA: number = 0;
	public invIB: number = 0;
	public friction: number = 0;
	public restitution: number = 0;
	public tangentSpeed: number = 0;
	public pointCount: number = 0;
	public contactIndex: number = 0;

	public static MakeArray(length)
	{
		return b2MakeArray(length, function (i) { return new b2ContactVelocityConstraint(); } );
	}
}

export class b2ContactPositionConstraint
{
	public localPoints: b2Vec2[] = b2Vec2.MakeArray(b2_maxManifoldPoints);
	public localNormal: b2Vec2 = new b2Vec2();
	public localPoint: b2Vec2 = new b2Vec2();
	public indexA: number = 0;
	public indexB: number = 0;
	public invMassA: number = 0;
	public invMassB: number = 0;
	public localCenterA: b2Vec2 = new b2Vec2();
	public localCenterB: b2Vec2 = new b2Vec2();
	public invIA: number = 0;
	public invIB: number = 0;
	public type: b2ManifoldType = b2ManifoldType.e_unknown;
	public radiusA: number = 0;
	public radiusB: number = 0;
	public pointCount: number = 0;

	public static MakeArray(length)
	{
		return b2MakeArray(length, function (i) { return new b2ContactPositionConstraint(); } );
	}
}

export class b2ContactSolverDef
{
	public step: b2TimeStep = new b2TimeStep();
	public contacts: b2Contact[] = null;
	public count: number = 0;
	public positions: b2Position[] = null;
	public velocities: b2Velocity[] = null;
	public allocator = null;
}

export class b2PositionSolverManifold
{
	public normal: b2Vec2 = new b2Vec2();
	public point: b2Vec2 = new b2Vec2();
	public separation: number = 0;

	private static Initialize_s_pointA = new b2Vec2();
	private static Initialize_s_pointB = new b2Vec2();
	private static Initialize_s_planePoint = new b2Vec2();
	private static Initialize_s_clipPoint = new b2Vec2();
	public Initialize(pc, xfA, xfB, index)
	{
		var pointA: b2Vec2 = b2PositionSolverManifold.Initialize_s_pointA;
		var pointB: b2Vec2 = b2PositionSolverManifold.Initialize_s_pointB;
		var planePoint: b2Vec2 = b2PositionSolverManifold.Initialize_s_planePoint;
		var clipPoint: b2Vec2 = b2PositionSolverManifold.Initialize_s_clipPoint;

		if (ENABLE_ASSERTS) { b2Assert(pc.pointCount > 0); }

		switch (pc.type)
		{
		case b2ManifoldType.e_circles:
			{
				//b2Vec2 pointA = b2Mul(xfA, pc->localPoint);
				b2MulXV(xfA, pc.localPoint, pointA);
				//b2Vec2 pointB = b2Mul(xfB, pc->localPoints[0]);
				b2MulXV(xfB, pc.localPoints[0], pointB);
				//normal = pointB - pointA;
				//normal.Normalize();
				b2SubVV(pointB, pointA, this.normal).SelfNormalize();
				//point = 0.5f * (pointA + pointB);
				b2MidVV(pointA, pointB, this.point);
				//separation = b2Dot(pointB - pointA, normal) - pc->radius;
				this.separation = b2DotVV(b2SubVV(pointB, pointA, b2Vec2.s_t0), this.normal) - pc.radiusA - pc.radiusB;
			}
			break;

		case b2ManifoldType.e_faceA:
			{
				//normal = b2Mul(xfA.q, pc->localNormal);
				b2MulRV(xfA.q, pc.localNormal, this.normal);
				//b2Vec2 planePoint = b2Mul(xfA, pc->localPoint);
				b2MulXV(xfA, pc.localPoint, planePoint);

				//b2Vec2 clipPoint = b2Mul(xfB, pc->localPoints[index]);
				b2MulXV(xfB, pc.localPoints[index], clipPoint);
				//separation = b2Dot(clipPoint - planePoint, normal) - pc->radius;
				this.separation = b2DotVV(b2SubVV(clipPoint, planePoint, b2Vec2.s_t0), this.normal) - pc.radiusA - pc.radiusB;
				//point = clipPoint;
				this.point.Copy(clipPoint);
			}
			break;

		case b2ManifoldType.e_faceB:
			{
				//normal = b2Mul(xfB.q, pc->localNormal);
				b2MulRV(xfB.q, pc.localNormal, this.normal);
				//b2Vec2 planePoint = b2Mul(xfB, pc->localPoint);
				b2MulXV(xfB, pc.localPoint, planePoint);

				//b2Vec2 clipPoint = b2Mul(xfA, pc->localPoints[index]);
				b2MulXV(xfA, pc.localPoints[index], clipPoint);
				//separation = b2Dot(clipPoint - planePoint, normal) - pc->radius;
				this.separation = b2DotVV(b2SubVV(clipPoint, planePoint, b2Vec2.s_t0), this.normal) - pc.radiusA - pc.radiusB;
				//point = clipPoint;
				this.point.Copy(clipPoint);

				// Ensure normal points from A to B
				//normal = -normal;
				this.normal.SelfNeg();
			}
			break;
		}
	}
}

export class b2ContactSolver
{
	public m_step: b2TimeStep = new b2TimeStep();
	public m_positions: b2Position[] = null;
	public m_velocities: b2Velocity[] = null;
	public m_allocator = null;
	public m_positionConstraints: b2ContactPositionConstraint[] = b2ContactPositionConstraint.MakeArray(1024); // TODO: b2Settings
	public m_velocityConstraints: b2ContactVelocityConstraint[] = b2ContactVelocityConstraint.MakeArray(1024); // TODO: b2Settings
	public m_contacts: b2Contact[] = null;
	public m_count: number = 0;

	public Initialize(def)
	{
		this.m_step.Copy(def.step);
		this.m_allocator = def.allocator;
		this.m_count = def.count;
		// TODO:
		if (this.m_positionConstraints.length < this.m_count)
		{
			var new_length = b2Max(this.m_positionConstraints.length * 2, this.m_count);

			if (DEBUG)
			{
				console.log("b2ContactSolver.m_positionConstraints: " + new_length);
			}

			while (this.m_positionConstraints.length < new_length)
			{
				this.m_positionConstraints[this.m_positionConstraints.length] = new b2ContactPositionConstraint();
			}
		}
		// TODO:
		if (this.m_velocityConstraints.length < this.m_count)
		{
			var new_length = b2Max(this.m_velocityConstraints.length * 2, this.m_count);

			if (DEBUG)
			{
				console.log("b2ContactSolver.m_velocityConstraints: " + new_length);
			}

			while (this.m_velocityConstraints.length < new_length)
			{
				this.m_velocityConstraints[this.m_velocityConstraints.length] = new b2ContactVelocityConstraint();
			}
		}
		this.m_positions = def.positions;
		this.m_velocities = def.velocities;
		this.m_contacts = def.contacts;

		var i: number;
		var ict: number;
		var j: number;
		var jct: number;

		var contact: b2Contact;

		var fixtureA: b2Fixture;
		var fixtureB: b2Fixture;
		var shapeA: b2Shape;
		var shapeB: b2Shape;
		var radiusA: number;
		var radiusB: number;
		var bodyA: b2Body;
		var bodyB: b2Body;
		var manifold: b2Manifold;

		var pointCount: number;

		var vc: b2ContactVelocityConstraint;
		var pc: b2ContactPositionConstraint;

		var cp: b2ManifoldPoint;
		var vcp: b2VelocityConstraintPoint;

		// Initialize position independent portions of the constraints.
		for (i = 0, ict = this.m_count; i < ict; ++i)
		{
			contact = this.m_contacts[i];

			fixtureA = contact.m_fixtureA;
			fixtureB = contact.m_fixtureB;
			shapeA = fixtureA.GetShape();
			shapeB = fixtureB.GetShape();
			radiusA = shapeA.m_radius;
			radiusB = shapeB.m_radius;
			bodyA = fixtureA.GetBody();
			bodyB = fixtureB.GetBody();
			manifold = contact.GetManifold();

			pointCount = manifold.pointCount;
			if (ENABLE_ASSERTS) { b2Assert(pointCount > 0); }

			vc = this.m_velocityConstraints[i];
			vc.friction = contact.m_friction;
			vc.restitution = contact.m_restitution;
			vc.tangentSpeed = contact.m_tangentSpeed;
			vc.indexA = bodyA.m_islandIndex;
			vc.indexB = bodyB.m_islandIndex;
			vc.invMassA = bodyA.m_invMass;
			vc.invMassB = bodyB.m_invMass;
			vc.invIA = bodyA.m_invI;
			vc.invIB = bodyB.m_invI;
			vc.contactIndex = i;
			vc.pointCount = pointCount;
			vc.K.SetZero();
			vc.normalMass.SetZero();

			pc = this.m_positionConstraints[i];
			pc.indexA = bodyA.m_islandIndex;
			pc.indexB = bodyB.m_islandIndex;
			pc.invMassA = bodyA.m_invMass;
			pc.invMassB = bodyB.m_invMass;
			pc.localCenterA.Copy(bodyA.m_sweep.localCenter);
			pc.localCenterB.Copy(bodyB.m_sweep.localCenter);
			pc.invIA = bodyA.m_invI;
			pc.invIB = bodyB.m_invI;
			pc.localNormal.Copy(manifold.localNormal);
			pc.localPoint.Copy(manifold.localPoint);
			pc.pointCount = pointCount;
			pc.radiusA = radiusA;
			pc.radiusB = radiusB;
			pc.type = manifold.type;

			for (j = 0, jct = pointCount; j < jct; ++j)
			{
				cp = manifold.points[j];
				vcp = vc.points[j];

				if (this.m_step.warmStarting)
				{
					vcp.normalImpulse = this.m_step.dtRatio * cp.normalImpulse;
					vcp.tangentImpulse = this.m_step.dtRatio * cp.tangentImpulse;
				}
				else
				{
					vcp.normalImpulse = 0;
					vcp.tangentImpulse = 0;
				}

				vcp.rA.SetZero();
				vcp.rB.SetZero();
				vcp.normalMass = 0;
				vcp.tangentMass = 0;
				vcp.velocityBias = 0;

				pc.localPoints[j].Copy(cp.localPoint);
			}
		}

		return this;
	}

	private static InitializeVelocityConstraints_s_xfA = new b2Transform();
	private static InitializeVelocityConstraints_s_xfB = new b2Transform();
	private static InitializeVelocityConstraints_s_worldManifold = new b2WorldManifold();
	public InitializeVelocityConstraints()
	{
		var i: number;
		var ict: number;
		var j: number;
		var jct: number;

		var vc: b2ContactVelocityConstraint;
		var pc: b2ContactPositionConstraint;

		var radiusA: number;
		var radiusB: number;
		var manifold: b2Manifold;

		var indexA: number;
		var indexB: number;

		var mA: number;
		var mB: number;
		var iA: number;
		var iB: number;
		var localCenterA: b2Vec2;
		var localCenterB: b2Vec2;

		var cA: b2Vec2;
		var aA: number;
		var vA: b2Vec2;
		var wA: number;

		var cB: b2Vec2;
		var aB: number;
		var vB: b2Vec2;
		var wB: number;

		var xfA: b2Transform = b2ContactSolver.InitializeVelocityConstraints_s_xfA;
		var xfB: b2Transform = b2ContactSolver.InitializeVelocityConstraints_s_xfB;

		var worldManifold: b2WorldManifold = b2ContactSolver.InitializeVelocityConstraints_s_worldManifold;

		var pointCount: number;

		var vcp: b2VelocityConstraintPoint;

		var rnA: number;
		var rnB: number;

		var kNormal: number;

		var tangent: b2Vec2;

		var rtA: number;
		var rtB: number;

		var kTangent: number;

		var vRel: number;

		var vcp1: b2VelocityConstraintPoint;
		var vcp2: b2VelocityConstraintPoint;

		var rn1A: number;
		var rn1B: number;
		var rn2A: number;
		var rn2B: number;

		var k11: number;
		var k22: number;
		var k12: number;

		var k_maxConditionNumber: number = 1000;

		for (i = 0, ict = this.m_count; i < ict; ++i)
		{
			vc = this.m_velocityConstraints[i];
			pc = this.m_positionConstraints[i];

			radiusA = pc.radiusA;
			radiusB = pc.radiusB;
			manifold = this.m_contacts[vc.contactIndex].GetManifold();

			indexA = vc.indexA;
			indexB = vc.indexB;

			mA = vc.invMassA;
			mB = vc.invMassB;
			iA = vc.invIA;
			iB = vc.invIB;
			localCenterA = pc.localCenterA;
			localCenterB = pc.localCenterB;

			cA = this.m_positions[indexA].c;
			aA = this.m_positions[indexA].a;
			vA = this.m_velocities[indexA].v;
			wA = this.m_velocities[indexA].w;

			cB = this.m_positions[indexB].c;
			aB = this.m_positions[indexB].a;
			vB = this.m_velocities[indexB].v;
			wB = this.m_velocities[indexB].w;

			if (ENABLE_ASSERTS) { b2Assert(manifold.pointCount > 0); }

			xfA.q.SetAngleRadians(aA);
			xfB.q.SetAngleRadians(aB);
			b2SubVV(cA, b2MulRV(xfA.q, localCenterA, b2Vec2.s_t0), xfA.p);
			b2SubVV(cB, b2MulRV(xfB.q, localCenterB, b2Vec2.s_t0), xfB.p);

			worldManifold.Initialize(manifold, xfA, radiusA, xfB, radiusB);

			vc.normal.Copy(worldManifold.normal);
			b2CrossVOne(vc.normal, vc.tangent); // compute from normal

			pointCount = vc.pointCount;
			for (j = 0, jct = pointCount; j < jct; ++j)
			{
				vcp = vc.points[j];

				//vcp->rA = worldManifold.points[j] - cA;
				b2SubVV(worldManifold.points[j], cA, vcp.rA);
				//vcp->rB = worldManifold.points[j] - cB;
				b2SubVV(worldManifold.points[j], cB, vcp.rB);

				rnA = b2CrossVV(vcp.rA, vc.normal);
				rnB = b2CrossVV(vcp.rB, vc.normal);

				kNormal = mA + mB + iA * rnA * rnA + iB * rnB * rnB;

				vcp.normalMass = kNormal > 0 ? 1 / kNormal : 0;

				//b2Vec2 tangent = b2Cross(vc->normal, 1.0f);
				tangent = vc.tangent; // precomputed from normal

				rtA = b2CrossVV(vcp.rA, tangent);
				rtB = b2CrossVV(vcp.rB, tangent);

				kTangent = mA + mB + iA * rtA * rtA + iB * rtB * rtB;

				vcp.tangentMass = kTangent > 0 ? 1 / kTangent : 0;

				// Setup a velocity bias for restitution.
				vcp.velocityBias = 0;
				//float32 vRel = b2Dot(vc->normal, vB + b2Cross(wB, vcp->rB) - vA - b2Cross(wA, vcp->rA));
				vRel = b2DotVV(
					vc.normal,
					b2SubVV(
						b2AddVCrossSV(vB, wB, vcp.rB, b2Vec2.s_t0),
						b2AddVCrossSV(vA, wA, vcp.rA, b2Vec2.s_t1),
						b2Vec2.s_t0));
				if (vRel < (-b2_velocityThreshold))
				{
					vcp.velocityBias += (-vc.restitution * vRel);
				}
			}

			// If we have two points, then prepare the block solver.
			if (vc.pointCount == 2)
			{
				vcp1 = vc.points[0];
				vcp2 = vc.points[1];

				rn1A = b2CrossVV(vcp1.rA, vc.normal);
				rn1B = b2CrossVV(vcp1.rB, vc.normal);
				rn2A = b2CrossVV(vcp2.rA, vc.normal);
				rn2B = b2CrossVV(vcp2.rB, vc.normal);

				k11 = mA + mB + iA * rn1A * rn1A + iB * rn1B * rn1B;
				k22 = mA + mB + iA * rn2A * rn2A + iB * rn2B * rn2B;
				k12 = mA + mB + iA * rn1A * rn2A + iB * rn1B * rn2B;

				// Ensure a reasonable condition number.
				//float32 k_maxConditionNumber = 1000.0f;
				if (k11 * k11 < k_maxConditionNumber * (k11 * k22 - k12 * k12))
				{
					// K is safe to invert.
					vc.K.ex.SetXY(k11, k12);
					vc.K.ey.SetXY(k12, k22);
					vc.K.GetInverse(vc.normalMass);
				}
				else
				{
					// The constraints are redundant, just use one.
					// TODO_ERIN use deepest?
					vc.pointCount = 1;
				}
			}
		}
	}

	private static WarmStart_s_P = new b2Vec2();
	public WarmStart()
	{
		var i: number;
		var ict: number;
		var j: number;
		var jct: number;

		var vc: b2ContactVelocityConstraint;

		var indexA: number;
		var indexB: number;
		var mA: number;
		var iA: number;
		var mB: number;
		var iB: number;
		var pointCount: number;

		var vA: b2Vec2;
		var wA: number;
		var vB: b2Vec2;
		var wB: number;

		var normal: b2Vec2;
		var tangent: b2Vec2;

		var vcp: b2VelocityConstraintPoint;
		var P: b2Vec2 = b2ContactSolver.WarmStart_s_P;

		// Warm start.
		for (i = 0, ict = this.m_count; i < ict; ++i)
		{
			vc = this.m_velocityConstraints[i];

			indexA = vc.indexA;
			indexB = vc.indexB;
			mA = vc.invMassA;
			iA = vc.invIA;
			mB = vc.invMassB;
			iB = vc.invIB;
			pointCount = vc.pointCount;

			vA = this.m_velocities[indexA].v;
			wA = this.m_velocities[indexA].w;
			vB = this.m_velocities[indexB].v;
			wB = this.m_velocities[indexB].w;

			normal = vc.normal;
			//b2Vec2 tangent = b2Cross(normal, 1.0f);
			tangent = vc.tangent; // precomputed from normal

			for (j = 0, jct = pointCount; j < jct; ++j)
			{
				vcp = vc.points[j];
				//b2Vec2 P = vcp->normalImpulse * normal + vcp->tangentImpulse * tangent;
				b2AddVV(
					b2MulSV(vcp.normalImpulse, normal, b2Vec2.s_t0),
					b2MulSV(vcp.tangentImpulse, tangent, b2Vec2.s_t1),
					P);
				//wA -= iA * b2Cross(vcp->rA, P);
				wA -= iA * b2CrossVV(vcp.rA, P);
				//vA -= mA * P;
				vA.SelfMulSub(mA, P);
				//wB += iB * b2Cross(vcp->rB, P);
				wB += iB * b2CrossVV(vcp.rB, P);
				//vB += mB * P;
				vB.SelfMulAdd(mB, P);
			}

			//this.m_velocities[indexA].v = vA;
			this.m_velocities[indexA].w = wA;
			//this.m_velocities[indexB].v = vB;
			this.m_velocities[indexB].w = wB;
		}
	}

	private static SolveVelocityConstraints_s_dv = new b2Vec2();
	private static SolveVelocityConstraints_s_dv1 = new b2Vec2();
	private static SolveVelocityConstraints_s_dv2 = new b2Vec2();
	private static SolveVelocityConstraints_s_P = new b2Vec2();
	private static SolveVelocityConstraints_s_a = new b2Vec2();
	private static SolveVelocityConstraints_s_b = new b2Vec2();
	private static SolveVelocityConstraints_s_x = new b2Vec2();
	private static SolveVelocityConstraints_s_d = new b2Vec2();
	private static SolveVelocityConstraints_s_P1 = new b2Vec2();
	private static SolveVelocityConstraints_s_P2 = new b2Vec2();
	private static SolveVelocityConstraints_s_P1P2 = new b2Vec2();
	public SolveVelocityConstraints()
	{
		var i: number;
		var ict: number;
		var j: number;
		var jct: number;

		var vc: b2ContactVelocityConstraint;
		var indexA: number;
		var indexB: number;
		var mA: number;
		var iA: number;
		var mB: number;
		var iB: number;
		var pointCount: number;
		var vA: b2Vec2;
		var wA: number;
		var vB: b2Vec2;
		var wB: number;
		var normal: b2Vec2;
		var tangent: b2Vec2;
		var friction: number;

		var vcp: b2VelocityConstraintPoint;

		var dv: b2Vec2 = b2ContactSolver.SolveVelocityConstraints_s_dv;
		var dv1: b2Vec2 = b2ContactSolver.SolveVelocityConstraints_s_dv1;
		var dv2: b2Vec2 = b2ContactSolver.SolveVelocityConstraints_s_dv2;

		var vt: number;
		var vn: number;
		var lambda: number;

		var maxFriction: number;
		var newImpulse: number;

		var P: b2Vec2 = b2ContactSolver.SolveVelocityConstraints_s_P;

		var cp1: b2VelocityConstraintPoint;
		var cp2: b2VelocityConstraintPoint;

		var a: b2Vec2 = b2ContactSolver.SolveVelocityConstraints_s_a;
		var b: b2Vec2 = b2ContactSolver.SolveVelocityConstraints_s_b;
		var vn1: number;
		var vn2: number;

		var x: b2Vec2 = b2ContactSolver.SolveVelocityConstraints_s_x;
		var d: b2Vec2 = b2ContactSolver.SolveVelocityConstraints_s_d;
		var P1: b2Vec2 = b2ContactSolver.SolveVelocityConstraints_s_P1;
		var P2: b2Vec2 = b2ContactSolver.SolveVelocityConstraints_s_P2;
		var P1P2: b2Vec2 = b2ContactSolver.SolveVelocityConstraints_s_P1P2;

		for (i = 0, ict = this.m_count; i < ict; ++i)
		{
			vc = this.m_velocityConstraints[i];

			indexA = vc.indexA;
			indexB = vc.indexB;
			mA = vc.invMassA;
			iA = vc.invIA;
			mB = vc.invMassB;
			iB = vc.invIB;
			pointCount = vc.pointCount;

			vA = this.m_velocities[indexA].v;
			wA = this.m_velocities[indexA].w;
			vB = this.m_velocities[indexB].v;
			wB = this.m_velocities[indexB].w;

			//b2Vec2 normal = vc->normal;
			normal = vc.normal;
			//b2Vec2 tangent = b2Cross(normal, 1.0f);
			tangent = vc.tangent; // precomputed from normal
			friction = vc.friction;

			if (ENABLE_ASSERTS) { b2Assert(pointCount == 1 || pointCount == 2); }

			// Solve tangent constraints first because non-penetration is more important
			// than friction.
			for (j = 0, jct = pointCount; j < jct; ++j)
			{
				vcp = vc.points[j];

				// Relative velocity at contact
				//b2Vec2 dv = vB + b2Cross(wB, vcp->rB) - vA - b2Cross(wA, vcp->rA);
				b2SubVV(
					b2AddVCrossSV(vB, wB, vcp.rB, b2Vec2.s_t0),
					b2AddVCrossSV(vA, wA, vcp.rA, b2Vec2.s_t1),
					dv);

				// Compute tangent force
				//float32 vt = b2Dot(dv, tangent) - vc->tangentSpeed;
				vt = b2DotVV(dv, tangent) - vc.tangentSpeed;
				lambda = vcp.tangentMass * (-vt);

				// b2Clamp the accumulated force
				maxFriction = friction * vcp.normalImpulse;
				newImpulse = b2Clamp(vcp.tangentImpulse + lambda, (-maxFriction), maxFriction);
				lambda = newImpulse - vcp.tangentImpulse;
				vcp.tangentImpulse = newImpulse;

				// Apply contact impulse
				//b2Vec2 P = lambda * tangent;
				b2MulSV(lambda, tangent, P);

				//vA -= mA * P;
				vA.SelfMulSub(mA, P);
				//wA -= iA * b2Cross(vcp->rA, P);
				wA -= iA * b2CrossVV(vcp.rA, P);

				//vB += mB * P;
				vB.SelfMulAdd(mB, P);
				//wB += iB * b2Cross(vcp->rB, P);
				wB += iB * b2CrossVV(vcp.rB, P);
			}

			// Solve normal constraints
			if (vc.pointCount == 1)
			{
				vcp = vc.points[0];

				// Relative velocity at contact
				//b2Vec2 dv = vB + b2Cross(wB, vcp->rB) - vA - b2Cross(wA, vcp->rA);
				b2SubVV(
					b2AddVCrossSV(vB, wB, vcp.rB, b2Vec2.s_t0),
					b2AddVCrossSV(vA, wA, vcp.rA, b2Vec2.s_t1),
					dv);

				// Compute normal impulse
				//float32 vn = b2Dot(dv, normal);
				vn = b2DotVV(dv, normal);
				lambda = (-vcp.normalMass * (vn - vcp.velocityBias));

				// b2Clamp the accumulated impulse
				//float32 newImpulse = b2Max(vcp->normalImpulse + lambda, 0.0f);
				newImpulse = b2Max(vcp.normalImpulse + lambda, 0);
				lambda = newImpulse - vcp.normalImpulse;
				vcp.normalImpulse = newImpulse;

				// Apply contact impulse
				//b2Vec2 P = lambda * normal;
				b2MulSV(lambda, normal, P);
				//vA -= mA * P;
				vA.SelfMulSub(mA, P);
				//wA -= iA * b2Cross(vcp->rA, P);
				wA -= iA * b2CrossVV(vcp.rA, P);

				//vB += mB * P;
				vB.SelfMulAdd(mB, P);
				//wB += iB * b2Cross(vcp->rB, P);
				wB += iB * b2CrossVV(vcp.rB, P);
			}
			else
			{
				// Block solver developed in collaboration with Dirk Gregorius (back in 01/07 on Box2D_Lite).
				// Build the mini LCP for this contact patch
				//
				// vn = A * x + b, vn >= 0, , vn >= 0, x >= 0 and vn_i * x_i = 0 with i = 1..2
				//
				// A = J * W * JT and J = ( -n, -r1 x n, n, r2 x n )
				// b = vn0 - velocityBias
				//
				// The system is solved using the "Total enumeration method" (s. Murty). The complementary constraint vn_i * x_i
				// implies that we must have in any solution either vn_i = 0 or x_i = 0. So for the 2D contact problem the cases
				// vn1 = 0 and vn2 = 0, x1 = 0 and x2 = 0, x1 = 0 and vn2 = 0, x2 = 0 and vn1 = 0 need to be tested. The first valid
				// solution that satisfies the problem is chosen.
				//
				// In order to account of the accumulated impulse 'a' (because of the iterative nature of the solver which only requires
				// that the accumulated impulse is clamped and not the incremental impulse) we change the impulse variable (x_i).
				//
				// Substitute:
				//
				// x = a + d
				//
				// a := old total impulse
				// x := new total impulse
				// d := incremental impulse
				//
				// For the current iteration we extend the formula for the incremental impulse
				// to compute the new total impulse:
				//
				// vn = A * d + b
				//    = A * (x - a) + b
				//    = A * x + b - A * a
				//    = A * x + b'
				// b' = b - A * a;

				cp1 = vc.points[0];
				cp2 = vc.points[1];

				//b2Vec2 a(cp1->normalImpulse, cp2->normalImpulse);
				a.SetXY(cp1.normalImpulse, cp2.normalImpulse);
				if (ENABLE_ASSERTS) { b2Assert(a.x >= 0 && a.y >= 0); }

				// Relative velocity at contact
				//b2Vec2 dv1 = vB + b2Cross(wB, cp1->rB) - vA - b2Cross(wA, cp1->rA);
				b2SubVV(
					b2AddVCrossSV(vB, wB, cp1.rB, b2Vec2.s_t0),
					b2AddVCrossSV(vA, wA, cp1.rA, b2Vec2.s_t1),
					dv1);
				//b2Vec2 dv2 = vB + b2Cross(wB, cp2->rB) - vA - b2Cross(wA, cp2->rA);
				b2SubVV(
					b2AddVCrossSV(vB, wB, cp2.rB, b2Vec2.s_t0),
					b2AddVCrossSV(vA, wA, cp2.rA, b2Vec2.s_t1),
					dv2);

				// Compute normal velocity
				//float32 vn1 = b2Dot(dv1, normal);
				vn1 = b2DotVV(dv1, normal);
				//float32 vn2 = b2Dot(dv2, normal);
				vn2 = b2DotVV(dv2, normal);

				//b2Vec2 b;
				b.x = vn1 - cp1.velocityBias;
				b.y = vn2 - cp2.velocityBias;

				// Compute b'
				//b -= b2Mul(vc->K, a);
				b.SelfSub(b2MulMV(vc.K, a, b2Vec2.s_t0));

				/*
				#if B2_DEBUG_SOLVER == 1
				var k_errorTol: number = 0.001;
				#endif
				*/

				for (;;)
				{
					//
					// Case 1: vn = 0
					//
					// 0 = A * x + b'
					//
					// Solve for x:
					//
					// x = - inv(A) * b'
					//
					//b2Vec2 x = - b2Mul(vc->normalMass, b);
					b2MulMV(vc.normalMass, b, x).SelfNeg();

					if (x.x >= 0 && x.y >= 0)
					{
						// Get the incremental impulse
						//b2Vec2 d = x - a;
						b2SubVV(x, a, d);

						// Apply incremental impulse
						//b2Vec2 P1 = d.x * normal;
						b2MulSV(d.x, normal, P1);
						//b2Vec2 P2 = d.y * normal;
						b2MulSV(d.y, normal, P2);
						b2AddVV(P1, P2, P1P2);
						//vA -= mA * (P1 + P2);
						vA.SelfMulSub(mA, P1P2);
						//wA -= iA * (b2Cross(cp1->rA, P1) + b2Cross(cp2->rA, P2));
						wA -= iA * (b2CrossVV(cp1.rA, P1) + b2CrossVV(cp2.rA, P2));

						//vB += mB * (P1 + P2);
						vB.SelfMulAdd(mB, P1P2);
						//wB += iB * (b2Cross(cp1->rB, P1) + b2Cross(cp2->rB, P2));
						wB += iB * (b2CrossVV(cp1.rB, P1) + b2CrossVV(cp2.rB, P2));

						// Accumulate
						cp1.normalImpulse = x.x;
						cp2.normalImpulse = x.y;

						/*
						#if B2_DEBUG_SOLVER == 1
						// Postconditions
						dv1 = vB + b2Cross(wB, cp1->rB) - vA - b2Cross(wA, cp1->rA);
						dv2 = vB + b2Cross(wB, cp2->rB) - vA - b2Cross(wA, cp2->rA);

						// Compute normal velocity
						vn1 = b2Dot(dv1, normal);
						vn2 = b2Dot(dv2, normal);

						if (ENABLE_ASSERTS) { b2Assert(b2Abs(vn1 - cp1->velocityBias) < k_errorTol); }
						if (ENABLE_ASSERTS) { b2Assert(b2Abs(vn2 - cp2->velocityBias) < k_errorTol); }
						#endif
						*/
						break;
					}

					//
					// Case 2: vn1 = 0 and x2 = 0
					//
					//   0 = a11 * x1 + a12 * 0 + b1'
					// vn2 = a21 * x1 + a22 * 0 + b2'
					//
					x.x = (-cp1.normalMass * b.x);
					x.y = 0;
					vn1 = 0;
					vn2 = vc.K.ex.y * x.x + b.y;

					if (x.x >= 0 && vn2 >= 0)
					{
						// Get the incremental impulse
						//b2Vec2 d = x - a;
						b2SubVV(x, a, d);

						// Apply incremental impulse
						//b2Vec2 P1 = d.x * normal;
						b2MulSV(d.x, normal, P1);
						//b2Vec2 P2 = d.y * normal;
						b2MulSV(d.y, normal, P2);
						b2AddVV(P1, P2, P1P2);
						//vA -= mA * (P1 + P2);
						vA.SelfMulSub(mA, P1P2);
						//wA -= iA * (b2Cross(cp1->rA, P1) + b2Cross(cp2->rA, P2));
						wA -= iA * (b2CrossVV(cp1.rA, P1) + b2CrossVV(cp2.rA, P2));

						//vB += mB * (P1 + P2);
						vB.SelfMulAdd(mB, P1P2);
						//wB += iB * (b2Cross(cp1->rB, P1) + b2Cross(cp2->rB, P2));
						wB += iB * (b2CrossVV(cp1.rB, P1) + b2CrossVV(cp2.rB, P2));

						// Accumulate
						cp1.normalImpulse = x.x;
						cp2.normalImpulse = x.y;

						/*
						#if B2_DEBUG_SOLVER == 1
						// Postconditions
						dv1 = vB + b2Cross(wB, cp1->rB) - vA - b2Cross(wA, cp1->rA);

						// Compute normal velocity
						vn1 = b2Dot(dv1, normal);

						if (ENABLE_ASSERTS) { b2Assert(b2Abs(vn1 - cp1->velocityBias) < k_errorTol); }
						#endif
						*/
						break;
					}


					//
					// Case 3: vn2 = 0 and x1 = 0
					//
					// vn1 = a11 * 0 + a12 * x2 + b1'
					//   0 = a21 * 0 + a22 * x2 + b2'
					//
					x.x = 0;
					x.y = (-cp2.normalMass * b.y);
					vn1 = vc.K.ey.x * x.y + b.x;
					vn2 = 0;

					if (x.y >= 0 && vn1 >= 0)
					{
						// Resubstitute for the incremental impulse
						//b2Vec2 d = x - a;
						b2SubVV(x, a, d);

						// Apply incremental impulse
						//b2Vec2 P1 = d.x * normal;
						b2MulSV(d.x, normal, P1);
						//b2Vec2 P2 = d.y * normal;
						b2MulSV(d.y, normal, P2);
						b2AddVV(P1, P2, P1P2);
						//vA -= mA * (P1 + P2);
						vA.SelfMulSub(mA, P1P2);
						//wA -= iA * (b2Cross(cp1->rA, P1) + b2Cross(cp2->rA, P2));
						wA -= iA * (b2CrossVV(cp1.rA, P1) + b2CrossVV(cp2.rA, P2));

						//vB += mB * (P1 + P2);
						vB.SelfMulAdd(mB, P1P2);
						//wB += iB * (b2Cross(cp1->rB, P1) + b2Cross(cp2->rB, P2));
						wB += iB * (b2CrossVV(cp1.rB, P1) + b2CrossVV(cp2.rB, P2));

						// Accumulate
						cp1.normalImpulse = x.x;
						cp2.normalImpulse = x.y;

						/*
						#if B2_DEBUG_SOLVER == 1
						// Postconditions
						dv2 = vB + b2Cross(wB, cp2->rB) - vA - b2Cross(wA, cp2->rA);

						// Compute normal velocity
						vn2 = b2Dot(dv2, normal);

						if (ENABLE_ASSERTS) { b2Assert(b2Abs(vn2 - cp2->velocityBias) < k_errorTol); }
						#endif
						*/
						break;
					}

					//
					// Case 4: x1 = 0 and x2 = 0
					//
					// vn1 = b1
					// vn2 = b2;
					x.x = 0;
					x.y = 0;
					vn1 = b.x;
					vn2 = b.y;

					if (vn1 >= 0 && vn2 >= 0)
					{
						// Resubstitute for the incremental impulse
						//b2Vec2 d = x - a;
						b2SubVV(x, a, d);

						// Apply incremental impulse
						//b2Vec2 P1 = d.x * normal;
						b2MulSV(d.x, normal, P1);
						//b2Vec2 P2 = d.y * normal;
						b2MulSV(d.y, normal, P2);
						b2AddVV(P1, P2, P1P2);
						//vA -= mA * (P1 + P2);
						vA.SelfMulSub(mA, P1P2);
						//wA -= iA * (b2Cross(cp1->rA, P1) + b2Cross(cp2->rA, P2));
						wA -= iA * (b2CrossVV(cp1.rA, P1) + b2CrossVV(cp2.rA, P2));

						//vB += mB * (P1 + P2);
						vB.SelfMulAdd(mB, P1P2);
						//wB += iB * (b2Cross(cp1->rB, P1) + b2Cross(cp2->rB, P2));
						wB += iB * (b2CrossVV(cp1.rB, P1) + b2CrossVV(cp2.rB, P2));

						// Accumulate
						cp1.normalImpulse = x.x;
						cp2.normalImpulse = x.y;

						break;
					}

					// No solution, give up. This is hit sometimes, but it doesn't seem to matter.
					break;
				}
			}

			//this.m_velocities[indexA].v = vA;
			this.m_velocities[indexA].w = wA;
			//this.m_velocities[indexB].v = vB;
			this.m_velocities[indexB].w = wB;
		}
	}

	public StoreImpulses()
	{
		var i: number;
		var ict: number;
		var j: number;
		var jct: number;

		var vc: b2ContactVelocityConstraint;
		var manifold: b2Manifold;

		for (i = 0, ict = this.m_count; i < ict; ++i)
		{
			vc = this.m_velocityConstraints[i];
			manifold = this.m_contacts[vc.contactIndex].GetManifold();

			for (j = 0, jct = vc.pointCount; j < jct; ++j)
			{
				manifold.points[j].normalImpulse = vc.points[j].normalImpulse;
				manifold.points[j].tangentImpulse = vc.points[j].tangentImpulse;
			}
		}
	}

	private static SolvePositionConstraints_s_xfA = new b2Transform();
	private static SolvePositionConstraints_s_xfB = new b2Transform();
	private static SolvePositionConstraints_s_psm = new b2PositionSolverManifold();
	private static SolvePositionConstraints_s_rA = new b2Vec2();
	private static SolvePositionConstraints_s_rB = new b2Vec2();
	private static SolvePositionConstraints_s_P = new b2Vec2();
	public SolvePositionConstraints()
	{
		var i: number;
		var ict: number;
		var j: number;
		var jct: number;

		var pc: b2ContactPositionConstraint;

		var indexA: number;
		var indexB: number;
		var localCenterA: b2Vec2;
		var mA: number;
		var iA: number;
		var localCenterB: b2Vec2;
		var mB: number;
		var iB: number;
		var pointCount: number;

		var cA: b2Vec2;
		var aA: number;

		var cB: b2Vec2;
		var aB: number;

		var xfA: b2Transform = b2ContactSolver.SolvePositionConstraints_s_xfA;
		var xfB: b2Transform = b2ContactSolver.SolvePositionConstraints_s_xfB;

		var psm: b2PositionSolverManifold = b2ContactSolver.SolvePositionConstraints_s_psm;

		var normal: b2Vec2;
		var point: b2Vec2;
		var separation: number;

		var rA: b2Vec2 = b2ContactSolver.SolvePositionConstraints_s_rA;
		var rB: b2Vec2 = b2ContactSolver.SolvePositionConstraints_s_rB;

		var C: number;
		var rnA: number;
		var rnB: number;
		var K: number;
		var impulse: number;
		var P: b2Vec2 = b2ContactSolver.SolvePositionConstraints_s_P;

		var minSeparation: number = 0;

		for (i = 0, ict = this.m_count; i < ict; ++i)
		{
			pc = this.m_positionConstraints[i];

			indexA = pc.indexA;
			indexB = pc.indexB;
			localCenterA = pc.localCenterA;
			mA = pc.invMassA;
			iA = pc.invIA;
			localCenterB = pc.localCenterB;
			mB = pc.invMassB;
			iB = pc.invIB;
			pointCount = pc.pointCount;

			cA = this.m_positions[indexA].c;
			aA = this.m_positions[indexA].a;

			cB = this.m_positions[indexB].c;
			aB = this.m_positions[indexB].a;

			// Solve normal constraints
			for (j = 0, jct = pointCount; j < jct; ++j)
			{
				xfA.q.SetAngleRadians(aA);
				xfB.q.SetAngleRadians(aB);
				b2SubVV(cA, b2MulRV(xfA.q, localCenterA, b2Vec2.s_t0), xfA.p);
				b2SubVV(cB, b2MulRV(xfB.q, localCenterB, b2Vec2.s_t0), xfB.p);

				psm.Initialize(pc, xfA, xfB, j);
				normal = psm.normal;

				point = psm.point;
				separation = psm.separation;

				//b2Vec2 rA = point - cA;
				b2SubVV(point, cA, rA);
				//b2Vec2 rB = point - cB;
				b2SubVV(point, cB, rB);

				// Track max constraint error.
				minSeparation = b2Min(minSeparation, separation);

				// Prevent large corrections and allow slop.
				C = b2Clamp(b2_baumgarte * (separation + b2_linearSlop), (-b2_maxLinearCorrection), 0);

				// Compute the effective mass.
				//float32 rnA = b2Cross(rA, normal);
				rnA = b2CrossVV(rA, normal);
				//float32 rnB = b2Cross(rB, normal);
				rnB = b2CrossVV(rB, normal);
				//float32 K = mA + mB + iA * rnA * rnA + iB * rnB * rnB;
				K = mA + mB + iA * rnA * rnA + iB * rnB * rnB;

				// Compute normal impulse
				impulse = K > 0 ? - C / K : 0;

				//b2Vec2 P = impulse * normal;
				b2MulSV(impulse, normal, P);

				//cA -= mA * P;
				cA.SelfMulSub(mA, P);
				//aA -= iA * b2Cross(rA, P);
				aA -= iA * b2CrossVV(rA, P);

				//cB += mB * P;
				cB.SelfMulAdd(mB, P);
				//aB += iB * b2Cross(rB, P);
				aB += iB * b2CrossVV(rB, P);
			}

			//this.m_positions[indexA].c = cA;
			this.m_positions[indexA].a = aA;

			//this.m_positions[indexB].c = cB;
			this.m_positions[indexB].a = aB;
		}

		// We can't expect minSpeparation >= -b2_linearSlop because we don't
		// push the separation above -b2_linearSlop.
		return minSeparation > (-3 * b2_linearSlop);
	}

	private static SolveTOIPositionConstraints_s_xfA = new b2Transform();
	private static SolveTOIPositionConstraints_s_xfB = new b2Transform();
	private static SolveTOIPositionConstraints_s_psm = new b2PositionSolverManifold();
	private static SolveTOIPositionConstraints_s_rA = new b2Vec2();
	private static SolveTOIPositionConstraints_s_rB = new b2Vec2();
	private static SolveTOIPositionConstraints_s_P = new b2Vec2();
	public SolveTOIPositionConstraints(toiIndexA, toiIndexB)
	{
		var i: number;
		var ict: number;
		var j: number;
		var jct: number;

		var pc: b2ContactPositionConstraint;

		var indexA: number;
		var indexB: number;
		var localCenterA: b2Vec2;
		var localCenterB: b2Vec2;
		var pointCount: number;

		var mA: number;
		var iA: number;

		var mB: number;
		var iB: number;

		var cA: b2Vec2;
		var aA: number;

		var cB: b2Vec2;
		var aB: number;

		var xfA: b2Transform = b2ContactSolver.SolveTOIPositionConstraints_s_xfA;
		var xfB: b2Transform = b2ContactSolver.SolveTOIPositionConstraints_s_xfB;

		var psm: b2PositionSolverManifold = b2ContactSolver.SolveTOIPositionConstraints_s_psm;
		var normal: b2Vec2;
		var point: b2Vec2;
		var separation: number;
		var rA: b2Vec2 = b2ContactSolver.SolveTOIPositionConstraints_s_rA;
		var rB: b2Vec2 = b2ContactSolver.SolveTOIPositionConstraints_s_rB;
		var C: number;
		var rnA: number;
		var rnB: number;
		var K: number;
		var impulse: number;
		var P: b2Vec2 = b2ContactSolver.SolveTOIPositionConstraints_s_P;

		var minSeparation: number = 0;

		for (i = 0, ict = this.m_count; i < ict; ++i)
		{
			pc = this.m_positionConstraints[i];

			indexA = pc.indexA;
			indexB = pc.indexB;
			localCenterA = pc.localCenterA;
			localCenterB = pc.localCenterB;
			pointCount = pc.pointCount;

			mA = 0;
			iA = 0;
			if (indexA == toiIndexA || indexA == toiIndexB)
			{
				mA = pc.invMassA;
				iA = pc.invIA;
			}

			mB = 0;
			iB = 0;
			if (indexB == toiIndexA || indexB == toiIndexB)
			{
				mB = pc.invMassB;
				iB = pc.invIB;
			}

			cA = this.m_positions[indexA].c;
			aA = this.m_positions[indexA].a;

			cB = this.m_positions[indexB].c;
			aB = this.m_positions[indexB].a;

			// Solve normal constraints
			for (j = 0, jct = pointCount; j < jct; ++j)
			{
				xfA.q.SetAngleRadians(aA);
				xfB.q.SetAngleRadians(aB);
				b2SubVV(cA, b2MulRV(xfA.q, localCenterA, b2Vec2.s_t0), xfA.p);
				b2SubVV(cB, b2MulRV(xfB.q, localCenterB, b2Vec2.s_t0), xfB.p);

				psm.Initialize(pc, xfA, xfB, j);
				normal = psm.normal;

				point = psm.point;
				separation = psm.separation;

				//b2Vec2 rA = point - cA;
				b2SubVV(point, cA, rA);
				//b2Vec2 rB = point - cB;
				b2SubVV(point, cB, rB);

				// Track max constraint error.
				minSeparation = b2Min(minSeparation, separation);

				// Prevent large corrections and allow slop.
				C = b2Clamp(b2_toiBaumgarte * (separation + b2_linearSlop), (-b2_maxLinearCorrection), 0);

				// Compute the effective mass.
				//float32 rnA = b2Cross(rA, normal);
				rnA = b2CrossVV(rA, normal);
				//float32 rnB = b2Cross(rB, normal);
				rnB = b2CrossVV(rB, normal);
				//float32 K = mA + mB + iA * rnA * rnA + iB * rnB * rnB;
				K = mA + mB + iA * rnA * rnA + iB * rnB * rnB;

				// Compute normal impulse
				impulse = K > 0 ? - C / K : 0;

				//b2Vec2 P = impulse * normal;
				b2MulSV(impulse, normal, P);

				//cA -= mA * P;
				cA.SelfMulSub(mA, P);
				//aA -= iA * b2Cross(rA, P);
				aA -= iA * b2CrossVV(rA, P);

				//cB += mB * P;
				cB.SelfMulAdd(mB, P);
				//aB += iB * b2Cross(rB, P);
				aB += iB * b2CrossVV(rB, P);
			}

			//this.m_positions[indexA].c = cA;
			this.m_positions[indexA].a = aA;

			//this.m_positions[indexB].c = cB;
			this.m_positions[indexB].a = aB;
		}

		// We can't expect minSpeparation >= -b2_linearSlop because we don't
		// push the separation above -b2_linearSlop.
		return minSeparation >= -1.5 * b2_linearSlop;
	}
}


