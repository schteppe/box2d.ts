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

///<reference path='../../../../Box2D/Box2D/Dynamics/Joints/b2Joint.ts' />
///<reference path='../../../../Box2D/Box2D/Dynamics/b2Body.ts' />
///<reference path='../../../../Box2D/Box2D/Dynamics/b2TimeStep.ts' />

module box2d {

/// Weld joint definition. You need to specify local anchor points
/// where they are attached and the relative body angle. The position
/// of the anchor points is important for computing the reaction torque.
export class b2WeldJointDef extends b2JointDef
{
	public localAnchorA: b2Vec2 = new b2Vec2();

	public localAnchorB: b2Vec2 = new b2Vec2();

	public referenceAngle: number = 0;

	public frequencyHz: number = 0;

	public dampingRatio: number = 0;

	constructor()
	{
		super(b2JointType.e_weldJoint); // base class constructor
	}

	public Initialize(bA, bB, anchor)
	{
		this.bodyA = bA;
		this.bodyB = bB;
		this.bodyA.GetLocalPoint(anchor, this.localAnchorA);
		this.bodyB.GetLocalPoint(anchor, this.localAnchorB);
		this.referenceAngle = this.bodyB.GetAngleRadians() - this.bodyA.GetAngleRadians();
	}
}

export class b2WeldJoint extends b2Joint
{
	public m_frequencyHz: number = 0;
	public m_dampingRatio: number = 0;
	public m_bias: number = 0;

	// Solver shared
	public m_localAnchorA: b2Vec2 = new b2Vec2();
	public m_localAnchorB: b2Vec2 = new b2Vec2();
	public m_referenceAngle: number = 0;
	public m_gamma: number = 0;
	public m_impulse: b2Vec3 = new b2Vec3(0, 0, 0);

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
	public m_mass: b2Mat33 = new b2Mat33();

	public m_qA: b2Rot = new b2Rot();
	public m_qB: b2Rot = new b2Rot();
	public m_lalcA: b2Vec2 = new b2Vec2();
	public m_lalcB: b2Vec2 = new b2Vec2();
	public m_K: b2Mat33 = new b2Mat33();

	constructor(def)
	{
		super(def); // base class constructor

		this.m_frequencyHz = def.frequencyHz;
		this.m_dampingRatio = def.dampingRatio;

		this.m_localAnchorA.Copy(def.localAnchorA);
		this.m_localAnchorB.Copy(def.localAnchorB);
		this.m_referenceAngle = def.referenceAngle;
		this.m_impulse.SetZero();
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

		var aA: number = data.positions[this.m_indexA].a;
		var vA: b2Vec2 = data.velocities[this.m_indexA].v;
		var wA: number = data.velocities[this.m_indexA].w;

		var aB: number = data.positions[this.m_indexB].a;
		var vB: b2Vec2 = data.velocities[this.m_indexB].v;
		var wB: number = data.velocities[this.m_indexB].w;

		var qA: b2Rot = this.m_qA.SetAngleRadians(aA), qB: b2Rot = this.m_qB.SetAngleRadians(aB);

		//m_rA = b2Mul(qA, m_localAnchorA - m_localCenterA);
		b2SubVV(this.m_localAnchorA, this.m_localCenterA, this.m_lalcA);
		b2MulRV(qA, this.m_lalcA, this.m_rA);
		//m_rB = b2Mul(qB, m_localAnchorB - m_localCenterB);
		b2SubVV(this.m_localAnchorB, this.m_localCenterB, this.m_lalcB);
		b2MulRV(qB, this.m_lalcB, this.m_rB);

		// J = [-I -r1_skew I r2_skew]
		//     [ 0       -1 0       1]
		// r_skew = [-ry; rx]

		// Matlab
		// K = [ mA+r1y^2*iA+mB+r2y^2*iB,  -r1y*iA*r1x-r2y*iB*r2x,          -r1y*iA-r2y*iB]
		//     [  -r1y*iA*r1x-r2y*iB*r2x, mA+r1x^2*iA+mB+r2x^2*iB,           r1x*iA+r2x*iB]
		//     [          -r1y*iA-r2y*iB,           r1x*iA+r2x*iB,                   iA+iB]

		var mA: number = this.m_invMassA, mB: number = this.m_invMassB;
		var iA: number = this.m_invIA, iB: number = this.m_invIB;

		var K: b2Mat33 = this.m_K;
		K.ex.x = mA + mB + this.m_rA.y * this.m_rA.y * iA + this.m_rB.y * this.m_rB.y * iB;
		K.ey.x = -this.m_rA.y * this.m_rA.x * iA - this.m_rB.y * this.m_rB.x * iB;
		K.ez.x = -this.m_rA.y * iA - this.m_rB.y * iB;
		K.ex.y = K.ey.x;
		K.ey.y = mA + mB + this.m_rA.x * this.m_rA.x * iA + this.m_rB.x * this.m_rB.x * iB;
		K.ez.y = this.m_rA.x * iA + this.m_rB.x * iB;
		K.ex.z = K.ez.x;
		K.ey.z = K.ez.y;
		K.ez.z = iA + iB;

		if (this.m_frequencyHz > 0)
		{
			K.GetInverse22(this.m_mass);

			var invM: number = iA + iB;
			var m: number = invM > 0 ? 1 / invM : 0;

			var C: number = aB - aA - this.m_referenceAngle;

			// Frequency
			var omega: number = 2 * b2_pi * this.m_frequencyHz;

			// Damping coefficient
			var d: number = 2 * m * this.m_dampingRatio * omega;

			// Spring stiffness
			var k: number = m * omega * omega;

			// magic formulas
			var h: number = data.step.dt;
			this.m_gamma = h * (d + h * k);
			this.m_gamma = this.m_gamma != 0 ? 1 / this.m_gamma : 0;
			this.m_bias = C * h * k * this.m_gamma;

			invM += this.m_gamma;
			this.m_mass.ez.z = invM != 0 ? 1 / invM : 0;
		}
		else
		{
			K.GetSymInverse33(this.m_mass);
			this.m_gamma = 0;
			this.m_bias = 0;
		}

		if (data.step.warmStarting)
		{
			// Scale impulses to support a variable time step.
			this.m_impulse.SelfMul(data.step.dtRatio);

			//b2Vec2 P(m_impulse.x, m_impulse.y);
			var P: b2Vec2 = b2WeldJoint.InitVelocityConstraints_s_P.SetXY(this.m_impulse.x, this.m_impulse.y);

			//vA -= mA * P;
			vA.SelfMulSub(mA, P);
			wA -= iA * (b2CrossVV(this.m_rA, P) + this.m_impulse.z);

			//vB += mB * P;
			vB.SelfMulAdd(mB, P);
			wB += iB * (b2CrossVV(this.m_rB, P) + this.m_impulse.z);
		}
		else
		{
			this.m_impulse.SetZero();
		}

		//data.velocities[this.m_indexA].v = vA;
		data.velocities[this.m_indexA].w = wA;
		//data.velocities[this.m_indexB].v = vB;
		data.velocities[this.m_indexB].w = wB;
	}

	private static SolveVelocityConstraints_s_Cdot1 = new b2Vec2();
	private static SolveVelocityConstraints_s_impulse1 = new b2Vec2();
	private static SolveVelocityConstraints_s_impulse = new b2Vec3();
	private static SolveVelocityConstraints_s_P = new b2Vec2();
	public SolveVelocityConstraints(data)
	{
		var vA: b2Vec2 = data.velocities[this.m_indexA].v;
		var wA: number = data.velocities[this.m_indexA].w;
		var vB: b2Vec2 = data.velocities[this.m_indexB].v;
		var wB: number = data.velocities[this.m_indexB].w;

		var mA: number = this.m_invMassA, mB: number = this.m_invMassB;
		var iA: number = this.m_invIA, iB: number = this.m_invIB;

		if (this.m_frequencyHz > 0)
		{
			var Cdot2: number = wB - wA;

			var impulse2: number = -this.m_mass.ez.z * (Cdot2 + this.m_bias + this.m_gamma * this.m_impulse.z);
			this.m_impulse.z += impulse2;

			wA -= iA * impulse2;
			wB += iB * impulse2;

			//b2Vec2 Cdot1 = vB + b2CrossSV(wB, this.m_rB) - vA - b2CrossSV(wA, this.m_rA);
			var Cdot1: b2Vec2 = b2SubVV(
				b2AddVCrossSV(vB, wB, this.m_rB, b2Vec2.s_t0),
				b2AddVCrossSV(vA, wA, this.m_rA, b2Vec2.s_t1),
				b2WeldJoint.SolveVelocityConstraints_s_Cdot1)

			//b2Vec2 impulse1 = -b2Mul22(m_mass, Cdot1);
			var impulse1: b2Vec2 = b2MulM33XY(this.m_mass, Cdot1.x, Cdot1.y, b2WeldJoint.SolveVelocityConstraints_s_impulse1).SelfNeg();
			this.m_impulse.x += impulse1.x;
			this.m_impulse.y += impulse1.y;

			//b2Vec2 P = impulse1;
			var P: b2Vec2 = impulse1;

			//vA -= mA * P;
			vA.SelfMulSub(mA, P);
			//wA -= iA * b2Cross(m_rA, P);
			wA -= iA * b2CrossVV(this.m_rA, P);

			//vB += mB * P;
			vB.SelfMulAdd(mB, P);
			//wB += iB * b2Cross(m_rB, P);
			wB += iB * b2CrossVV(this.m_rB, P);
		}
		else
		{
			//b2Vec2 Cdot1 = vB + b2Cross(wB, this.m_rB) - vA - b2Cross(wA, this.m_rA);
			var Cdot1: b2Vec2 = b2SubVV(
				b2AddVCrossSV(vB, wB, this.m_rB, b2Vec2.s_t0),
				b2AddVCrossSV(vA, wA, this.m_rA, b2Vec2.s_t1),
				b2WeldJoint.SolveVelocityConstraints_s_Cdot1)
			var Cdot2: number = wB - wA;
			//b2Vec3 var Cdot(Cdot1.x, Cdot1.y, Cdot2);
		
			//b2Vec3 impulse = -b2Mul(m_mass, Cdot);
			var impulse: b2Vec3 = b2MulM33XYZ(this.m_mass, Cdot1.x, Cdot1.y, Cdot2, b2WeldJoint.SolveVelocityConstraints_s_impulse).SelfNeg();
			this.m_impulse.SelfAdd(impulse);
		
			//b2Vec2 P(impulse.x, impulse.y);
			var P: b2Vec2 = b2WeldJoint.SolveVelocityConstraints_s_P.SetXY(impulse.x, impulse.y);
		
			//vA -= mA * P;
			vA.SelfMulSub(mA, P);
			wA -= iA * (b2CrossVV(this.m_rA, P) + impulse.z);
		
			//vB += mB * P;
			vB.SelfMulAdd(mB, P);
			wB += iB * (b2CrossVV(this.m_rB, P) + impulse.z);
		}

		//data.velocities[this.m_indexA].v = vA;
		data.velocities[this.m_indexA].w = wA;
		//data.velocities[this.m_indexB].v = vB;
		data.velocities[this.m_indexB].w = wB;
	}

	private static SolvePositionConstraints_s_C1 = new b2Vec2();
	private static SolvePositionConstraints_s_P = new b2Vec2();
	private static SolvePositionConstraints_s_impulse = new b2Vec3();
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
		b2SubVV(this.m_localAnchorA, this.m_localCenterA, this.m_lalcA);
		var rA: b2Vec2 = b2MulRV(qA, this.m_lalcA, this.m_rA);
		//b2Vec2 rB = b2Mul(qB, m_localAnchorB - m_localCenterB);
		b2SubVV(this.m_localAnchorB, this.m_localCenterB, this.m_lalcB);
		var rB: b2Vec2 = b2MulRV(qB, this.m_lalcB, this.m_rB);

		var positionError: number, angularError: number;

		var K: b2Mat33 = this.m_K;
		K.ex.x = mA + mB + rA.y * rA.y * iA + rB.y * rB.y * iB;
		K.ey.x = -rA.y * rA.x * iA - rB.y * rB.x * iB;
		K.ez.x = -rA.y * iA - rB.y * iB;
		K.ex.y = K.ey.x;
		K.ey.y = mA + mB + rA.x * rA.x * iA + rB.x * rB.x * iB;
		K.ez.y = rA.x * iA + rB.x * iB;
		K.ex.z = K.ez.x;
		K.ey.z = K.ez.y;
		K.ez.z = iA + iB;

		if (this.m_frequencyHz > 0)
		{
			//b2Vec2 C1 =  cB + rB - cA - rA;
			var C1 = 
				b2SubVV(
					b2AddVV(cB, rB, b2Vec2.s_t0), 
					b2AddVV(cA, rA, b2Vec2.s_t1), 
					b2WeldJoint.SolvePositionConstraints_s_C1);
			positionError = C1.GetLength();
			angularError = 0;

			//b2Vec2 P = -K.Solve22(C1);
			var P: b2Vec2 = K.Solve22(C1.x, C1.y, b2WeldJoint.SolvePositionConstraints_s_P).SelfNeg();

			//cA -= mA * P;
			cA.SelfMulSub(mA, P);
			aA -= iA * b2CrossVV(rA, P);

			//cB += mB * P;
			cB.SelfMulAdd(mB, P);
			aB += iB * b2CrossVV(rB, P);
		}
		else
		{
			//b2Vec2 C1 =  cB + rB - cA - rA;
			var C1 = 
				b2SubVV(
					b2AddVV(cB, rB, b2Vec2.s_t0), 
					b2AddVV(cA, rA, b2Vec2.s_t1), 
					b2WeldJoint.SolvePositionConstraints_s_C1);
			var C2: number = aB - aA - this.m_referenceAngle;
		
			positionError = C1.GetLength();
			angularError = b2Abs(C2);
		
			//b2Vec3 C(C1.x, C1.y, C2);
		
			//b2Vec3 impulse = -K.Solve33(C);
			var impulse: b2Vec3 = K.Solve33(C1.x, C1.y, C2, b2WeldJoint.SolvePositionConstraints_s_impulse).SelfNeg();
		
			//b2Vec2 P(impulse.x, impulse.y);
			var P: b2Vec2 = b2WeldJoint.SolvePositionConstraints_s_P.SetXY(impulse.x, impulse.y);
		
			//cA -= mA * P;
			cA.SelfMulSub(mA, P);
			aA -= iA * (b2CrossVV(this.m_rA, P) + impulse.z);
		
			//cB += mB * P;
			cB.SelfMulAdd(mB, P);
			aB += iB * (b2CrossVV(this.m_rB, P) + impulse.z);
		}

		//data.positions[this.m_indexA].c = cA;
		data.positions[this.m_indexA].a = aA;
		//data.positions[this.m_indexB].c = cB;
		data.positions[this.m_indexB].a = aB;

		return positionError <= b2_linearSlop && angularError <= b2_angularSlop;
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
		//b2Vec2 P(this.m_impulse.x, this.m_impulse.y);
		//return inv_dt * P;
		return out.SetXY(inv_dt * this.m_impulse.x, inv_dt * this.m_impulse.y);
	}

	public GetReactionTorque(inv_dt: number): number
	{
		return inv_dt * this.m_impulse.z;
	}

	public GetLocalAnchorA(): b2Vec2 { return this.m_localAnchorA; }

	public GetLocalAnchorB(): b2Vec2 { return this.m_localAnchorB; }

	public GetReferenceAngle(): number { return this.m_referenceAngle; }

	public SetFrequency(hz: number): void { this.m_frequencyHz = hz; }
	public GetFrequency(): number { return this.m_frequencyHz; }

	public SetDampingRatio(ratio) { this.m_dampingRatio = ratio; }
	public GetDampingRatio() { return this.m_dampingRatio; }

	public Dump()
	{
		if (DEBUG)
		{
			var indexA = this.m_bodyA.m_islandIndex;
			var indexB = this.m_bodyB.m_islandIndex;
		
			b2Log("  var jd: b2WeldJointDef = new b2WeldJointDef();\n");
			b2Log("  jd.bodyA = bodies[%d];\n", indexA);
			b2Log("  jd.bodyB = bodies[%d];\n", indexB);
			b2Log("  jd.collideConnected = %s;\n", (this.m_collideConnected)?('true'):('false'));
			b2Log("  jd.localAnchorA.SetXY(%.15f, %.15f);\n", this.m_localAnchorA.x, this.m_localAnchorA.y);
			b2Log("  jd.localAnchorB.SetXY(%.15f, %.15f);\n", this.m_localAnchorB.x, this.m_localAnchorB.y);
			b2Log("  jd.referenceAngle = %.15f;\n", this.m_referenceAngle);
			b2Log("  jd.frequencyHz = %.15f;\n", this.m_frequencyHz);
			b2Log("  jd.dampingRatio = %.15f;\n", this.m_dampingRatio);
			b2Log("  joints[%d] = this.m_world.CreateJoint(jd);\n", this.m_index);
		}
	}
}

} // module box2d

