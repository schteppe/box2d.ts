/*
* Copyright (c) 2006-2011 Erin Catto http://www.box2d.org
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

import {b2MulTXV, b2AddVCrossSV, b2Vec2, b2AddVV, b2CrossVV, b2SubVV, b2IsValid, b2Mat22, b2MulMV, b2MulRV, b2MulSV, b2Rot, b2DotVV, b2Min, b2Clamp} from '../../Common/b2Math';
import {ENABLE_ASSERTS, b2Assert, DEBUG, b2Log, b2_epsilon, b2_pi, b2_linearSlop, b2_maxLinearCorrection} from '../../Common/b2Settings';
import {b2Joint, b2JointDef, b2JointType, b2LimitState} from '../../Dynamics/Joints/b2Joint';

/// Rope joint definition. This requires two body anchor points and
/// a maximum lengths.
/// Note: by default the connected objects will not collide.
/// see collideConnected in b2JointDef.
export class b2RopeJointDef extends b2JointDef
{
	public localAnchorA: b2Vec2 = new b2Vec2(-1, 0);

	public localAnchorB: b2Vec2 = new b2Vec2(1, 0);

	public maxLength: number = 0;

	constructor()
	{
		super(b2JointType.e_ropeJoint); // base class constructor
	}
}

export class b2RopeJoint extends b2Joint
{
	// Solver shared
	public m_localAnchorA: b2Vec2 = new b2Vec2();
	public m_localAnchorB: b2Vec2 = new b2Vec2();
	public m_maxLength: number = 0;
	public m_length: number = 0;
	public m_impulse: number = 0;

	// Solver temp
	public m_indexA: number = 0;
	public m_indexB: number = 0;
	public m_u: b2Vec2 = new b2Vec2();
	public m_rA: b2Vec2 = new b2Vec2();
	public m_rB: b2Vec2 = new b2Vec2();
	public m_localCenterA: b2Vec2 = new b2Vec2();
	public m_localCenterB: b2Vec2 = new b2Vec2();
	public m_invMassA: number = 0;
	public m_invMassB: number = 0;
	public m_invIA: number = 0;
	public m_invIB: number = 0;
	public m_mass: number = 0;
	public m_state = b2LimitState.e_inactiveLimit;

	public m_qA: b2Rot = new b2Rot();
	public m_qB: b2Rot = new b2Rot();
	public m_lalcA: b2Vec2 = new b2Vec2();
	public m_lalcB: b2Vec2 = new b2Vec2();

	constructor(def)
	{
		super(def); // base class constructor

		this.m_localAnchorA = def.localAnchorA.Clone();
		this.m_localAnchorB = def.localAnchorB.Clone();
		this.m_maxLength = def.maxLength;
	}

	private static InitVelocityConstraints_s_P = new b2Vec2();
	public InitVelocityConstraints(data)
	{
		this.m_indexA = this.m_bodyA.m_islandIndex;
		this.m_indexB = this.m_bodyB.m_islandIndex;
		this.m_localCenterA.Copy(this.m_bodyA.m_sweep.localCenter);
		this.m_localCenterB.Copy(this.m_bodyB.m_sweep.localCenter);
		this.m_invMassA = this.m_bodyA.m_invMass;
		this.m_invMassB = this.m_bodyB.m_invMass;
		this.m_invIA = this.m_bodyA.m_invI;
		this.m_invIB = this.m_bodyB.m_invI;

		var cA: b2Vec2 = data.positions[this.m_indexA].c;
		var aA: number = data.positions[this.m_indexA].a;
		var vA: b2Vec2 = data.velocities[this.m_indexA].v;
		var wA: number = data.velocities[this.m_indexA].w;

		var cB: b2Vec2 = data.positions[this.m_indexB].c;
		var aB: number = data.positions[this.m_indexB].a;
		var vB: b2Vec2 = data.velocities[this.m_indexB].v;
		var wB: number = data.velocities[this.m_indexB].w;

		var qA: b2Rot = this.m_qA.SetAngleRadians(aA), qB: b2Rot = this.m_qB.SetAngleRadians(aB);

		//this.m_rA = b2Mul(qA, this.m_localAnchorA - this.m_localCenterA);
		b2SubVV(this.m_localAnchorA, this.m_localCenterA, this.m_lalcA);
		b2MulRV(qA, this.m_lalcA, this.m_rA);
		//this.m_rB = b2Mul(qB, this.m_localAnchorB - this.m_localCenterB);
		b2SubVV(this.m_localAnchorB, this.m_localCenterB, this.m_lalcB);
		b2MulRV(qB, this.m_lalcB, this.m_rB);
		//this.m_u = cB + this.m_rB - cA - this.m_rA;
		this.m_u.Copy(cB).SelfAdd(this.m_rB).SelfSub(cA).SelfSub(this.m_rA);

		this.m_length = this.m_u.GetLength();

		var C: number = this.m_length - this.m_maxLength;
		if (C > 0)
		{
			this.m_state = b2LimitState.e_atUpperLimit;
		}
		else
		{
			this.m_state = b2LimitState.e_inactiveLimit;
		}

		if (this.m_length > b2_linearSlop)
		{
			this.m_u.SelfMul(1 / this.m_length);
		}
		else
		{
			this.m_u.SetZero();
			this.m_mass = 0;
			this.m_impulse = 0;
			return;
		}

		// Compute effective mass.
		var crA: number = b2CrossVV(this.m_rA, this.m_u);
		var crB: number = b2CrossVV(this.m_rB, this.m_u);
		var invMass: number = this.m_invMassA + this.m_invIA * crA * crA + this.m_invMassB + this.m_invIB * crB * crB;

		this.m_mass = invMass != 0 ? 1 / invMass : 0;

		if (data.step.warmStarting)
		{
			// Scale the impulse to support a variable time step.
			this.m_impulse *= data.step.dtRatio;

			//b2Vec2 P = m_impulse * m_u;
			var P: b2Vec2 = b2MulSV(this.m_impulse, this.m_u, b2RopeJoint.InitVelocityConstraints_s_P);
			//vA -= m_invMassA * P;
			vA.SelfMulSub(this.m_invMassA, P);
			wA -= this.m_invIA * b2CrossVV(this.m_rA, P);
			//vB += m_invMassB * P;
			vB.SelfMulAdd(this.m_invMassB, P);
			wB += this.m_invIB * b2CrossVV(this.m_rB, P);
		}
		else
		{
			this.m_impulse = 0;
		}

		//data.velocities[this.m_indexA].v = vA;
		data.velocities[this.m_indexA].w = wA;
		//data.velocities[this.m_indexB].v = vB;
		data.velocities[this.m_indexB].w = wB;
	}

	private static SolveVelocityConstraints_s_vpA = new b2Vec2();
	private static SolveVelocityConstraints_s_vpB = new b2Vec2();
	private static SolveVelocityConstraints_s_P = new b2Vec2();
	public SolveVelocityConstraints(data)
	{
		var vA: b2Vec2 = data.velocities[this.m_indexA].v;
		var wA: number = data.velocities[this.m_indexA].w;
		var vB: b2Vec2 = data.velocities[this.m_indexB].v;
		var wB: number = data.velocities[this.m_indexB].w;

		// Cdot = dot(u, v + cross(w, r))
		//b2Vec2 vpA = vA + b2Cross(wA, m_rA);
		var vpA: b2Vec2 = b2AddVCrossSV(vA, wA, this.m_rA, b2RopeJoint.SolveVelocityConstraints_s_vpA);
		//b2Vec2 vpB = vB + b2Cross(wB, m_rB);
		var vpB: b2Vec2 = b2AddVCrossSV(vB, wB, this.m_rB, b2RopeJoint.SolveVelocityConstraints_s_vpB);
		//float32 C = m_length - m_maxLength;
		var C: number = this.m_length - this.m_maxLength;
		//float32 Cdot = b2Dot(m_u, vpB - vpA);
		var Cdot: number = b2DotVV(this.m_u, b2SubVV(vpB, vpA, b2Vec2.s_t0));

		// Predictive constraint.
		if (C < 0)
		{
			Cdot += data.step.inv_dt * C;
		}

		var impulse: number = -this.m_mass * Cdot;
		var oldImpulse: number = this.m_impulse;
		this.m_impulse = b2Min(0, this.m_impulse + impulse);
		impulse = this.m_impulse - oldImpulse;

		//b2Vec2 P = impulse * m_u;
		var P: b2Vec2 = b2MulSV(impulse, this.m_u, b2RopeJoint.SolveVelocityConstraints_s_P);
		//vA -= m_invMassA * P;
		vA.SelfMulSub(this.m_invMassA, P);
		wA -= this.m_invIA * b2CrossVV(this.m_rA, P);
		//vB += m_invMassB * P;
		vB.SelfMulAdd(this.m_invMassB, P);
		wB += this.m_invIB * b2CrossVV(this.m_rB, P);

		//data.velocities[this.m_indexA].v = vA;
		data.velocities[this.m_indexA].w = wA;
		//data.velocities[this.m_indexB].v = vB;
		data.velocities[this.m_indexB].w = wB;
	}

	private static SolvePositionConstraints_s_P = new b2Vec2();
	public SolvePositionConstraints(data)
	{
		var cA: b2Vec2 = data.positions[this.m_indexA].c;
		var aA: number = data.positions[this.m_indexA].a;
		var cB: b2Vec2 = data.positions[this.m_indexB].c;
		var aB: number = data.positions[this.m_indexB].a;

		var qA: b2Rot = this.m_qA.SetAngleRadians(aA), qB: b2Rot = this.m_qB.SetAngleRadians(aB);

		//b2Vec2 rA = b2Mul(qA, this.m_localAnchorA - this.m_localCenterA);
		b2SubVV(this.m_localAnchorA, this.m_localCenterA, this.m_lalcA);
		var rA: b2Vec2 = b2MulRV(qA, this.m_lalcA, this.m_rA);
		//b2Vec2 rB = b2Mul(qB, this.m_localAnchorB - this.m_localCenterB);
		b2SubVV(this.m_localAnchorB, this.m_localCenterB, this.m_lalcB);
		var rB: b2Vec2 = b2MulRV(qB, this.m_lalcB, this.m_rB);
		//b2Vec2 u = cB + rB - cA - rA;
		var u: b2Vec2 = this.m_u.Copy(cB).SelfAdd(rB).SelfSub(cA).SelfSub(rA);

		var length: number = u.Normalize();
		var C: number = length - this.m_maxLength;

		C = b2Clamp(C, 0, b2_maxLinearCorrection);

		var impulse: number = -this.m_mass * C;
		//b2Vec2 P = impulse * u;
		var P: b2Vec2 = b2MulSV(impulse, u, b2RopeJoint.SolvePositionConstraints_s_P);

		//cA -= m_invMassA * P;
		cA.SelfMulSub(this.m_invMassA, P);
		aA -= this.m_invIA * b2CrossVV(rA, P);
		//cB += m_invMassB * P;
		cB.SelfMulAdd(this.m_invMassB, P);
		aB += this.m_invIB * b2CrossVV(rB, P);

		//data.positions[this.m_indexA].c = cA;
		data.positions[this.m_indexA].a = aA;
		//data.positions[this.m_indexB].c = cB;
		data.positions[this.m_indexB].a = aB;

		return length - this.m_maxLength < b2_linearSlop;
	}

	public GetAnchorA(out: b2Vec2): b2Vec2
	{
		return this.m_bodyA.GetWorldPoint(this.m_localAnchorA, out);
	}

	public GetAnchorB(out: b2Vec2): b2Vec2
	{
		return this.m_bodyB.GetWorldPoint(this.m_localAnchorB, out);
	}

	public GetReactionForce(inv_dt: number, out: b2Vec2): b2Vec2
	{
		var F: b2Vec2 = b2MulSV((inv_dt * this.m_impulse), this.m_u, out);
		return F;
		//return out.SetXY(inv_dt * this.m_linearImpulse.x, inv_dt * this.m_linearImpulse.y);
	}

	public GetReactionTorque(inv_dt: number): number
	{
		return 0;
	}

	public GetLocalAnchorA(): b2Vec2 { return this.m_localAnchorA; }

	public GetLocalAnchorB(): b2Vec2 { return this.m_localAnchorB; }

	public SetMaxLength(length: number): void { this.m_maxLength = length; }
	public GetMaxLength(): number
	{
		return this.m_maxLength;
	}

	public GetLimitState(): b2LimitState
	{
		return this.m_state;
	}

	public Dump(): void
	{
		if (DEBUG)
		{
			var indexA = this.m_bodyA.m_islandIndex;
			var indexB = this.m_bodyB.m_islandIndex;

			b2Log("  var jd: b2RopeJointDef = new b2RopeJointDef();\n");
			b2Log("  jd.bodyA = bodies[%d];\n", indexA);
			b2Log("  jd.bodyB = bodies[%d];\n", indexB);
			b2Log("  jd.collideConnected = %s;\n", (this.m_collideConnected)?('true'):('false'));
			b2Log("  jd.localAnchorA.SetXY(%.15f, %.15f);\n", this.m_localAnchorA.x, this.m_localAnchorA.y);
			b2Log("  jd.localAnchorB.SetXY(%.15f, %.15f);\n", this.m_localAnchorB.x, this.m_localAnchorB.y);
			b2Log("  jd.maxLength = %.15f;\n", this.m_maxLength);
			b2Log("  joints[%d] = this.m_world.CreateJoint(jd);\n", this.m_index);
		}
	}
}



