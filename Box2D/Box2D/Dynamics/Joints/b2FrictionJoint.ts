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

import {b2MulMV, b2Mat22, b2AddVCrossSV, b2MulRV, b2Clamp, b2Rot, b2Vec2, b2CrossVV, b2SubVV} from '../../Common/b2Math';
import {DEBUG, b2Log} from '../../Common/b2Settings';
import {b2Joint, b2JointDef, b2JointType} from '../../Dynamics/Joints/b2Joint';

/// Friction joint definition.
export class b2FrictionJointDef extends b2JointDef
{
	public localAnchorA: b2Vec2 = new b2Vec2();

	public localAnchorB: b2Vec2 = new b2Vec2();

	public maxForce: number = 0;

	public maxTorque: number = 0;

	constructor()
	{
		super(b2JointType.e_frictionJoint); // base class constructor
	}

	public Initialize(bA, bB, anchor)
	{
		this.bodyA = bA;
		this.bodyB = bB;
		this.bodyA.GetLocalPoint(anchor, this.localAnchorA);
		this.bodyB.GetLocalPoint(anchor, this.localAnchorB);
	}
}

export class b2FrictionJoint extends b2Joint
{
	public m_localAnchorA: b2Vec2 = new b2Vec2();
	public m_localAnchorB: b2Vec2 = new b2Vec2();

	// Solver shared
	public m_linearImpulse: b2Vec2 = new b2Vec2();
	public m_angularImpulse: number = 0;
	public m_maxForce: number = 0;
	public m_maxTorque: number = 0;

	// Solver temp
	public m_indexA: number = 0;
	public m_indexB: number = 0;
	public m_rA: b2Vec2 = new b2Vec2();
	public m_rB: b2Vec2 = new b2Vec2();
	public m_localCenterA: b2Vec2 = new b2Vec2();
	public m_localCenterB: b2Vec2 = new b2Vec2();
	public m_invMassA: number = 0;
	public m_invMassB: number = 0;
	public m_invIA: number = 0;
	public m_invIB: number = 0;
	public m_linearMass: b2Mat22 = new b2Mat22();
	public m_angularMass: number = 0;

	public m_qA: b2Rot = new b2Rot();
	public m_qB: b2Rot = new b2Rot();
	public m_lalcA: b2Vec2 = new b2Vec2();
	public m_lalcB: b2Vec2 = new b2Vec2();
	public m_K: b2Mat22 = new b2Mat22();

	constructor(def)
	{
		super(def); // base class constructor

		this.m_localAnchorA.Copy(def.localAnchorA);
		this.m_localAnchorB.Copy(def.localAnchorB);

		this.m_linearImpulse.SetZero();
		this.m_maxForce = def.maxForce;
		this.m_maxTorque = def.maxTorque;

		this.m_linearMass.SetZero();
	}

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

		//var cA: b2Vec2 = data.positions[this.m_indexA].c;
		var aA: number = data.positions[this.m_indexA].a;
		var vA: b2Vec2 = data.velocities[this.m_indexA].v;
		var wA: number = data.velocities[this.m_indexA].w;

		//var cB: b2Vec2 = data.positions[this.m_indexB].c;
		var aB: number = data.positions[this.m_indexB].a;
		var vB: b2Vec2 = data.velocities[this.m_indexB].v;
		var wB: number = data.velocities[this.m_indexB].w;

		//var qA: b2Rot = new b2Rot(aA), qB: b2Rot = new b2Rot(aB);
		var qA: b2Rot = this.m_qA.SetAngleRadians(aA), qB: b2Rot = this.m_qB.SetAngleRadians(aB);

		// Compute the effective mass matrix.
		//m_rA = b2Mul(qA, m_localAnchorA - m_localCenterA);
		b2SubVV(this.m_localAnchorA, this.m_localCenterA, this.m_lalcA);
		var rA: b2Vec2 = b2MulRV(qA, this.m_lalcA, this.m_rA);
		//m_rB = b2Mul(qB, m_localAnchorB - m_localCenterB);
		b2SubVV(this.m_localAnchorB, this.m_localCenterB, this.m_lalcB);
		var rB: b2Vec2 = b2MulRV(qB, this.m_lalcB, this.m_rB);

		// J = [-I -r1_skew I r2_skew]
		//     [ 0       -1 0       1]
		// r_skew = [-ry; rx]

		// Matlab
		// K = [ mA+r1y^2*iA+mB+r2y^2*iB,  -r1y*iA*r1x-r2y*iB*r2x,          -r1y*iA-r2y*iB]
		//     [  -r1y*iA*r1x-r2y*iB*r2x, mA+r1x^2*iA+mB+r2x^2*iB,           r1x*iA+r2x*iB]
		//     [          -r1y*iA-r2y*iB,           r1x*iA+r2x*iB,                   iA+iB]

		var mA: number = this.m_invMassA, mB: number = this.m_invMassB;
		var iA: number = this.m_invIA, iB: number = this.m_invIB;

		var K: b2Mat22 = this.m_K; //new b2Mat22();
		K.ex.x = mA + mB + iA * rA.y * rA.y + iB * rB.y * rB.y;
		K.ex.y = -iA * rA.x * rA.y - iB * rB.x * rB.y;
		K.ey.x = K.ex.y;
		K.ey.y = mA + mB + iA * rA.x * rA.x + iB * rB.x * rB.x;

		K.GetInverse(this.m_linearMass);

		this.m_angularMass = iA + iB;
		if (this.m_angularMass > 0)
		{
			this.m_angularMass = 1 / this.m_angularMass;
		}

		if (data.step.warmStarting)
		{
			// Scale impulses to support a variable time step.
			//m_linearImpulse *= data.step.dtRatio;
			this.m_linearImpulse.SelfMul(data.step.dtRatio);
			this.m_angularImpulse *= data.step.dtRatio;

			//var P: b2Vec2(m_linearImpulse.x, m_linearImpulse.y);
			var P: b2Vec2 = this.m_linearImpulse;

			//vA -= mA * P;
			vA.SelfMulSub(mA, P);
			//wA -= iA * (b2Cross(m_rA, P) + m_angularImpulse);
			wA -= iA * (b2CrossVV(this.m_rA, P) + this.m_angularImpulse);
			//vB += mB * P;
			vB.SelfMulAdd(mB, P);
			//wB += iB * (b2Cross(m_rB, P) + m_angularImpulse);
			wB += iB * (b2CrossVV(this.m_rB, P) + this.m_angularImpulse);
		}
		else
		{
			this.m_linearImpulse.SetZero();
			this.m_angularImpulse = 0;
		}

		//data.velocities[this.m_indexA].v = vA;
		data.velocities[this.m_indexA].w = wA;
		//data.velocities[this.m_indexB].v = vB;
		data.velocities[this.m_indexB].w = wB;
	}

	private static SolveVelocityConstraints_s_Cdot_v2 = new b2Vec2();
	private static SolveVelocityConstraints_s_impulseV = new b2Vec2();
	private static SolveVelocityConstraints_s_oldImpulseV = new b2Vec2();
	public SolveVelocityConstraints(data)
	{
		var vA: b2Vec2 = data.velocities[this.m_indexA].v;
		var wA: number = data.velocities[this.m_indexA].w;
		var vB: b2Vec2 = data.velocities[this.m_indexB].v;
		var wB: number = data.velocities[this.m_indexB].w;

		var mA: number = this.m_invMassA, mB: number = this.m_invMassB;
		var iA: number = this.m_invIA, iB: number = this.m_invIB;

		var h: number = data.step.dt;

		// Solve angular friction
		if (true)
		{
			var Cdot: number = wB - wA;
			var impulse: number = (-this.m_angularMass * Cdot);

			var oldImpulse: number = this.m_angularImpulse;
			var maxImpulse: number = h * this.m_maxTorque;
			this.m_angularImpulse = b2Clamp(this.m_angularImpulse + impulse, (-maxImpulse), maxImpulse);
			impulse = this.m_angularImpulse - oldImpulse;

			wA -= iA * impulse;
			wB += iB * impulse;
		}

		// Solve linear friction
		if (true)
		{
			//b2Vec2 Cdot = vB + b2Cross(wB, m_rB) - vA - b2Cross(wA, m_rA);
			var Cdot_v2: b2Vec2 = b2SubVV(
				b2AddVCrossSV(vB, wB, this.m_rB, b2Vec2.s_t0),
				b2AddVCrossSV(vA, wA, this.m_rA, b2Vec2.s_t1),
				b2FrictionJoint.SolveVelocityConstraints_s_Cdot_v2);

			//b2Vec2 impulse = -b2Mul(m_linearMass, Cdot);
			var impulseV: b2Vec2 = b2MulMV(this.m_linearMass, Cdot_v2, b2FrictionJoint.SolveVelocityConstraints_s_impulseV).SelfNeg();
			//b2Vec2 oldImpulse = m_linearImpulse;
			var oldImpulseV = b2FrictionJoint.SolveVelocityConstraints_s_oldImpulseV.Copy(this.m_linearImpulse);
			//m_linearImpulse += impulse;
			this.m_linearImpulse.SelfAdd(impulseV);

			var maxImpulse: number = h * this.m_maxForce;

			if (this.m_linearImpulse.GetLengthSquared() > maxImpulse * maxImpulse)
			{
				this.m_linearImpulse.Normalize();
				this.m_linearImpulse.SelfMul(maxImpulse);
			}

			//impulse = m_linearImpulse - oldImpulse;
			b2SubVV(this.m_linearImpulse, oldImpulseV, impulseV);

			//vA -= mA * impulse;
			vA.SelfMulSub(mA, impulseV);
			//wA -= iA * b2Cross(m_rA, impulse);
			wA -= iA * b2CrossVV(this.m_rA, impulseV);

			//vB += mB * impulse;
			vB.SelfMulAdd(mB, impulseV);
			//wB += iB * b2Cross(m_rB, impulse);
			wB += iB * b2CrossVV(this.m_rB, impulseV);
		}

		//data.velocities[this.m_indexA].v = vA;
		data.velocities[this.m_indexA].w = wA;
		//data.velocities[this.m_indexB].v = vB;
		data.velocities[this.m_indexB].w = wB;
	}

	public SolvePositionConstraints(data)
	{
		return true;
	}

	public GetAnchorA(out: b2Vec2): b2Vec2
	{
		return this.m_bodyA.GetWorldPoint(this.m_localAnchorA, out);
	}

	public GetAnchorB(out: b2Vec2): b2Vec2
	{
		return this.m_bodyB.GetWorldPoint(this.m_localAnchorB, out);
	}

	public GetReactionForce(inv_dt, out: b2Vec2): b2Vec2
	{
		return out.SetXY(inv_dt * this.m_linearImpulse.x, inv_dt * this.m_linearImpulse.y);
	}

	public GetReactionTorque(inv_dt)
	{
		return inv_dt * this.m_angularImpulse;
	}

	public GetLocalAnchorA(): b2Vec2 { return this.m_localAnchorA; }

	public GetLocalAnchorB(): b2Vec2 { return this.m_localAnchorB; }

	public SetMaxForce(force: number): void
	{
		this.m_maxForce = force;
	}

	public GetMaxForce(): number
	{
		return this.m_maxForce;
	}

	public SetMaxTorque(torque: number): void
	{
		this.m_maxTorque = torque;
	}

	public GetMaxTorque(): number
	{
		return this.m_maxTorque;
	}

	public Dump(): void
	{
		if (DEBUG)
		{
			var indexA = this.m_bodyA.m_islandIndex;
			var indexB = this.m_bodyB.m_islandIndex;

			b2Log("  var jd: b2FrictionJointDef = new b2FrictionJointDef();\n");
			b2Log("  jd.bodyA = bodies[%d];\n", indexA);
			b2Log("  jd.bodyB = bodies[%d];\n", indexB);
			b2Log("  jd.collideConnected = %s;\n", (this.m_collideConnected)?('true'):('false'));
			b2Log("  jd.localAnchorA.SetXY(%.15f, %.15f);\n", this.m_localAnchorA.x, this.m_localAnchorA.y);
			b2Log("  jd.localAnchorB.SetXY(%.15f, %.15f);\n", this.m_localAnchorB.x, this.m_localAnchorB.y);
			b2Log("  jd.maxForce = %.15f;\n", this.m_maxForce);
			b2Log("  jd.maxTorque = %.15f;\n", this.m_maxTorque);
			b2Log("  joints[%d] = this.m_world.CreateJoint(jd);\n", this.m_index);
		}
	}
}
