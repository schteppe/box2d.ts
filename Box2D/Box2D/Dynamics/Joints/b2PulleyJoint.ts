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

import {b2DistanceVV, b2DotVV, b2AddVCrossSV, b2Vec2, b2Abs, b2CrossVV, b2SubVV, b2MulRV, b2MulSV, b2Rot} from '../../Common/b2Math';
import {ENABLE_ASSERTS, b2Assert, DEBUG, b2Log, b2_epsilon, b2_linearSlop} from '../../Common/b2Settings';
import {b2Joint, b2JointDef, b2JointType} from '../../Dynamics/Joints/b2Joint';

export var b2_minPulleyLength: number = 2;

/// Pulley joint definition. This requires two ground anchors,
/// two dynamic body anchor points, and a pulley ratio.
export class b2PulleyJointDef extends b2JointDef
{
	public groundAnchorA: b2Vec2 = new b2Vec2(-1, 1);

	public groundAnchorB: b2Vec2 = new b2Vec2(1, 1);

	public localAnchorA: b2Vec2 = new b2Vec2(-1, 0);

	public localAnchorB: b2Vec2 = new b2Vec2(1, 0);

	public lengthA: number = 0;

	public lengthB: number = 0;

	public ratio: number = 1;

	constructor()
	{
		super(b2JointType.e_pulleyJoint); // base class constructor
		this.collideConnected = true;
	}

	public Initialize(bA, bB, groundA, groundB, anchorA, anchorB, r)
	{
		this.bodyA = bA;
		this.bodyB = bB;
		this.groundAnchorA.Copy(groundA);
		this.groundAnchorB.Copy(groundB);
		this.bodyA.GetLocalPoint(anchorA, this.localAnchorA);
		this.bodyB.GetLocalPoint(anchorB, this.localAnchorB);
		this.lengthA = b2DistanceVV(anchorA, groundA);
		this.lengthB = b2DistanceVV(anchorB, groundB);
		this.ratio = r;
		if (ENABLE_ASSERTS) { b2Assert(this.ratio > b2_epsilon); }
	}
}

export class b2PulleyJoint extends b2Joint
{
	public m_groundAnchorA: b2Vec2 = new b2Vec2();
	public m_groundAnchorB: b2Vec2 = new b2Vec2();

	public m_lengthA: number = 0;
	public m_lengthB: number = 0;

	// Solver shared
	public m_localAnchorA: b2Vec2 = new b2Vec2();
	public m_localAnchorB: b2Vec2 = new b2Vec2();

	public m_constant: number = 0;
	public m_ratio: number = 0;
	public m_impulse: number = 0;

	// Solver temp
	public m_indexA: number = 0;
	public m_indexB: number = 0;
	public m_uA: b2Vec2 = new b2Vec2();
	public m_uB: b2Vec2 = new b2Vec2();
	public m_rA: b2Vec2 = new b2Vec2();
	public m_rB: b2Vec2 = new b2Vec2();
	public m_localCenterA: b2Vec2 = new b2Vec2();
	public m_localCenterB: b2Vec2 = new b2Vec2();

	public m_invMassA: number = 0;
	public m_invMassB: number = 0;
	public m_invIA: number = 0;
	public m_invIB: number = 0;
	public m_mass: number = 0;

	public m_qA: b2Rot = new b2Rot();
	public m_qB: b2Rot = new b2Rot();
	public m_lalcA: b2Vec2 = new b2Vec2();
	public m_lalcB: b2Vec2 = new b2Vec2();

	constructor(def)
	{
		super(def); // base class constructor

		this.m_groundAnchorA.Copy(def.groundAnchorA);
		this.m_groundAnchorB.Copy(def.groundAnchorB);
		this.m_localAnchorA.Copy(def.localAnchorA);
		this.m_localAnchorB.Copy(def.localAnchorB);

		this.m_lengthA = def.lengthA;
		this.m_lengthB = def.lengthB;

		if (ENABLE_ASSERTS) { b2Assert(def.ratio != 0); }
		this.m_ratio = def.ratio;

		this.m_constant = def.lengthA + this.m_ratio * def.lengthB;

		this.m_impulse = 0;
	}

	private static InitVelocityConstraints_s_PA = new b2Vec2();
	private static InitVelocityConstraints_s_PB = new b2Vec2();
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

		//b2Rot qA(aA), qB(aB);
		var qA: b2Rot = this.m_qA.SetAngleRadians(aA), qB: b2Rot = this.m_qB.SetAngleRadians(aB);

		//m_rA = b2Mul(qA, m_localAnchorA - m_localCenterA);
		b2SubVV(this.m_localAnchorA, this.m_localCenterA, this.m_lalcA);
		b2MulRV(qA, this.m_lalcA, this.m_rA);
		//m_rB = b2Mul(qB, m_localAnchorB - m_localCenterB);
		b2SubVV(this.m_localAnchorB, this.m_localCenterB, this.m_lalcB);
		b2MulRV(qB, this.m_lalcB, this.m_rB);

		// Get the pulley axes.
		//m_uA = cA + m_rA - m_groundAnchorA;
		this.m_uA.Copy(cA).SelfAdd(this.m_rA).SelfSub(this.m_groundAnchorA);
		//m_uB = cB + m_rB - m_groundAnchorB;
		this.m_uB.Copy(cB).SelfAdd(this.m_rB).SelfSub(this.m_groundAnchorB);

		var lengthA: number = this.m_uA.GetLength();
		var lengthB: number = this.m_uB.GetLength();

		if (lengthA > 10 * b2_linearSlop)
		{
			this.m_uA.SelfMul(1 / lengthA);
		}
		else
		{
			this.m_uA.SetZero();
		}

		if (lengthB > 10 * b2_linearSlop)
		{
			this.m_uB.SelfMul(1 / lengthB);
		}
		else
		{
			this.m_uB.SetZero();
		}

		// Compute effective mass.
		var ruA: number = b2CrossVV(this.m_rA, this.m_uA);
		var ruB: number = b2CrossVV(this.m_rB, this.m_uB);

		var mA: number = this.m_invMassA + this.m_invIA * ruA * ruA;
		var mB: number = this.m_invMassB + this.m_invIB * ruB * ruB;

		this.m_mass = mA + this.m_ratio * this.m_ratio * mB;

		if (this.m_mass > 0)
		{
			this.m_mass = 1 / this.m_mass;
		}

		if (data.step.warmStarting)
		{
			// Scale impulses to support variable time steps.
			this.m_impulse *= data.step.dtRatio;

			// Warm starting.
			//b2Vec2 PA = -(m_impulse) * m_uA;
			var PA: b2Vec2 = b2MulSV(-(this.m_impulse), this.m_uA, b2PulleyJoint.InitVelocityConstraints_s_PA);
			//b2Vec2 PB = (-m_ratio * m_impulse) * m_uB;
			var PB: b2Vec2 = b2MulSV((-this.m_ratio * this.m_impulse), this.m_uB, b2PulleyJoint.InitVelocityConstraints_s_PB);

			//vA += m_invMassA * PA;
			vA.SelfMulAdd(this.m_invMassA, PA);
			wA += this.m_invIA * b2CrossVV(this.m_rA, PA);
			//vB += m_invMassB * PB;
			vB.SelfMulAdd(this.m_invMassB, PB);
			wB += this.m_invIB * b2CrossVV(this.m_rB, PB);
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
	private static SolveVelocityConstraints_s_PA = new b2Vec2();
	private static SolveVelocityConstraints_s_PB = new b2Vec2();
	public SolveVelocityConstraints(data)
	{
		var vA: b2Vec2 = data.velocities[this.m_indexA].v;
		var wA: number = data.velocities[this.m_indexA].w;
		var vB: b2Vec2 = data.velocities[this.m_indexB].v;
		var wB: number = data.velocities[this.m_indexB].w;

		//b2Vec2 vpA = vA + b2Cross(wA, m_rA);
		var vpA: b2Vec2 = b2AddVCrossSV(vA, wA, this.m_rA, b2PulleyJoint.SolveVelocityConstraints_s_vpA);
		//b2Vec2 vpB = vB + b2Cross(wB, m_rB);
		var vpB: b2Vec2 = b2AddVCrossSV(vB, wB, this.m_rB, b2PulleyJoint.SolveVelocityConstraints_s_vpB);

		var Cdot: number = -b2DotVV(this.m_uA, vpA) - this.m_ratio * b2DotVV(this.m_uB, vpB);
		var impulse: number = -this.m_mass * Cdot;
		this.m_impulse += impulse;

		//b2Vec2 PA = -impulse * m_uA;
		var PA: b2Vec2 = b2MulSV(-impulse, this.m_uA, b2PulleyJoint.SolveVelocityConstraints_s_PA);
		//b2Vec2 PB = -m_ratio * impulse * m_uB;
		var PB: b2Vec2 = b2MulSV(-this.m_ratio * impulse, this.m_uB, b2PulleyJoint.SolveVelocityConstraints_s_PB);
		//vA += m_invMassA * PA;
		vA.SelfMulAdd(this.m_invMassA, PA);
		wA += this.m_invIA * b2CrossVV(this.m_rA, PA);
		//vB += m_invMassB * PB;
		vB.SelfMulAdd(this.m_invMassB, PB);
		wB += this.m_invIB * b2CrossVV(this.m_rB, PB);

		//data.velocities[this.m_indexA].v = vA;
		data.velocities[this.m_indexA].w = wA;
		//data.velocities[this.m_indexB].v = vB;
		data.velocities[this.m_indexB].w = wB;
	}

	private static SolvePositionConstraints_s_PA = new b2Vec2();
	private static SolvePositionConstraints_s_PB = new b2Vec2();
	public SolvePositionConstraints(data)
	{
		var cA: b2Vec2 = data.positions[this.m_indexA].c;
		var aA: number = data.positions[this.m_indexA].a;
		var cB: b2Vec2 = data.positions[this.m_indexB].c;
		var aB: number = data.positions[this.m_indexB].a;

		//b2Rot qA(aA), qB(aB);
		var qA: b2Rot = this.m_qA.SetAngleRadians(aA), qB: b2Rot = this.m_qB.SetAngleRadians(aB);

		//b2Vec2 rA = b2Mul(qA, m_localAnchorA - m_localCenterA);
		b2SubVV(this.m_localAnchorA, this.m_localCenterA, this.m_lalcA);
		var rA: b2Vec2 = b2MulRV(qA, this.m_lalcA, this.m_rA);
		//b2Vec2 rB = b2Mul(qB, m_localAnchorB - m_localCenterB);
		b2SubVV(this.m_localAnchorB, this.m_localCenterB, this.m_lalcB);
		var rB: b2Vec2 = b2MulRV(qB, this.m_lalcB, this.m_rB);

		// Get the pulley axes.
		//b2Vec2 uA = cA + rA - m_groundAnchorA;
		var uA = this.m_uA.Copy(cA).SelfAdd(rA).SelfSub(this.m_groundAnchorA);
		//b2Vec2 uB = cB + rB - m_groundAnchorB;
		var uB = this.m_uB.Copy(cB).SelfAdd(rB).SelfSub(this.m_groundAnchorB);

		var lengthA: number = uA.GetLength();
		var lengthB: number = uB.GetLength();

		if (lengthA > 10 * b2_linearSlop)
		{
			uA.SelfMul(1 / lengthA);
		}
		else
		{
			uA.SetZero();
		}

		if (lengthB > 10 * b2_linearSlop)
		{
			uB.SelfMul(1 / lengthB);
		}
		else
		{
			uB.SetZero();
		}

		// Compute effective mass.
		var ruA: number = b2CrossVV(rA, uA);
		var ruB: number = b2CrossVV(rB, uB);

		var mA: number = this.m_invMassA + this.m_invIA * ruA * ruA;
		var mB: number = this.m_invMassB + this.m_invIB * ruB * ruB;

		var mass: number = mA + this.m_ratio * this.m_ratio * mB;

		if (mass > 0)
		{
			mass = 1 / mass;
		}

		var C: number = this.m_constant - lengthA - this.m_ratio * lengthB;
		var linearError: number = b2Abs(C);

		var impulse: number = -mass * C;

		//b2Vec2 PA = -impulse * uA;
		var PA: b2Vec2 = b2MulSV(-impulse, uA, b2PulleyJoint.SolvePositionConstraints_s_PA);
		//b2Vec2 PB = -m_ratio * impulse * uB;
		var PB: b2Vec2 = b2MulSV(-this.m_ratio * impulse, uB, b2PulleyJoint.SolvePositionConstraints_s_PB);

		//cA += m_invMassA * PA;
		cA.SelfMulAdd(this.m_invMassA, PA);
		aA += this.m_invIA * b2CrossVV(rA, PA);
		//cB += m_invMassB * PB;
		cB.SelfMulAdd(this.m_invMassB, PB);
		aB += this.m_invIB * b2CrossVV(rB, PB);

		//data.positions[this.m_indexA].c = cA;
		data.positions[this.m_indexA].a = aA;
		//data.positions[this.m_indexB].c = cB;
		data.positions[this.m_indexB].a = aB;

		return linearError < b2_linearSlop;
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
		//b2Vec2 P = m_impulse * m_uB;
		//return inv_dt * P;
		return out.SetXY(inv_dt * this.m_impulse * this.m_uB.x, inv_dt * this.m_impulse * this.m_uB.y);
	}

	public GetReactionTorque(inv_dt: number): number
	{
		return 0;
	}

	public GetGroundAnchorA()
	{
		return this.m_groundAnchorA;
	}

	public GetGroundAnchorB()
	{
		return this.m_groundAnchorB;
	}

	public GetLengthA()
	{
		return this.m_lengthA;
	}

	public GetLengthB()
	{
		return this.m_lengthB;
	}

	public GetRatio()
	{
		return this.m_ratio;
	}

	private static GetCurrentLengthA_s_p = new b2Vec2();
	public GetCurrentLengthA()
	{
		//b2Vec2 p = m_bodyA->GetWorldPoint(m_localAnchorA);
		//b2Vec2 s = m_groundAnchorA;
		//b2Vec2 d = p - s;
		//return d.Length();
		var p = this.m_bodyA.GetWorldPoint(this.m_localAnchorA, b2PulleyJoint.GetCurrentLengthA_s_p);
		var s = this.m_groundAnchorA;
		return b2DistanceVV(p, s);
	}

	private static GetCurrentLengthB_s_p = new b2Vec2();
	public GetCurrentLengthB()
	{
		//b2Vec2 p = m_bodyB->GetWorldPoint(m_localAnchorB);
		//b2Vec2 s = m_groundAnchorB;
		//b2Vec2 d = p - s;
		//return d.Length();
		var p = this.m_bodyB.GetWorldPoint(this.m_localAnchorB, b2PulleyJoint.GetCurrentLengthB_s_p);
		var s = this.m_groundAnchorB;
		return b2DistanceVV(p, s);
	}

	public Dump()
	{
		if (DEBUG)
		{
			var indexA = this.m_bodyA.m_islandIndex;
			var indexB = this.m_bodyB.m_islandIndex;

			b2Log("  var jd: b2PulleyJointDef = new b2PulleyJointDef();\n");
			b2Log("  jd.bodyA = bodies[%d];\n", indexA);
			b2Log("  jd.bodyB = bodies[%d];\n", indexB);
			b2Log("  jd.collideConnected = %s;\n", (this.m_collideConnected)?('true'):('false'));
			b2Log("  jd.groundAnchorA.SetXY(%.15f, %.15f);\n", this.m_groundAnchorA.x, this.m_groundAnchorA.y);
			b2Log("  jd.groundAnchorB.SetXY(%.15f, %.15f);\n", this.m_groundAnchorB.x, this.m_groundAnchorB.y);
			b2Log("  jd.localAnchorA.SetXY(%.15f, %.15f);\n", this.m_localAnchorA.x, this.m_localAnchorA.y);
			b2Log("  jd.localAnchorB.SetXY(%.15f, %.15f);\n", this.m_localAnchorB.x, this.m_localAnchorB.y);
			b2Log("  jd.lengthA = %.15f;\n", this.m_lengthA);
			b2Log("  jd.lengthB = %.15f;\n", this.m_lengthB);
			b2Log("  jd.ratio = %.15f;\n", this.m_ratio);
			b2Log("  joints[%d] = this.m_world.CreateJoint(jd);\n", this.m_index);
		}
	}

	public ShiftOrigin(newOrigin)
	{
		this.m_groundAnchorA.SelfSub(newOrigin);
		this.m_groundAnchorB.SelfSub(newOrigin);
	}
}



