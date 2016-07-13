/*
* Copyright (c) 2006-2007 Erin Catto http://www.box2d.org
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

import {b2AddVCrossSV, b2DotVV, b2MulRV, b2Clamp, b2MulSV, b2Abs, b2Rot, b2Vec2, b2CrossVV, b2DistanceVV, b2SubVV} from '../../Common/b2Math';
import {DEBUG, b2Log, b2_maxLinearCorrection, b2_linearSlop, b2_pi} from '../../Common/b2Settings';
import {b2Joint, b2JointDef, b2JointType} from '../../Dynamics/Joints/b2Joint';

/// Distance joint definition. This requires defining an
/// anchor point on both bodies and the non-zero length of the
/// distance joint. The definition uses local anchor points
/// so that the initial configuration can violate the constraint
/// slightly. This helps when saving and loading a game.
/// @warning Do not use a zero or short length.
export class b2DistanceJointDef extends b2JointDef
{
	public localAnchorA: b2Vec2 = new b2Vec2();
	public localAnchorB: b2Vec2 = new b2Vec2();
	public length: number = 1;
	public frequencyHz: number = 0;
	public dampingRatio: number = 0;

	constructor()
	{
		super(b2JointType.e_distanceJoint); // base class constructor
	}

	public Initialize(b1, b2, anchor1, anchor2)
	{
		this.bodyA = b1;
		this.bodyB = b2;
		this.bodyA.GetLocalPoint(anchor1, this.localAnchorA);
		this.bodyB.GetLocalPoint(anchor2, this.localAnchorB);
		this.length = b2DistanceVV(anchor1, anchor2);
		this.frequencyHz = 0;
		this.dampingRatio = 0;
	}
}

export class b2DistanceJoint extends b2Joint
{
	public m_frequencyHz: number = 0;
	public m_dampingRatio: number = 0;
	public m_bias: number = 0;

	// Solver shared
	public m_localAnchorA: b2Vec2 = null;
	public m_localAnchorB: b2Vec2 = null;
	public m_gamma: number = 0;
	public m_impulse: number = 0;
	public m_length: number = 0;

	// Solver temp
	public m_indexA: number = 0;
	public m_indexB: number = 0;
	public m_u: b2Vec2 = null;
	public m_rA: b2Vec2 = null;
	public m_rB: b2Vec2 = null;
	public m_localCenterA: b2Vec2 = null;
	public m_localCenterB: b2Vec2 = null;
	public m_invMassA: number = 0;
	public m_invMassB: number = 0;
	public m_invIA: number = 0;
	public m_invIB: number = 0;
	public m_mass: number = 0;

	public m_qA: b2Rot = null;
	public m_qB: b2Rot = null;
	public m_lalcA: b2Vec2 = null;
	public m_lalcB: b2Vec2 = null;

	constructor(def)
	{
		super(def); // base class constructor

		this.m_u = new b2Vec2();
		this.m_rA = new b2Vec2();
		this.m_rB = new b2Vec2();
		this.m_localCenterA = new b2Vec2();
		this.m_localCenterB = new b2Vec2();

		this.m_qA = new b2Rot();
		this.m_qB = new b2Rot();
		this.m_lalcA = new b2Vec2();
		this.m_lalcB = new b2Vec2();

		this.m_frequencyHz = def.frequencyHz;
		this.m_dampingRatio = def.dampingRatio;

		this.m_localAnchorA = def.localAnchorA.Clone();
		this.m_localAnchorB = def.localAnchorB.Clone();
		this.m_length = def.length;
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
		return out.SetXY(inv_dt * this.m_impulse * this.m_u.x, inv_dt * this.m_impulse * this.m_u.y);
	}

	public GetReactionTorque(inv_dt: number): number
	{
		return 0;
	}

	public GetLocalAnchorA(): b2Vec2 { return this.m_localAnchorA; }

	public GetLocalAnchorB(): b2Vec2 { return this.m_localAnchorB; }

	public SetLength(length)
	{
		this.m_length = length;
	}

	public GetLength()
	{
		return this.m_length;
	}

	public SetFrequency(hz)
	{
		this.m_frequencyHz = hz;
	}

	public GetFrequency()
	{
		return this.m_frequencyHz;
	}

	public SetDampingRatio(ratio)
	{
		this.m_dampingRatio = ratio;
	}

	public GetDampingRatio()
	{
		return this.m_dampingRatio;
	}

	public Dump()
	{
		if (DEBUG)
		{
			var indexA = this.m_bodyA.m_islandIndex;
			var indexB = this.m_bodyB.m_islandIndex;

			b2Log("  var jd: b2DistanceJointDef = new b2DistanceJointDef();\n");
			b2Log("  jd.bodyA = bodies[%d];\n", indexA);
			b2Log("  jd.bodyB = bodies[%d];\n", indexB);
			b2Log("  jd.collideConnected = %s;\n", (this.m_collideConnected)?('true'):('false'));
			b2Log("  jd.localAnchorA.SetXY(%.15f, %.15f);\n", this.m_localAnchorA.x, this.m_localAnchorA.y);
			b2Log("  jd.localAnchorB.SetXY(%.15f, %.15f);\n", this.m_localAnchorB.x, this.m_localAnchorB.y);
			b2Log("  jd.length = %.15f;\n", this.m_length);
			b2Log("  jd.frequencyHz = %.15f;\n", this.m_frequencyHz);
			b2Log("  jd.dampingRatio = %.15f;\n", this.m_dampingRatio);
			b2Log("  joints[%d] = this.m_world.CreateJoint(jd);\n", this.m_index);
		}
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

		//var qA: b2Rot = new b2Rot(aA), qB: b2Rot = new b2Rot(aB);
		var qA: b2Rot = this.m_qA.SetAngleRadians(aA), qB: b2Rot = this.m_qB.SetAngleRadians(aB);

		//m_rA = b2Mul(qA, m_localAnchorA - m_localCenterA);
		b2SubVV(this.m_localAnchorA, this.m_localCenterA, this.m_lalcA);
		b2MulRV(qA, this.m_lalcA, this.m_rA);
		//m_rB = b2Mul(qB, m_localAnchorB - m_localCenterB);
		b2SubVV(this.m_localAnchorB, this.m_localCenterB, this.m_lalcB);
		b2MulRV(qB, this.m_lalcB, this.m_rB);
		//m_u = cB + m_rB - cA - m_rA;
		this.m_u.x = cB.x + this.m_rB.x - cA.x - this.m_rA.x;
		this.m_u.y = cB.y + this.m_rB.y - cA.y - this.m_rA.y;

		// Handle singularity.
		var length = this.m_u.GetLength();
		if (length > b2_linearSlop)
		{
			this.m_u.SelfMul(1 / length);
		}
		else
		{
			this.m_u.SetZero();
		}

		//float32 crAu = b2Cross(m_rA, m_u);
		var crAu: number = b2CrossVV(this.m_rA, this.m_u);
		//float32 crBu = b2Cross(m_rB, m_u);
		var crBu: number = b2CrossVV(this.m_rB, this.m_u);
		//float32 invMass = m_invMassA + m_invIA * crAu * crAu + m_invMassB + m_invIB * crBu * crBu;
		var invMass = this.m_invMassA + this.m_invIA * crAu * crAu + this.m_invMassB + this.m_invIB * crBu * crBu;

		// Compute the effective mass matrix.
		this.m_mass = invMass != 0 ? 1 / invMass : 0;

		if (this.m_frequencyHz > 0)
		{
			var C = length - this.m_length;

			// Frequency
			var omega: number = 2 * b2_pi * this.m_frequencyHz;

			// Damping coefficient
			var d: number = 2 * this.m_mass * this.m_dampingRatio * omega;

			// Spring stiffness
			var k = this.m_mass * omega * omega;

			// magic formulas
			var h: number = data.step.dt;
			this.m_gamma = h * (d + h * k);
			this.m_gamma = this.m_gamma != 0 ? 1 / this.m_gamma : 0;
			this.m_bias = C * h * k * this.m_gamma;

			invMass += this.m_gamma;
			this.m_mass = invMass != 0 ? 1 / invMass : 0;
		}
		else
		{
			this.m_gamma = 0;
			this.m_bias = 0;
		}

		if (data.step.warmStarting)
		{
			// Scale the impulse to support a variable time step.
			this.m_impulse *= data.step.dtRatio;

			//b2Vec2 P = m_impulse * m_u;
			var P: b2Vec2 = b2MulSV(this.m_impulse, this.m_u, b2DistanceJoint.InitVelocityConstraints_s_P);

			//vA -= m_invMassA * P;
			vA.SelfMulSub(this.m_invMassA, P);
			//wA -= m_invIA * b2Cross(m_rA, P);
			wA -= this.m_invIA * b2CrossVV(this.m_rA, P);
			//vB += m_invMassB * P;
			vB.SelfMulAdd(this.m_invMassB, P);
			//wB += m_invIB * b2Cross(m_rB, P);
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

		//b2Vec2 vpA = vA + b2Cross(wA, m_rA);
		var vpA: b2Vec2 = b2AddVCrossSV(vA, wA, this.m_rA, b2DistanceJoint.SolveVelocityConstraints_s_vpA);
		//b2Vec2 vpB = vB + b2Cross(wB, m_rB);
		var vpB: b2Vec2 = b2AddVCrossSV(vB, wB, this.m_rB, b2DistanceJoint.SolveVelocityConstraints_s_vpB);
		//float32 Cdot = b2Dot(m_u, vpB - vpA);
		var Cdot: number = b2DotVV(this.m_u, b2SubVV(vpB, vpA, b2Vec2.s_t0));

		var impulse = (-this.m_mass * (Cdot + this.m_bias + this.m_gamma * this.m_impulse));
		this.m_impulse += impulse;

		//b2Vec2 P = impulse * m_u;
		var P: b2Vec2 = b2MulSV(impulse, this.m_u, b2DistanceJoint.SolveVelocityConstraints_s_P);

		//vA -= m_invMassA * P;
		vA.SelfMulSub(this.m_invMassA, P);
		//wA -= m_invIA * b2Cross(m_rA, P);
		wA -= this.m_invIA * b2CrossVV(this.m_rA, P);
		//vB += m_invMassB * P;
		vB.SelfMulAdd(this.m_invMassB, P);
		//wB += m_invIB * b2Cross(m_rB, P);
		wB += this.m_invIB * b2CrossVV(this.m_rB, P);

		//data.velocities[this.m_indexA].v = vA;
		data.velocities[this.m_indexA].w = wA;
		//data.velocities[this.m_indexB].v = vB;
		data.velocities[this.m_indexB].w = wB;
	}

	private static SolvePositionConstraints_s_P = new b2Vec2();
	public SolvePositionConstraints(data)
	{
		if (this.m_frequencyHz > 0)
		{
			// There is no position correction for soft distance constraints.
			return true;
		}

		var cA: b2Vec2 = data.positions[this.m_indexA].c;
		var aA: number = data.positions[this.m_indexA].a;
		var cB: b2Vec2 = data.positions[this.m_indexB].c;
		var aB: number = data.positions[this.m_indexB].a;

		//var qA: b2Rot = new b2Rot(aA), qB: b2Rot = new b2Rot(aB);
		var qA: b2Rot = this.m_qA.SetAngleRadians(aA), qB: b2Rot = this.m_qB.SetAngleRadians(aB);

		//b2Vec2 rA = b2Mul(qA, m_localAnchorA - m_localCenterA);
		var rA: b2Vec2 = b2MulRV(this.m_qA, this.m_lalcA, this.m_rA); // use m_rA
		//b2Vec2 rB = b2Mul(qB, m_localAnchorB - m_localCenterB);
		var rB: b2Vec2 = b2MulRV(this.m_qB, this.m_lalcB, this.m_rB); // use m_rB
		//b2Vec2 u = cB + rB - cA - rA;
		var u = this.m_u; // use m_u
		u.x = cB.x + rB.x - cA.x - rA.x;
		u.y = cB.y + rB.y - cA.y - rA.y;

		//float32 length = u.Normalize();
		var length = this.m_u.Normalize();
		//float32 C = length - m_length;
		var C = length - this.m_length;
		C = b2Clamp(C, (-b2_maxLinearCorrection), b2_maxLinearCorrection);

		var impulse = (-this.m_mass * C);
		//b2Vec2 P = impulse * u;
		var P: b2Vec2 = b2MulSV(impulse, u, b2DistanceJoint.SolvePositionConstraints_s_P);

		//cA -= m_invMassA * P;
		cA.SelfMulSub(this.m_invMassA, P);
		//aA -= m_invIA * b2Cross(rA, P);
		aA -= this.m_invIA * b2CrossVV(rA, P);
		//cB += m_invMassB * P;
		cB.SelfMulAdd(this.m_invMassB, P);
		//aB += m_invIB * b2Cross(rB, P);
		aB += this.m_invIB * b2CrossVV(rB, P);

		//data.positions[this.m_indexA].c = cA;
		data.positions[this.m_indexA].a = aA;
		//data.positions[this.m_indexB].c = cB;
		data.positions[this.m_indexB].a = aB;

		return b2Abs(C) < b2_linearSlop;
	}
}



