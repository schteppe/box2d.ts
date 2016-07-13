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

import {b2DotVV, b2Abs, b2Clamp, b2Max, b2Min, b2CrossSV, b2Mat33, b2Vec3, b2CrossOneV, b2AddVCrossSV, b2Vec2, b2AddVV, b2CrossVV, b2SubVV, b2Mat22, b2MulRV, b2MulSV, b2Rot} from '../../Common/b2Math';
import {DEBUG, b2Log, b2_linearSlop, b2_maxLinearCorrection, b2_angularSlop} from '../../Common/b2Settings';
import {b2Joint, b2JointDef, b2JointType, b2LimitState} from '../../Dynamics/Joints/b2Joint';
import {b2Body} from '../../Dynamics/b2Body';

/// Prismatic joint definition. This requires defining a line of
/// motion using an axis and an anchor point. The definition uses local
/// anchor points and a local axis so that the initial configuration
/// can violate the constraint slightly. The joint translation is zero
/// when the local anchor points coincide in world space. Using local
/// anchors and a local axis helps when saving and loading a game.
export class b2PrismaticJointDef extends b2JointDef
{
	public localAnchorA = null;

	public localAnchorB = null;

	public localAxisA = null;

	public referenceAngle: number = 0;

	public enableLimit = false;

	public lowerTranslation: number = 0;

	public upperTranslation: number = 0;

	public enableMotor = false;

	public maxMotorForce: number = 0;

	public motorSpeed: number = 0;

	constructor()
	{
		super(b2JointType.e_prismaticJoint); // base class constructor

		this.localAnchorA = new b2Vec2();
		this.localAnchorB = new b2Vec2();
		this.localAxisA = new b2Vec2(1, 0);
	}

	public Initialize(bA, bB, anchor, axis)
	{
		this.bodyA = bA;
		this.bodyB = bB;
		this.bodyA.GetLocalPoint(anchor, this.localAnchorA);
		this.bodyB.GetLocalPoint(anchor, this.localAnchorB);
		this.bodyA.GetLocalVector(axis, this.localAxisA);
		this.referenceAngle = this.bodyB.GetAngleRadians() - this.bodyA.GetAngleRadians();
	}
}

export class b2PrismaticJoint extends b2Joint
{
	// Solver shared
	public m_localAnchorA: b2Vec2 = null;
	public m_localAnchorB: b2Vec2 = null;
	public m_localXAxisA: b2Vec2 = null;
	public m_localYAxisA: b2Vec2 = null;
	public m_referenceAngle: number = 0;
	public m_impulse: b2Vec3 = null;
	public m_motorImpulse: number = 0;
	public m_lowerTranslation: number = 0;
	public m_upperTranslation: number = 0;
	public m_maxMotorForce: number = 0;
	public m_motorSpeed: number = 0;
	public m_enableLimit: boolean = false;
	public m_enableMotor: boolean = false;
	public m_limitState: b2LimitState = b2LimitState.e_inactiveLimit;

	// Solver temp
	public m_indexA: number = 0;
	public m_indexB: number = 0;
	public m_localCenterA: b2Vec2 = null;
	public m_localCenterB: b2Vec2 = null;
	public m_invMassA: number = 0;
	public m_invMassB: number = 0;
	public m_invIA: number = 0;
	public m_invIB: number = 0;
	public m_axis: b2Vec2 = null;
	public m_perp: b2Vec2 = null;
	public m_s1: number = 0;
	public m_s2: number = 0;
	public m_a1: number = 0;
	public m_a2: number = 0;
	public m_K: b2Mat33 = null;
	public m_K3: b2Mat33 = null;
	public m_K2: b2Mat22 = null;
	public m_motorMass: number = 0;

	public m_qA: b2Rot = null;
	public m_qB: b2Rot = null;
	public m_lalcA: b2Vec2 = null;
	public m_lalcB: b2Vec2 = null;
	public m_rA: b2Vec2 = null;
	public m_rB: b2Vec2 = null;

	constructor(def)
	{
		super(def); // base class constructor

		this.m_localAnchorA = def.localAnchorA.Clone();
		this.m_localAnchorB = def.localAnchorB.Clone();
		this.m_localXAxisA = def.localAxisA.Clone().SelfNormalize();
		this.m_localYAxisA = b2CrossOneV(this.m_localXAxisA, new b2Vec2());
		this.m_referenceAngle = def.referenceAngle;
		this.m_impulse = new b2Vec3(0, 0, 0);
		this.m_lowerTranslation = def.lowerTranslation;
		this.m_upperTranslation = def.upperTranslation;
		this.m_maxMotorForce = def.maxMotorForce;
		this.m_motorSpeed = def.motorSpeed;
		this.m_enableLimit = def.enableLimit;
		this.m_enableMotor = def.enableMotor;

		this.m_localCenterA = new b2Vec2();
		this.m_localCenterB = new b2Vec2();
		this.m_axis = new b2Vec2(0, 0);
		this.m_perp = new b2Vec2(0, 0);
		this.m_K = new b2Mat33();
		this.m_K3 = new b2Mat33();
		this.m_K2 = new b2Mat22();

		this.m_qA = new b2Rot();
		this.m_qB = new b2Rot();
		this.m_lalcA = new b2Vec2();
		this.m_lalcB = new b2Vec2();
		this.m_rA = new b2Vec2();
		this.m_rB = new b2Vec2();
	}

	private static InitVelocityConstraints_s_d = new b2Vec2();
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

		// Compute the effective masses.
		//b2Vec2 rA = b2Mul(qA, m_localAnchorA - m_localCenterA);
		b2SubVV(this.m_localAnchorA, this.m_localCenterA, this.m_lalcA);
		var rA: b2Vec2 = b2MulRV(qA, this.m_lalcA, this.m_rA);
		//b2Vec2 rB = b2Mul(qB, m_localAnchorB - m_localCenterB);
		b2SubVV(this.m_localAnchorB, this.m_localCenterB, this.m_lalcB);
		var rB: b2Vec2 = b2MulRV(qB, this.m_lalcB, this.m_rB);
		//b2Vec2 d = (cB - cA) + rB - rA;
		var d: b2Vec2 = b2AddVV(
			b2SubVV(cB, cA, b2Vec2.s_t0),
			b2SubVV(rB, rA, b2Vec2.s_t1),
			b2PrismaticJoint.InitVelocityConstraints_s_d);

		var mA: number = this.m_invMassA, mB: number = this.m_invMassB;
		var iA: number = this.m_invIA, iB: number = this.m_invIB;

		// Compute motor Jacobian and effective mass.
		{
			//m_axis = b2Mul(qA, m_localXAxisA);
			b2MulRV(qA, this.m_localXAxisA, this.m_axis);
			//m_a1 = b2Cross(d + rA, m_axis);
			this.m_a1 = b2CrossVV(b2AddVV(d, rA, b2Vec2.s_t0), this.m_axis);
			//m_a2 = b2Cross(rB, m_axis);
			this.m_a2 = b2CrossVV(rB, this.m_axis);

			this.m_motorMass = mA + mB + iA * this.m_a1 * this.m_a1 + iB * this.m_a2 * this.m_a2;
			if (this.m_motorMass > 0)
			{
				this.m_motorMass = 1 / this.m_motorMass;
			}
		}

		// Prismatic constraint.
		{
			//m_perp = b2Mul(qA, m_localYAxisA);
			b2MulRV(qA, this.m_localYAxisA, this.m_perp);

			//m_s1 = b2Cross(d + rA, m_perp);
			this.m_s1 = b2CrossVV(b2AddVV(d, rA, b2Vec2.s_t0), this.m_perp);
			//m_s2 = b2Cross(rB, m_perp);
			this.m_s2 = b2CrossVV(rB, this.m_perp);

			//float32 k11 = mA + mB + iA * m_s1 * m_s1 + iB * m_s2 * m_s2;
			this.m_K.ex.x = mA + mB + iA * this.m_s1 * this.m_s1 + iB * this.m_s2 * this.m_s2;
			//float32 k12 = iA * m_s1 + iB * m_s2;
			this.m_K.ex.y = iA * this.m_s1 + iB * this.m_s2;
			//float32 k13 = iA * m_s1 * m_a1 + iB * m_s2 * m_a2;
			this.m_K.ex.z = iA * this.m_s1 * this.m_a1 + iB * this.m_s2 * this.m_a2;
			this.m_K.ey.x = this.m_K.ex.y;
			//float32 k22 = iA + iB;
			this.m_K.ey.y = iA + iB;
			if (this.m_K.ey.y == 0)
			{
				// For bodies with fixed rotation.
				this.m_K.ey.y = 1;
			}
			//float32 k23 = iA * m_a1 + iB * m_a2;
			this.m_K.ey.z = iA * this.m_a1 + iB * this.m_a2;
			this.m_K.ez.x = this.m_K.ex.z;
			this.m_K.ez.y = this.m_K.ey.z;
			//float32 k33 = mA + mB + iA * m_a1 * m_a1 + iB * m_a2 * m_a2;
			this.m_K.ez.z = mA + mB + iA * this.m_a1 * this.m_a1 + iB * this.m_a2 * this.m_a2;

			//m_K.ex.Set(k11, k12, k13);
			//m_K.ey.Set(k12, k22, k23);
			//m_K.ez.Set(k13, k23, k33);
		}

		// Compute motor and limit terms.
		if (this.m_enableLimit)
		{
			//float32 jointTranslation = b2Dot(m_axis, d);
			var jointTranslation: number = b2DotVV(this.m_axis, d);
			if (b2Abs(this.m_upperTranslation - this.m_lowerTranslation) < 2 * b2_linearSlop)
			{
				this.m_limitState = b2LimitState.e_equalLimits;
			}
			else if (jointTranslation <= this.m_lowerTranslation)
			{
				if (this.m_limitState != b2LimitState.e_atLowerLimit)
				{
					this.m_limitState = b2LimitState.e_atLowerLimit;
					this.m_impulse.z = 0;
				}
			}
			else if (jointTranslation >= this.m_upperTranslation)
			{
				if (this.m_limitState != b2LimitState.e_atUpperLimit)
				{
					this.m_limitState = b2LimitState.e_atUpperLimit;
					this.m_impulse.z = 0;
				}
			}
			else
			{
				this.m_limitState = b2LimitState.e_inactiveLimit;
				this.m_impulse.z = 0;
			}
		}
		else
		{
			this.m_limitState = b2LimitState.e_inactiveLimit;
			this.m_impulse.z = 0;
		}

		if (this.m_enableMotor == false)
		{
			this.m_motorImpulse = 0;
		}

		if (data.step.warmStarting)
		{
			// Account for variable time step.
			//m_impulse *= data.step.dtRatio;
			this.m_impulse.SelfMul(data.step.dtRatio);
			this.m_motorImpulse *= data.step.dtRatio;

			//b2Vec2 P = m_impulse.x * m_perp + (m_motorImpulse + m_impulse.z) * m_axis;
			var P: b2Vec2 = b2AddVV(
				b2MulSV(this.m_impulse.x, this.m_perp, b2Vec2.s_t0),
				b2MulSV((this.m_motorImpulse + this.m_impulse.z), this.m_axis, b2Vec2.s_t1),
				b2PrismaticJoint.InitVelocityConstraints_s_P);
			//float32 LA = m_impulse.x * m_s1 + m_impulse.y + (m_motorImpulse + m_impulse.z) * m_a1;
			var LA = this.m_impulse.x * this.m_s1 + this.m_impulse.y + (this.m_motorImpulse + this.m_impulse.z) * this.m_a1;
			//float32 LB = m_impulse.x * m_s2 + m_impulse.y + (m_motorImpulse + m_impulse.z) * m_a2;
			var LB = this.m_impulse.x * this.m_s2 + this.m_impulse.y + (this.m_motorImpulse + this.m_impulse.z) * this.m_a2;

			//vA -= mA * P;
			vA.SelfMulSub(mA, P);
			wA -= iA * LA;

			//vB += mB * P;
			vB.SelfMulAdd(mB, P);
			wB += iB * LB;
		}
		else
		{
			this.m_impulse.SetZero();
			this.m_motorImpulse = 0;
		}

		//data.velocities[this.m_indexA].v = vA;
		data.velocities[this.m_indexA].w = wA;
		//data.velocities[this.m_indexB].v = vB;
		data.velocities[this.m_indexB].w = wB;
	}

	private static SolveVelocityConstraints_s_P = new b2Vec2();
	private static SolveVelocityConstraints_s_f2r = new b2Vec2();
	private static SolveVelocityConstraints_s_f1 = new b2Vec3();
	private static SolveVelocityConstraints_s_df3 = new b2Vec3();
	private static SolveVelocityConstraints_s_df2 = new b2Vec2();
	public SolveVelocityConstraints(data)
	{
		var vA: b2Vec2 = data.velocities[this.m_indexA].v;
		var wA: number = data.velocities[this.m_indexA].w;
		var vB: b2Vec2 = data.velocities[this.m_indexB].v;
		var wB: number = data.velocities[this.m_indexB].w;

		var mA: number = this.m_invMassA, mB: number = this.m_invMassB;
		var iA: number = this.m_invIA, iB: number = this.m_invIB;

		// Solve linear motor constraint.
		if (this.m_enableMotor && this.m_limitState != b2LimitState.e_equalLimits)
		{
			//float32 Cdot = b2Dot(m_axis, vB - vA) + m_a2 * wB - m_a1 * wA;
			var Cdot: number = b2DotVV(this.m_axis, b2SubVV(vB, vA, b2Vec2.s_t0)) + this.m_a2 * wB - this.m_a1 * wA;
			var impulse = this.m_motorMass * (this.m_motorSpeed - Cdot);
			var oldImpulse = this.m_motorImpulse;
			var maxImpulse = data.step.dt * this.m_maxMotorForce;
			this.m_motorImpulse = b2Clamp(this.m_motorImpulse + impulse, (-maxImpulse), maxImpulse);
			impulse = this.m_motorImpulse - oldImpulse;

			//b2Vec2 P = impulse * m_axis;
			var P: b2Vec2 = b2MulSV(impulse, this.m_axis, b2PrismaticJoint.SolveVelocityConstraints_s_P);
			var LA = impulse * this.m_a1;
			var LB = impulse * this.m_a2;

			//vA -= mA * P;
			vA.SelfMulSub(mA, P);
			wA -= iA * LA;

			//vB += mB * P;
			vB.SelfMulAdd(mB, P);
			wB += iB * LB;
		}

		//b2Vec2 Cdot1;
		//Cdot1.x = b2Dot(m_perp, vB - vA) + m_s2 * wB - m_s1 * wA;
		var Cdot1_x: number = b2DotVV(this.m_perp, b2SubVV(vB, vA, b2Vec2.s_t0)) + this.m_s2 * wB - this.m_s1 * wA;
		//Cdot1.y = wB - wA;
		var Cdot1_y = wB - wA;

		if (this.m_enableLimit && this.m_limitState != b2LimitState.e_inactiveLimit)
		{
			// Solve prismatic and limit constraint in block form.
			//float32 Cdot2;
			//Cdot2 = b2Dot(m_axis, vB - vA) + m_a2 * wB - m_a1 * wA;
			var Cdot2: number = b2DotVV(this.m_axis, b2SubVV(vB, vA, b2Vec2.s_t0)) + this.m_a2 * wB - this.m_a1 * wA;
			//b2Vec3 Cdot(Cdot1.x, Cdot1.y, Cdot2);

			//b2Vec3 f1 = m_impulse;
			var f1 = b2PrismaticJoint.SolveVelocityConstraints_s_f1.Copy(this.m_impulse);
			//b2Vec3 df =  m_K.Solve33(-Cdot);
			var df3 = this.m_K.Solve33((-Cdot1_x), (-Cdot1_y), (-Cdot2), b2PrismaticJoint.SolveVelocityConstraints_s_df3);
			//m_impulse += df;
			this.m_impulse.SelfAdd(df3);

			if (this.m_limitState == b2LimitState.e_atLowerLimit)
			{
				this.m_impulse.z = b2Max(this.m_impulse.z, 0);
			}
			else if (this.m_limitState == b2LimitState.e_atUpperLimit)
			{
				this.m_impulse.z = b2Min(this.m_impulse.z, 0);
			}

			// f2(1:2) = invK(1:2,1:2) * (-Cdot(1:2) - K(1:2,3) * (f2(3) - f1(3))) + f1(1:2)
			//b2Vec2 b = -Cdot1 - (m_impulse.z - f1.z) * b2Vec2(m_K.ez.x, m_K.ez.y);
			var b_x = (-Cdot1_x) - (this.m_impulse.z - f1.z) * this.m_K.ez.x;
			var b_y = (-Cdot1_y) - (this.m_impulse.z - f1.z) * this.m_K.ez.y;
			//b2Vec2 f2r = m_K.Solve22(b) + b2Vec2(f1.x, f1.y);
			var f2r = this.m_K.Solve22(b_x, b_y, b2PrismaticJoint.SolveVelocityConstraints_s_f2r);
			f2r.x += f1.x;
			f2r.y += f1.y;
			//m_impulse.x = f2r.x;
			this.m_impulse.x = f2r.x;
			//m_impulse.y = f2r.y;
			this.m_impulse.y = f2r.y;

			//df = m_impulse - f1;
			df3.x = this.m_impulse.x - f1.x;
			df3.y = this.m_impulse.y - f1.y;
			df3.z = this.m_impulse.z - f1.z;

			//b2Vec2 P = df.x * m_perp + df.z * m_axis;
			var P: b2Vec2 = b2AddVV(
				b2MulSV(df3.x, this.m_perp, b2Vec2.s_t0),
				b2MulSV(df3.z, this.m_axis, b2Vec2.s_t1),
				b2PrismaticJoint.SolveVelocityConstraints_s_P);
			//float32 LA = df.x * m_s1 + df.y + df.z * m_a1;
			var LA = df3.x * this.m_s1 + df3.y + df3.z * this.m_a1;
			//float32 LB = df.x * m_s2 + df.y + df.z * m_a2;
			var LB = df3.x * this.m_s2 + df3.y + df3.z * this.m_a2;

			//vA -= mA * P;
			vA.SelfMulSub(mA, P);
			wA -= iA * LA;

			//vB += mB * P;
			vB.SelfMulAdd(mB, P);
			wB += iB * LB;
		}
		else
		{
			// Limit is inactive, just solve the prismatic constraint in block form.
			//b2Vec2 df = m_K.Solve22(-Cdot1);
			var df2 = this.m_K.Solve22((-Cdot1_x), (-Cdot1_y), b2PrismaticJoint.SolveVelocityConstraints_s_df2);
			this.m_impulse.x += df2.x;
			this.m_impulse.y += df2.y;

			//b2Vec2 P = df.x * m_perp;
			var P: b2Vec2 = b2MulSV(df2.x, this.m_perp, b2PrismaticJoint.SolveVelocityConstraints_s_P);
			//float32 LA = df.x * m_s1 + df.y;
			var LA = df2.x * this.m_s1 + df2.y;
			//float32 LB = df.x * m_s2 + df.y;
			var LB = df2.x * this.m_s2 + df2.y;

			//vA -= mA * P;
			vA.SelfMulSub(mA, P);
			wA -= iA * LA;

			//vB += mB * P;
			vB.SelfMulAdd(mB, P);
			wB += iB * LB;
		}

		//data.velocities[this.m_indexA].v = vA;
		data.velocities[this.m_indexA].w = wA;
		//data.velocities[this.m_indexB].v = vB;
		data.velocities[this.m_indexB].w = wB;
	}

	private static SolvePositionConstraints_s_d = new b2Vec2();
	private static SolvePositionConstraints_s_impulse = new b2Vec3();
	private static SolvePositionConstraints_s_impulse1 = new b2Vec2();
	private static SolvePositionConstraints_s_P = new b2Vec2();
	public SolvePositionConstraints(data)
	{
		var cA: b2Vec2 = data.positions[this.m_indexA].c;
		var aA: number = data.positions[this.m_indexA].a;
		var cB: b2Vec2 = data.positions[this.m_indexB].c;
		var aB: number = data.positions[this.m_indexB].a;

		var qA: b2Rot = this.m_qA.SetAngleRadians(aA), qB: b2Rot = this.m_qB.SetAngleRadians(aB);

		var mA: number = this.m_invMassA, mB: number = this.m_invMassB;
		var iA: number = this.m_invIA, iB: number = this.m_invIB;

		//b2Vec2 rA = b2Mul(qA, m_localAnchorA - m_localCenterA);
		var rA: b2Vec2 = b2MulRV(qA, this.m_lalcA, this.m_rA);
		//b2Vec2 rB = b2Mul(qB, m_localAnchorB - m_localCenterB);
		var rB: b2Vec2 = b2MulRV(qB, this.m_lalcB, this.m_rB);
		//b2Vec2 d = cB + rB - cA - rA;
		var d: b2Vec2 = b2SubVV(
			b2AddVV(cB, rB, b2Vec2.s_t0),
			b2AddVV(cA, rA, b2Vec2.s_t1),
			b2PrismaticJoint.SolvePositionConstraints_s_d);

		//b2Vec2 axis = b2Mul(qA, m_localXAxisA);
		var axis: b2Vec2 = b2MulRV(qA, this.m_localXAxisA, this.m_axis);
		//float32 a1 = b2Cross(d + rA, axis);
		var a1 = b2CrossVV(b2AddVV(d, rA, b2Vec2.s_t0), axis);
		//float32 a2 = b2Cross(rB, axis);
		var a2 = b2CrossVV(rB, axis);
		//b2Vec2 perp = b2Mul(qA, m_localYAxisA);
		var perp: b2Vec2 = b2MulRV(qA, this.m_localYAxisA, this.m_perp);

		//float32 s1 = b2Cross(d + rA, perp);
		var s1 = b2CrossVV(b2AddVV(d, rA, b2Vec2.s_t0), perp);
		//float32 s2 = b2Cross(rB, perp);
		var s2 = b2CrossVV(rB, perp);

		//b2Vec3 impulse;
		var impulse = b2PrismaticJoint.SolvePositionConstraints_s_impulse;
		//b2Vec2 C1;
		//C1.x = b2Dot(perp, d);
		var C1_x: number = b2DotVV(perp, d);
		//C1.y = aB - aA - m_referenceAngle;
		var C1_y = aB - aA - this.m_referenceAngle;

		var linearError = b2Abs(C1_x);
		var angularError = b2Abs(C1_y);

		var active = false;
		var C2: number = 0;
		if (this.m_enableLimit)
		{
			//float32 translation = b2Dot(axis, d);
			var translation: number = b2DotVV(axis, d);
			if (b2Abs(this.m_upperTranslation - this.m_lowerTranslation) < 2 * b2_linearSlop)
			{
				// Prevent large angular corrections
				C2 = b2Clamp(translation, (-b2_maxLinearCorrection), b2_maxLinearCorrection);
				linearError = b2Max(linearError, b2Abs(translation));
				active = true;
			}
			else if (translation <= this.m_lowerTranslation)
			{
				// Prevent large linear corrections and allow some slop.
				C2 = b2Clamp(translation - this.m_lowerTranslation + b2_linearSlop, (-b2_maxLinearCorrection), 0);
				linearError = b2Max(linearError, this.m_lowerTranslation - translation);
				active = true;
			}
			else if (translation >= this.m_upperTranslation)
			{
				// Prevent large linear corrections and allow some slop.
				C2 = b2Clamp(translation - this.m_upperTranslation - b2_linearSlop, 0, b2_maxLinearCorrection);
				linearError = b2Max(linearError, translation - this.m_upperTranslation);
				active = true;
			}
		}

		if (active)
		{
			//float32 k11 = mA + mB + iA * s1 * s1 + iB * s2 * s2;
			var k11 = mA + mB + iA * s1 * s1 + iB * s2 * s2;
			//float32 k12 = iA * s1 + iB * s2;
			var k12 = iA * s1 + iB * s2;
			//float32 k13 = iA * s1 * a1 + iB * s2 * a2;
			var k13 = iA * s1 * a1 + iB * s2 * a2;
			//float32 k22 = iA + iB;
			var k22 = iA + iB;
			if (k22 == 0)
			{
				// For fixed rotation
				k22 = 1;
			}
			//float32 k23 = iA * a1 + iB * a2;
			var k23 = iA * a1 + iB * a2;
			//float32 k33 = mA + mB + iA * a1 * a1 + iB * a2 * a2;
			var k33 = mA + mB + iA * a1 * a1 + iB * a2 * a2;

			//b2Mat33 K;
			var K = this.m_K3;
			//K.ex.Set(k11, k12, k13);
			K.ex.SetXYZ(k11, k12, k13);
			//K.ey.Set(k12, k22, k23);
			K.ey.SetXYZ(k12, k22, k23);
			//K.ez.Set(k13, k23, k33);
			K.ez.SetXYZ(k13, k23, k33);

			//b2Vec3 C;
			//C.x = C1.x;
			//C.y = C1.y;
			//C.z = C2;

			//impulse = K.Solve33(-C);
			impulse = K.Solve33((-C1_x), (-C1_y), (-C2), impulse);
		}
		else
		{
			//float32 k11 = mA + mB + iA * s1 * s1 + iB * s2 * s2;
			var k11 = mA + mB + iA * s1 * s1 + iB * s2 * s2;
			//float32 k12 = iA * s1 + iB * s2;
			var k12 = iA * s1 + iB * s2;
			//float32 k22 = iA + iB;
			var k22 = iA + iB;
			if (k22 == 0)
			{
				k22 = 1;
			}

			//b2Mat22 K;
			var K2 = this.m_K2;
			//K.ex.Set(k11, k12);
			K2.ex.SetXY(k11, k12);
			//K.ey.Set(k12, k22);
			K2.ey.SetXY(k12, k22);

			//b2Vec2 impulse1 = K.Solve(-C1);
			var impulse1 = K2.Solve((-C1_x), (-C1_y), b2PrismaticJoint.SolvePositionConstraints_s_impulse1);
			impulse.x = impulse1.x;
			impulse.y = impulse1.y;
			impulse.z = 0;
		}

		//b2Vec2 P = impulse.x * perp + impulse.z * axis;
		var P: b2Vec2 = b2AddVV(
			b2MulSV(impulse.x, perp, b2Vec2.s_t0),
			b2MulSV(impulse.z, axis, b2Vec2.s_t1),
			b2PrismaticJoint.SolvePositionConstraints_s_P);
		//float32 LA = impulse.x * s1 + impulse.y + impulse.z * a1;
		var LA = impulse.x * s1 + impulse.y + impulse.z * a1;
		//float32 LB = impulse.x * s2 + impulse.y + impulse.z * a2;
		var LB = impulse.x * s2 + impulse.y + impulse.z * a2;

		//cA -= mA * P;
		cA.SelfMulSub(mA, P);
		aA -= iA * LA;
		//cB += mB * P;
		cB.SelfMulAdd(mB, P);
		aB += iB * LB;

		//data.positions[this.m_indexA].c = cA;
		data.positions[this.m_indexA].a = aA;
		//data.positions[this.m_indexB].c = cB;
		data.positions[this.m_indexB].a = aB;

		return linearError <= b2_linearSlop && angularError <= b2_angularSlop;
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
		//return inv_dt * (m_impulse.x * m_perp + (m_motorImpulse + m_impulse.z) * m_axis);
		return out.SetXY(inv_dt * (this.m_impulse.x * this.m_perp.x + (this.m_motorImpulse + this.m_impulse.z) * this.m_axis.x), inv_dt * (this.m_impulse.x * this.m_perp.y + (this.m_motorImpulse + this.m_impulse.z) * this.m_axis.y));
	}

	public GetReactionTorque(inv_dt: number): number
	{
		return inv_dt * this.m_impulse.y;
	}

	public GetLocalAnchorA(): b2Vec2 { return this.m_localAnchorA; }

	public GetLocalAnchorB(): b2Vec2 { return this.m_localAnchorB; }

	public GetLocalAxisA(): b2Vec2 { return this.m_localXAxisA; }

	public GetReferenceAngle() { return this.m_referenceAngle; }

	private static GetJointTranslation_s_pA = new b2Vec2();
	private static GetJointTranslation_s_pB = new b2Vec2();
	private static GetJointTranslation_s_d = new b2Vec2();
	private static GetJointTranslation_s_axis = new b2Vec2();
	public GetJointTranslation(): number
	{
		//b2Vec2 pA = m_bodyA.GetWorldPoint(m_localAnchorA);
		var pA = this.m_bodyA.GetWorldPoint(this.m_localAnchorA, b2PrismaticJoint.GetJointTranslation_s_pA);
		//b2Vec2 pB = m_bodyB.GetWorldPoint(m_localAnchorB);
		var pB = this.m_bodyB.GetWorldPoint(this.m_localAnchorB, b2PrismaticJoint.GetJointTranslation_s_pB);
		//b2Vec2 d = pB - pA;
		var d: b2Vec2 = b2SubVV(pB, pA, b2PrismaticJoint.GetJointTranslation_s_d);
		//b2Vec2 axis = m_bodyA.GetWorldVector(m_localXAxisA);
		var axis = this.m_bodyA.GetWorldVector(this.m_localXAxisA, b2PrismaticJoint.GetJointTranslation_s_axis);

		//float32 translation = b2Dot(d, axis);
		var translation: number = b2DotVV(d, axis);
		return translation;
	}

	public GetJointSpeed(): number
	{
		var bA: b2Body = this.m_bodyA;
		var bB: b2Body = this.m_bodyB;

		//b2Vec2 rA = b2Mul(bA->m_xf.q, m_localAnchorA - bA->m_sweep.localCenter);
		b2SubVV(this.m_localAnchorA, bA.m_sweep.localCenter, this.m_lalcA);
		var rA: b2Vec2 = b2MulRV(bA.m_xf.q, this.m_lalcA, this.m_rA);
		//b2Vec2 rB = b2Mul(bB->m_xf.q, m_localAnchorB - bB->m_sweep.localCenter);
		b2SubVV(this.m_localAnchorB, bB.m_sweep.localCenter, this.m_lalcB);
		var rB: b2Vec2 = b2MulRV(bB.m_xf.q, this.m_lalcB, this.m_rB);
		//b2Vec2 pA = bA->m_sweep.c + rA;
		var pA: b2Vec2 = b2AddVV(bA.m_sweep.c, rA, b2Vec2.s_t0); // pA uses s_t0
		//b2Vec2 pB = bB->m_sweep.c + rB;
		var pB: b2Vec2 = b2AddVV(bB.m_sweep.c, rB, b2Vec2.s_t1); // pB uses s_t1
		//b2Vec2 d = pB - pA;
		var d: b2Vec2 = b2SubVV(pB, pA, b2Vec2.s_t2); // d uses s_t2
		//b2Vec2 axis = b2Mul(bA.m_xf.q, m_localXAxisA);
		var axis = bA.GetWorldVector(this.m_localXAxisA, this.m_axis);

		var vA = bA.m_linearVelocity;
		var vB = bB.m_linearVelocity;
		var wA = bA.m_angularVelocity;
		var wB = bB.m_angularVelocity;

		//float32 speed = b2Dot(d, b2Cross(wA, axis)) + b2Dot(axis, vB + b2Cross(wB, rB) - vA - b2Cross(wA, rA));
		var speed =
			b2DotVV(d, b2CrossSV(wA, axis, b2Vec2.s_t0)) +
			b2DotVV(
				axis,
				b2SubVV(
					b2AddVCrossSV(vB, wB, rB, b2Vec2.s_t0),
					b2AddVCrossSV(vA, wA, rA, b2Vec2.s_t1),
					b2Vec2.s_t0));
		return speed;
	}

	public IsLimitEnabled()
	{
		return this.m_enableLimit;
	}

	public EnableLimit(flag)
	{
		if (flag != this.m_enableLimit)
		{
			this.m_bodyA.SetAwake(true);
			this.m_bodyB.SetAwake(true);
			this.m_enableLimit = flag;
			this.m_impulse.z = 0;
		}
	}

	public GetLowerLimit()
	{
		return this.m_lowerTranslation;
	}

	public GetUpperLimit()
	{
		return this.m_upperTranslation;
	}

	public SetLimits(lower, upper)
	{
		if (lower != this.m_lowerTranslation || upper != this.m_upperTranslation)
		{
			this.m_bodyA.SetAwake(true);
			this.m_bodyB.SetAwake(true);
			this.m_lowerTranslation = lower;
			this.m_upperTranslation = upper;
			this.m_impulse.z = 0;
		}
	}

	public IsMotorEnabled()
	{
		return this.m_enableMotor;
	}

	public EnableMotor(flag)
	{
		this.m_bodyA.SetAwake(true);
		this.m_bodyB.SetAwake(true);
		this.m_enableMotor = flag;
	}

	public SetMotorSpeed(speed)
	{
		this.m_bodyA.SetAwake(true);
		this.m_bodyB.SetAwake(true);
		this.m_motorSpeed = speed;
	}

	public GetMotorSpeed()
	{
		return this.m_motorSpeed;
	}

	public SetMaxMotorForce(force)
	{
		this.m_bodyA.SetAwake(true);
		this.m_bodyB.SetAwake(true);
		this.m_maxMotorForce = force;
	}

	public GetMaxMotorForce() { return this.m_maxMotorForce; }

	public GetMotorForce(inv_dt)
	{
		return inv_dt * this.m_motorImpulse;
	}

	public Dump()
	{
		if (DEBUG)
		{
			var indexA = this.m_bodyA.m_islandIndex;
			var indexB = this.m_bodyB.m_islandIndex;

			b2Log("  var jd: b2PrismaticJointDef = new b2PrismaticJointDef();\n");
			b2Log("  jd.bodyA = bodies[%d];\n", indexA);
			b2Log("  jd.bodyB = bodies[%d];\n", indexB);
			b2Log("  jd.collideConnected = %s;\n", (this.m_collideConnected)?('true'):('false'));
			b2Log("  jd.localAnchorA.SetXY(%.15f, %.15f);\n", this.m_localAnchorA.x, this.m_localAnchorA.y);
			b2Log("  jd.localAnchorB.SetXY(%.15f, %.15f);\n", this.m_localAnchorB.x, this.m_localAnchorB.y);
			b2Log("  jd.localAxisA.SetXY(%.15f, %.15f);\n", this.m_localXAxisA.x, this.m_localXAxisA.y);
			b2Log("  jd.referenceAngle = %.15f;\n", this.m_referenceAngle);
			b2Log("  jd.enableLimit = %s;\n", (this.m_enableLimit)?('true'):('false'));
			b2Log("  jd.lowerTranslation = %.15f;\n", this.m_lowerTranslation);
			b2Log("  jd.upperTranslation = %.15f;\n", this.m_upperTranslation);
			b2Log("  jd.enableMotor = %s;\n", (this.m_enableMotor)?('true'):('false'));
			b2Log("  jd.motorSpeed = %.15f;\n", this.m_motorSpeed);
			b2Log("  jd.maxMotorForce = %.15f;\n", this.m_maxMotorForce);
			b2Log("  joints[%d] = this.m_world.CreateJoint(jd);\n", this.m_index);
		}
	}
}



