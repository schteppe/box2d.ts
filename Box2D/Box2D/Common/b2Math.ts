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

import {b2_pi, b2_epsilon, ENABLE_ASSERTS, b2Assert, b2MakeArray} from '../../../Box2D/Box2D/Common/b2Settings';

export var b2_pi_over_180: number = b2_pi / 180;
export var b2_180_over_pi: number = 180 / b2_pi;
export var b2_two_pi: number = 2 * b2_pi;

export function b2Abs(n: number): number
{
	return (n < 0)?(-n):(n);
}

export function b2Min(a: number, b: number): number
{
	return (a < b)?(a):(b);
}

export function b2Max(a: number, b: number): number
{
	return (a > b)?(a):(b);
}

export function b2Clamp(a: number, lo: number, hi: number): number
{
	return (a < lo)?(lo):((a > hi)?(hi):(a));
}

export function b2Swap(a: any[], b: any[]): void
{
	if (ENABLE_ASSERTS) { b2Assert(false); }
	var tmp: any = a[0];
	a[0] = b[0];
	b[0] = tmp;
}

/// This function is used to ensure that a floating point number is
/// not a NaN or infinity.
export function b2IsValid(n: number): boolean
{
	return isFinite(n);
}

export function b2Sq(n: number): number
{
	return n * n;
}

/// This is a approximate yet fast inverse square-root.
export function b2InvSqrt(n: number): number
{
	return 1 / Math.sqrt(n);
}

export function b2Sqrt(n: number): number
{
	return Math.sqrt(n);
}

export function b2Pow(x: number, y: number): number
{
	return Math.pow(x, y);
}

export function b2DegToRad(degrees: number): number
{
	return degrees * b2_pi_over_180;
}

export function b2RadToDeg(radians: number): number
{
	return radians * b2_180_over_pi;
}

export function b2Cos(radians: number): number
{
	return Math.cos(radians);
}

export function b2Sin(radians: number): number
{
	return Math.sin(radians);
}

export function b2Acos(n: number): number
{
	return Math.acos(n);
}

export function b2Asin(n: number): number
{
	return Math.asin(n);
}

export function b2Atan2(y: number, x: number): number
{
	return Math.atan2(y, x);
}

export function b2NextPowerOfTwo(x: number): number
{
	x |= (x >> 1) & 0x7FFFFFFF;
	x |= (x >> 2) & 0x3FFFFFFF;
	x |= (x >> 4) & 0x0FFFFFFF;
	x |= (x >> 8) & 0x00FFFFFF;
	x |= (x >> 16) & 0x0000FFFF;
	return x + 1;
}

export function b2IsPowerOfTwo(x: number): boolean
{
	return x > 0 && (x & (x - 1)) == 0;
}

export function b2Random(): number
{
	return Math.random() * 2 - 1;
}

export function b2RandomRange(lo: number, hi: number): number
{
	return (hi - lo) * Math.random() + lo;
}

/// A 2D column vector.
export class b2Vec2
{
	public static ZERO = new b2Vec2(0, 0);
	public static UNITX = new b2Vec2(1, 0);
	public static UNITY = new b2Vec2(0, 1);

	public static s_t0 = new b2Vec2();
	public static s_t1 = new b2Vec2();
	public static s_t2 = new b2Vec2();
	public static s_t3 = new b2Vec2();

	public x: number;
	public y: number;

	constructor(x: number = 0, y: number = 0)
	{
		this.x = x;
		this.y = y;
	}

	public Clone(): b2Vec2
	{
		return new b2Vec2(this.x, this.y);
	}

	public SetZero(): b2Vec2
	{
		this.x = 0;
		this.y = 0;
		return this;
	}

	public SetXY(x: number, y: number): b2Vec2
	{
		this.x = x;
		this.y = y;
		return this;
	}

	public Copy(other: b2Vec2): b2Vec2
	{
		//if (ENABLE_ASSERTS) { b2Assert(this !== other); }
		this.x = other.x;
		this.y = other.y;
		return this;
	}

	public SelfAdd(v: b2Vec2): b2Vec2
	{
		this.x += v.x;
		this.y += v.y;
		return this;
	}

	public SelfAddXY(x: number, y: number): b2Vec2
	{
		this.x += x;
		this.y += y;
		return this;
	}

	public SelfSub(v: b2Vec2): b2Vec2
	{
		this.x -= v.x;
		this.y -= v.y;
		return this;
	}

	public SelfSubXY(x: number, y: number): b2Vec2
	{
		this.x -= x;
		this.y -= y;
		return this;
	}

	public SelfMul(s: number): b2Vec2
	{
		this.x *= s;
		this.y *= s;
		return this;
	}

	public SelfMulAdd(s: number, v: b2Vec2): b2Vec2
	{
		this.x += s * v.x;
		this.y += s * v.y;
		return this;
	}

	public SelfMulSub(s: number, v: b2Vec2): b2Vec2
	{
		this.x -= s * v.x;
		this.y -= s * v.y;
		return this;
	}

	public Dot(v: b2Vec2): number
	{
		return this.x * v.x + this.y * v.y;
	}

	public Cross(v: b2Vec2): number
	{
		return this.x * v.y - this.y * v.x;
	}

	public GetLength(): number
	{
		var x: number = this.x, y: number = this.y;
		return Math.sqrt(x * x + y * y);
	}

	public GetLengthSquared(): number
	{
		var x: number = this.x, y: number = this.y;
		return (x * x + y * y);
	}

	public Normalize(): number
	{
		var length: number = this.GetLength();
		if (length >= b2_epsilon)
		{
			var inv_length: number = 1 / length;
			this.x *= inv_length;
			this.y *= inv_length;
		}
		return length;
	}

	public SelfNormalize(): b2Vec2
	{
		var length: number = this.GetLength();
		if (length >= b2_epsilon)
		{
			var inv_length: number = 1 / length;
			this.x *= inv_length;
			this.y *= inv_length;
		}
		return this;
	}

	public SelfRotate(radians: number): b2Vec2
	{
		var c: number = Math.cos(radians);
		var s: number = Math.sin(radians);
		var x: number = this.x;
		this.x = c * x - s * this.y;
		this.y = s * x + c * this.y;
		return this;
	}

	public IsValid(): boolean
	{
		return isFinite(this.x) && isFinite(this.y);
	}

	public SelfCrossVS(s: number): b2Vec2
	{
		var x: number = this.x;
		this.x =  s * this.y;
		this.y = -s * x;
		return this;
	}

	public SelfCrossSV(s: number): b2Vec2
	{
		var x: number = this.x;
		this.x = -s * this.y;
		this.y =  s * x;
		return this;
	}

	public SelfMinV(v: b2Vec2): b2Vec2
	{
		this.x = b2Min(this.x, v.x);
		this.y = b2Min(this.y, v.y);
		return this;
	}

	public SelfMaxV(v: b2Vec2): b2Vec2
	{
		this.x = b2Max(this.x, v.x);
		this.y = b2Max(this.y, v.y);
		return this;
	}

	public SelfAbs(): b2Vec2
	{
		this.x = b2Abs(this.x);
		this.y = b2Abs(this.y);
		return this;
	}

	public SelfNeg(): b2Vec2
	{
		this.x = (-this.x);
		this.y = (-this.y);
		return this;
	}

	public SelfSkew(): b2Vec2
	{
		var x: number = this.x;
		this.x = -this.y;
		this.y = x;
		return this;
	}

	public static MakeArray(length: number): b2Vec2[]
	{
		return b2MakeArray(length, function (i: number): b2Vec2 { return new b2Vec2(); });
	}
}

export var b2Vec2_zero: b2Vec2 = new b2Vec2(0, 0);

export function b2AbsV(v: b2Vec2, out: b2Vec2): b2Vec2
{
	out.x = b2Abs(v.x);
	out.y = b2Abs(v.y);
	return out;
}

export function b2MinV(a: b2Vec2, b: b2Vec2, out: b2Vec2): b2Vec2
{
	out.x = b2Min(a.x, b.x);
	out.y = b2Min(a.y, b.y);
	return out;
}

export function b2MaxV(a: b2Vec2, b: b2Vec2, out: b2Vec2): b2Vec2
{
	out.x = b2Max(a.x, b.x);
	out.y = b2Max(a.y, b.y);
	return out;
}

export function b2ClampV(v: b2Vec2, lo: b2Vec2, hi: b2Vec2, out: b2Vec2): b2Vec2
{
	out.x = b2Clamp(v.x, lo.x, hi.x);
	out.y = b2Clamp(v.y, lo.y, hi.y);
	return out;
}

export function b2RotateV(v: b2Vec2, radians: number, out: b2Vec2): b2Vec2
{
	var v_x: number = v.x, v_y: number = v.y;
	var c: number = Math.cos(radians);
	var s: number = Math.sin(radians);
	out.x = c * v_x - s * v_y;
	out.y = s * v_x + c * v_y;
	return out;
}

export function b2DotVV(a: b2Vec2, b: b2Vec2): number
{
	return a.x * b.x + a.y * b.y;
}

export function b2CrossVV(a: b2Vec2, b: b2Vec2): number
{
	return a.x * b.y - a.y * b.x;
}

export function b2CrossVS(v: b2Vec2, s: number, out: b2Vec2): b2Vec2
{
	var v_x: number = v.x;
	out.x =  s * v.y;
	out.y = -s * v_x;
	return out;
}

export function b2CrossVOne(v: b2Vec2, out: b2Vec2): b2Vec2
{
	var v_x: number = v.x;
	out.x =  v.y;
	out.y = -v_x;
	return out;
}

export function b2CrossSV(s: number, v: b2Vec2, out: b2Vec2): b2Vec2
{
	var v_x: number = v.x;
	out.x = -s * v.y;
	out.y =  s * v_x;
	return out;
}

export function b2CrossOneV(v: b2Vec2, out: b2Vec2): b2Vec2
{
	var v_x: number = v.x;
	out.x = -v.y;
	out.y =  v_x;
	return out;
}

export function b2AddVV(a: b2Vec2, b: b2Vec2, out: b2Vec2): b2Vec2 { out.x = a.x + b.x; out.y = a.y + b.y; return out; }

export function b2SubVV(a: b2Vec2, b: b2Vec2, out: b2Vec2): b2Vec2 { out.x = a.x - b.x; out.y = a.y - b.y; return out; }

export function b2MulSV(s: number, v: b2Vec2, out: b2Vec2): b2Vec2 { out.x = v.x * s; out.y = v.y * s; return out; }

export function b2AddVMulSV(a: b2Vec2, s: number, b: b2Vec2, out: b2Vec2): b2Vec2 { out.x = a.x + (s * b.x); out.y = a.y + (s * b.y); return out; }
export function b2SubVMulSV(a: b2Vec2, s: number, b: b2Vec2, out: b2Vec2): b2Vec2 { out.x = a.x - (s * b.x); out.y = a.y - (s * b.y); return out; }

export function b2AddVCrossSV(a: b2Vec2, s: number, v: b2Vec2, out: b2Vec2): b2Vec2
{
	var v_x: number = v.x;
	out.x = a.x - (s * v.y);
	out.y = a.y + (s * v_x);
	return out;
}

export function b2MidVV(a: b2Vec2, b: b2Vec2, out: b2Vec2): b2Vec2 { out.x = (a.x + b.x) * 0.5; out.y = (a.y + b.y) * 0.5; return out; }

export function b2ExtVV(a: b2Vec2, b: b2Vec2, out: b2Vec2): b2Vec2 { out.x = (b.x - a.x) * 0.5; out.y = (b.y - a.y) * 0.5; return out; }

export function b2IsEqualToV(a: b2Vec2, b: b2Vec2): boolean
{
	return a.x == b.x && a.y == b.y;
}

export function b2DistanceVV(a: b2Vec2, b: b2Vec2): number
{
	var c_x: number = a.x - b.x;
	var c_y: number = a.y - b.y;
	return Math.sqrt(c_x * c_x + c_y * c_y);
}

export function b2DistanceSquaredVV(a: b2Vec2, b: b2Vec2): number
{
	var c_x: number = a.x - b.x;
	var c_y: number = a.y - b.y;
	return (c_x * c_x + c_y * c_y);
}

export function b2NegV(v: b2Vec2, out: b2Vec2): b2Vec2 { out.x = -v.x; out.y = -v.y; return out; }

/// A 2D column vector with 3 elements.
export class b2Vec3
{
	public static ZERO = new b2Vec3(0, 0, 0);

	public static s_t0 = new b2Vec3();

	public x: number;
	public y: number;
	public z: number;

	constructor(x: number = 0, y: number = 0, z: number = 0)
	{
		this.x = x;
		this.y = y;
		this.z = z;
	}

	public Clone(): b2Vec3
	{
		return new b2Vec3(this.x, this.y, this.z);
	}

	public SetZero(): b2Vec3
	{
		this.x = 0;
		this.y = 0;
		this.z = 0;
		return this;
	}

	public SetXYZ(x: number, y: number, z: number): b2Vec3
	{
		this.x = x;
		this.y = y;
		this.z = z;
		return this;
	}

	public Copy(other: b2Vec3): b2Vec3
	{
		//if (ENABLE_ASSERTS) { b2Assert(this !== other); }
		this.x = other.x;
		this.y = other.y;
		this.z = other.z;
		return this;
	}

	public SelfNeg(): b2Vec3
	{
		this.x = (-this.x);
		this.y = (-this.y);
		this.z = (-this.z);
		return this;
	}

	public SelfAdd(v: b2Vec3): b2Vec3
	{
		this.x += v.x;
		this.y += v.y;
		this.z += v.z;
		return this;
	}

	public SelfAddXYZ(x: number, y: number, z: number): b2Vec3
	{
		this.x += x;
		this.y += y;
		this.z += z;
		return this;
	}

	public SelfSub(v: b2Vec3): b2Vec3
	{
		this.x -= v.x;
		this.y -= v.y;
		this.z -= v.z;
		return this;
	}

	public SelfSubXYZ(x: number, y: number, z: number): b2Vec3
	{
		this.x -= x;
		this.y -= y;
		this.z -= z;
		return this;
	}

	public SelfMul(s: number): b2Vec3
	{
		this.x *= s;
		this.y *= s;
		this.z *= s;
		return this;
	}
}

export function b2DotV3V3(a: b2Vec3, b: b2Vec3): number
{
	return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function b2CrossV3V3(a: b2Vec3, b: b2Vec3, out: b2Vec3): b2Vec3
{
	var a_x: number = a.x, a_y = a.y, a_z = a.z;
	var b_x: number = b.x, b_y = b.y, b_z = b.z;
	out.x = a_y * b_z - a_z * b_y;
	out.y = a_z * b_x - a_x * b_z;
	out.z = a_x * b_y - a_y * b_x;
	return out;
}

/// A 2-by-2 matrix. Stored in column-major order.
export class b2Mat22
{
	public static IDENTITY = new b2Mat22();

	public ex: b2Vec2 = new b2Vec2(1, 0);
	public ey: b2Vec2 = new b2Vec2(0, 1);

	public Clone(): b2Mat22
	{
		return new b2Mat22().Copy(this);
	}

	public static FromVV(c1: b2Vec2, c2: b2Vec2): b2Mat22
	{
		return new b2Mat22().SetVV(c1, c2);
	}

	public static FromSSSS(r1c1: number, r1c2: number, r2c1: number, r2c2: number): b2Mat22
	{
		return new b2Mat22().SetSSSS(r1c1, r1c2, r2c1, r2c2);
	}

	public static FromAngleRadians(radians: number): b2Mat22
	{
		return new b2Mat22().SetAngleRadians(radians);
	}

	public SetSSSS(r1c1: number, r1c2: number, r2c1: number, r2c2: number): b2Mat22
	{
		this.ex.SetXY(r1c1, r2c1);
		this.ey.SetXY(r1c2, r2c2);
		return this;
	}

	public SetVV(c1: b2Vec2, c2: b2Vec2): b2Mat22
	{
		this.ex.Copy(c1);
		this.ey.Copy(c2);
		return this;
	}

	public SetAngleRadians(radians: number): b2Mat22
	{
		var c: number = Math.cos(radians);
		var s: number = Math.sin(radians);
		this.ex.SetXY( c, s);
		this.ey.SetXY(-s, c);
		return this;
	}

	public Copy(other: b2Mat22): b2Mat22
	{
		//if (ENABLE_ASSERTS) { b2Assert(this !== other); }
		this.ex.Copy(other.ex);
		this.ey.Copy(other.ey);
		return this;
	}

	public SetIdentity(): b2Mat22
	{
		this.ex.SetXY(1, 0);
		this.ey.SetXY(0, 1);
		return this;
	}

	public SetZero(): b2Mat22
	{
		this.ex.SetZero();
		this.ey.SetZero();
		return this;
	}

	public GetAngleRadians(): number
	{
		return Math.atan2(this.ex.y, this.ex.x);
	}

	public GetInverse(out: b2Mat22): b2Mat22
	{
		var a: number = this.ex.x;
		var b: number = this.ey.x;
		var c: number = this.ex.y;
		var d: number = this.ey.y;
		var det: number = a * d - b * c;
		if (det != 0)
		{
			det = 1 / det;
		}
		out.ex.x =   det * d;
		out.ey.x = (-det * b);
		out.ex.y = (-det * c);
		out.ey.y =   det * a;
		return out;
	}

	public Solve(b_x: number, b_y: number, out: b2Vec2): b2Vec2
	{
		var a11: number = this.ex.x, a12 = this.ey.x;
		var a21: number = this.ex.y, a22 = this.ey.y;
		var det: number = a11 * a22 - a12 * a21;
		if (det != 0)
		{
			det = 1 / det;
		}
		out.x = det * (a22 * b_x - a12 * b_y);
		out.y = det * (a11 * b_y - a21 * b_x);
		return out;
	}

	public SelfAbs(): b2Mat22
	{
		this.ex.SelfAbs();
		this.ey.SelfAbs();
		return this;
	}

	public SelfInv(): b2Mat22
	{
		return this.GetInverse(this);
	}

	public SelfAddM(M: b2Mat22): b2Mat22
	{
		this.ex.SelfAdd(M.ex);
		this.ey.SelfAdd(M.ey);
		return this;
	}

	public SelfSubM(M: b2Mat22): b2Mat22
	{
		this.ex.SelfSub(M.ex);
		this.ey.SelfSub(M.ey);
		return this;
	}
}

export function b2AbsM(M: b2Mat22, out: b2Mat22): b2Mat22
{
	var M_ex: b2Vec2 = M.ex, M_ey: b2Vec2 = M.ey;
	out.ex.x = b2Abs(M_ex.x);
	out.ex.y = b2Abs(M_ex.y);
	out.ey.x = b2Abs(M_ey.x);
	out.ey.y = b2Abs(M_ey.y);
	return out;
}

export function b2MulMV(M: b2Mat22, v: b2Vec2, out: b2Vec2): b2Vec2
{
	var M_ex: b2Vec2 = M.ex, M_ey: b2Vec2 = M.ey;
	var v_x: number = v.x, v_y: number = v.y;
	out.x = M_ex.x * v_x + M_ey.x * v_y;
	out.y = M_ex.y * v_x + M_ey.y * v_y;
	return out;
}

export function b2MulTMV(M: b2Mat22, v: b2Vec2, out: b2Vec2): b2Vec2
{
	var M_ex: b2Vec2 = M.ex, M_ey: b2Vec2 = M.ey;
	var v_x: number = v.x, v_y: number = v.y;
	out.x = M_ex.x * v_x + M_ex.y * v_y;
	out.y = M_ey.x * v_x + M_ey.y * v_y;
	return out;
}

export function b2AddMM(A: b2Mat22, B: b2Mat22, out: b2Mat22): b2Mat22
{
	var A_ex: b2Vec2 = A.ex, A_ey: b2Vec2 = A.ey;
	var B_ex: b2Vec2 = B.ex, B_ey: b2Vec2 = B.ey;
	out.ex.x = A_ex.x + B_ex.x;
	out.ex.y = A_ex.y + B_ex.y;
	out.ey.x = A_ey.x + B_ey.x;
	out.ey.y = A_ey.y + B_ey.y;
	return out;
}

export function b2MulMM(A: b2Mat22, B: b2Mat22, out: b2Mat22): b2Mat22
{
	var A_ex_x: number = A.ex.x, A_ex_y: number = A.ex.y;
	var A_ey_x: number = A.ey.x, A_ey_y: number = A.ey.y;
	var B_ex_x: number = B.ex.x, B_ex_y: number = B.ex.y;
	var B_ey_x: number = B.ey.x, B_ey_y: number = B.ey.y;
	out.ex.x = A_ex_x * B_ex_x + A_ey_x * B_ex_y;
	out.ex.y = A_ex_y * B_ex_x + A_ey_y * B_ex_y;
	out.ey.x = A_ex_x * B_ey_x + A_ey_x * B_ey_y;
	out.ey.y = A_ex_y * B_ey_x + A_ey_y * B_ey_y;
	return out;
}

export function b2MulTMM(A: b2Mat22, B: b2Mat22, out: b2Mat22): b2Mat22
{
	var A_ex_x: number = A.ex.x, A_ex_y: number = A.ex.y;
	var A_ey_x: number = A.ey.x, A_ey_y: number = A.ey.y;
	var B_ex_x: number = B.ex.x, B_ex_y: number = B.ex.y;
	var B_ey_x: number = B.ey.x, B_ey_y: number = B.ey.y;
	out.ex.x = A_ex_x * B_ex_x + A_ex_y * B_ex_y;
	out.ex.y = A_ey_x * B_ex_x + A_ey_y * B_ex_y;
	out.ey.x = A_ex_x * B_ey_x + A_ex_y * B_ey_y;
	out.ey.y = A_ey_x * B_ey_x + A_ey_y * B_ey_y;
	return out;
}

/// A 3-by-3 matrix. Stored in column-major order.
export class b2Mat33
{
	public static IDENTITY = new b2Mat33();

	public ex: b2Vec3 = new b2Vec3(1, 0, 0);
	public ey: b2Vec3 = new b2Vec3(0, 1, 0);
	public ez: b2Vec3 = new b2Vec3(0, 0, 1);

	public Clone(): b2Mat33
	{
		return new b2Mat33().Copy(this);
	}

	public SetVVV(c1: b2Vec3, c2: b2Vec3, c3: b2Vec3): b2Mat33
	{
		this.ex.Copy(c1);
		this.ey.Copy(c2);
		this.ez.Copy(c3);
		return this;
	}

	public Copy(other: b2Mat33): b2Mat33
	{
		//if (ENABLE_ASSERTS) { b2Assert(this !== other); }
		this.ex.Copy(other.ex);
		this.ey.Copy(other.ey);
		this.ez.Copy(other.ez);
		return this;
	}

	public SetIdentity(): b2Mat33
	{
		this.ex.SetXYZ(1, 0, 0);
		this.ey.SetXYZ(0, 1, 0);
		this.ez.SetXYZ(0, 0, 1);
		return this;
	}

	public SetZero(): b2Mat33
	{
		this.ex.SetZero();
		this.ey.SetZero();
		this.ez.SetZero();
		return this;
	}

	public SelfAddM(M: b2Mat33): b2Mat33
	{
		this.ex.SelfAdd(M.ex);
		this.ey.SelfAdd(M.ey);
		this.ez.SelfAdd(M.ez);
		return this;
	}

	public Solve33(b_x: number, b_y: number, b_z: number, out: b2Vec3): b2Vec3
	{
		var a11: number = this.ex.x, a21: number = this.ex.y, a31: number = this.ex.z;
		var a12: number = this.ey.x, a22: number = this.ey.y, a32: number = this.ey.z;
		var a13: number = this.ez.x, a23: number = this.ez.y, a33: number = this.ez.z;
		var det: number = a11 * (a22 * a33 - a32 * a23) + a21 * (a32 * a13 - a12 * a33) + a31 * (a12 * a23 - a22 * a13);
		if (det != 0)
		{
			det = 1 / det;
		}
		out.x = det * (b_x * (a22 * a33 - a32 * a23) + b_y * (a32 * a13 - a12 * a33) + b_z * (a12 * a23 - a22 * a13));
		out.y = det * (a11 * (b_y * a33 - b_z * a23) + a21 * (b_z * a13 - b_x * a33) + a31 * (b_x * a23 - b_y * a13));
		out.z = det * (a11 * (a22 * b_z - a32 * b_y) + a21 * (a32 * b_x - a12 * b_z) + a31 * (a12 * b_y - a22 * b_x));
		return out;
	}

	public Solve22(b_x: number, b_y: number, out: b2Vec2): b2Vec2
	{
		var a11: number = this.ex.x, a12: number = this.ey.x;
		var a21: number = this.ex.y, a22: number = this.ey.y;
		var det: number = a11 * a22 - a12 * a21;
		if (det != 0)
		{
			det = 1 / det;
		}
		out.x = det * (a22 * b_x - a12 * b_y);
		out.y = det * (a11 * b_y - a21 * b_x);
		return out;
	}

	public GetInverse22(M: b2Mat33): void
	{
		var a: number = this.ex.x, b: number = this.ey.x, c: number = this.ex.y, d: number = this.ey.y;
		var det: number = a * d - b * c;
		if (det != 0)
		{
			det = 1 / det;
		}

		M.ex.x =  det * d; M.ey.x = -det * b; M.ex.z = 0;
		M.ex.y = -det * c; M.ey.y =  det * a; M.ey.z = 0;
		M.ez.x =        0; M.ez.y =        0; M.ez.z = 0;
	}

	public GetSymInverse33(M: b2Mat33): void
	{
		var det: number = b2DotV3V3(this.ex, b2CrossV3V3(this.ey, this.ez, b2Vec3.s_t0));
		if (det != 0)
		{
			det = 1 / det;
		}

		var a11: number = this.ex.x, a12: number = this.ey.x, a13: number = this.ez.x;
		var a22: number = this.ey.y, a23: number = this.ez.y;
		var a33: number = this.ez.z;

		M.ex.x = det * (a22 * a33 - a23 * a23);
		M.ex.y = det * (a13 * a23 - a12 * a33);
		M.ex.z = det * (a12 * a23 - a13 * a22);

		M.ey.x = M.ex.y;
		M.ey.y = det * (a11 * a33 - a13 * a13);
		M.ey.z = det * (a13 * a12 - a11 * a23);

		M.ez.x = M.ex.z;
		M.ez.y = M.ey.z;
		M.ez.z = det * (a11 * a22 - a12 * a12);
	}
}

export function b2MulM33V3(A: b2Mat33, v: b2Vec3, out: b2Vec3): b2Vec3
{
	var v_x: number = v.x, v_y: number = v.y, v_z: number = v.z;
	out.x = A.ex.x * v_x + A.ey.x * v_y + A.ez.x * v_z;
	out.y = A.ex.y * v_x + A.ey.y * v_y + A.ez.y * v_z;
	out.z = A.ex.z * v_x + A.ey.z * v_y + A.ez.z * v_z;
	return out;
}
export function b2MulM33XYZ(A: b2Mat33, x: number, y: number, z: number, out: b2Vec3): b2Vec3
{
	out.x = A.ex.x * x + A.ey.x * y + A.ez.x * z;
	out.y = A.ex.y * x + A.ey.y * y + A.ez.y * z;
	out.z = A.ex.z * x + A.ey.z * y + A.ez.z * z;
	return out;
}
export function b2MulM33V2(A: b2Mat33, v: b2Vec2, out: b2Vec2): b2Vec2
{
	var v_x: number = v.x, v_y: number = v.y;
	out.x = A.ex.x * v_x + A.ey.x * v_y;
	out.y = A.ex.y * v_x + A.ey.y * v_y;
	return out;
}
export function b2MulM33XY(A: b2Mat33, x: number, y: number, out: b2Vec2): b2Vec2
{
	out.x = A.ex.x * x + A.ey.x * y;
	out.y = A.ex.y * x + A.ey.y * y;
	return out;
}

/// Rotation
export class b2Rot
{
	public static IDENTITY = new b2Rot();

	public s: number = 0;
	public c: number = 1;

	constructor(angle: number = 0)
	{
		if (angle)
		{
			this.s = Math.sin(angle);
			this.c = Math.cos(angle);
		}
	}

	public Clone(): b2Rot
	{
		return new b2Rot().Copy(this);
	}

	public Copy(other: b2Rot): b2Rot
	{
		this.s = other.s;
		this.c = other.c;
		return this;
	}

	public SetAngleRadians(angle: number): b2Rot
	{
		this.s = Math.sin(angle);
		this.c = Math.cos(angle);
		return this;
	}

	public SetIdentity(): b2Rot
	{
		this.s = 0;
		this.c = 1;
		return this;
	}

	public GetAngleRadians(): number
	{
		return Math.atan2(this.s, this.c);
	}

	public GetXAxis(out: b2Vec2): b2Vec2
	{
		out.x = this.c;
		out.y = this.s;
		return out;
	}

	public GetYAxis(out: b2Vec2): b2Vec2
	{
		out.x = -this.s;
		out.y = this.c;
		return out;
	}
}

export function b2MulRR(q: b2Rot, r: b2Rot, out: b2Rot): b2Rot
{
	// [qc -qs] * [rc -rs] = [qc*rc-qs*rs -qc*rs-qs*rc]
	// [qs  qc]   [rs  rc]   [qs*rc+qc*rs -qs*rs+qc*rc]
	// s = qs * rc + qc * rs
	// c = qc * rc - qs * rs
	var q_c: number = q.c, q_s: number = q.s;
	var r_c: number = r.c, r_s: number = r.s;
	out.s = q_s * r_c + q_c * r_s;
	out.c = q_c * r_c - q_s * r_s;
	return out;
}

export function b2MulTRR(q: b2Rot, r: b2Rot, out: b2Rot): b2Rot
{
	// [ qc qs] * [rc -rs] = [qc*rc+qs*rs -qc*rs+qs*rc]
	// [-qs qc]   [rs  rc]   [-qs*rc+qc*rs qs*rs+qc*rc]
	// s = qc * rs - qs * rc
	// c = qc * rc + qs * rs
	var q_c: number = q.c, q_s: number = q.s;
	var r_c: number = r.c, r_s: number = r.s;
	out.s = q_c * r_s - q_s * r_c;
	out.c = q_c * r_c + q_s * r_s;
	return out;
}

export function b2MulRV(q: b2Rot, v: b2Vec2, out: b2Vec2): b2Vec2
{
	var q_c: number = q.c, q_s: number = q.s;
	var v_x: number = v.x, v_y: number = v.y;
	out.x = q_c * v_x - q_s * v_y;
	out.y = q_s * v_x + q_c * v_y;
	return out;
}

export function b2MulTRV(q: b2Rot, v: b2Vec2, out: b2Vec2): b2Vec2
{
	var q_c: number = q.c, q_s: number = q.s;
	var v_x: number = v.x, v_y: number = v.y;
	out.x =  q_c * v_x + q_s * v_y;
	out.y = -q_s * v_x + q_c * v_y;
	return out;
}

/// A transform contains translation and rotation. It is used to represent
/// the position and orientation of rigid frames.
export class b2Transform
{
	public static IDENTITY = new b2Transform();

	public p: b2Vec2 = new b2Vec2();
	public q: b2Rot = new b2Rot();

	public Clone(): b2Transform
	{
		return new b2Transform().Copy(this);
	}

	public Copy(other: b2Transform): b2Transform
	{
		//if (ENABLE_ASSERTS) { b2Assert(this !== other); }
		this.p.Copy(other.p);
		this.q.Copy(other.q);
		return this;
	}

	public SetIdentity(): b2Transform
	{
		this.p.SetZero();
		this.q.SetIdentity();
		return this;
	}

	public SetPositionRotation(position: b2Vec2, q: b2Rot): b2Transform
	{
		this.p.Copy(position);
		this.q.Copy(q);
		return this;
	}

	public SetPositionAngleRadians(pos: b2Vec2, a: number): b2Transform
	{
		this.p.Copy(pos);
		this.q.SetAngleRadians(a);
		return this;
	}

	public SetPosition(position: b2Vec2): b2Transform
	{
		this.p.Copy(position);
		return this;
	}

	public SetPositionXY(x: number, y: number): b2Transform
	{
		this.p.SetXY(x, y);
		return this;
	}

	public SetRotation(rotation: b2Rot): b2Transform
	{
		this.q.Copy(rotation);
		return this;
	}

	public SetRotationAngleRadians(radians: number): b2Transform
	{
		this.q.SetAngleRadians(radians);
		return this;
	}

	public GetPosition(): b2Vec2
	{
		return this.p;
	}

	public GetRotation(): b2Rot
	{
		return this.q;
	}

	public GetRotationAngleRadians(): number
	{
		return this.q.GetAngleRadians();
	}

	public GetAngleRadians(): number
	{
		return this.q.GetAngleRadians();
	}
}

export function b2MulXV(T: b2Transform, v: b2Vec2, out: b2Vec2): b2Vec2
{
//	float32 x = (T.q.c * v.x - T.q.s * v.y) + T.p.x;
//	float32 y = (T.q.s * v.x + T.q.c * v.y) + T.p.y;
//
//	return b2Vec2(x, y);
	var T_q_c: number = T.q.c, T_q_s: number = T.q.s;
	var v_x: number = v.x, v_y: number = v.y;
	out.x = (T_q_c * v_x - T_q_s * v_y) + T.p.x;
	out.y = (T_q_s * v_x + T_q_c * v_y) + T.p.y;
	return out;
}

export function b2MulTXV(T: b2Transform, v: b2Vec2, out: b2Vec2): b2Vec2
{
//	float32 px = v.x - T.p.x;
//	float32 py = v.y - T.p.y;
//	float32 x = (T.q.c * px + T.q.s * py);
//	float32 y = (-T.q.s * px + T.q.c * py);
//
//	return b2Vec2(x, y);
	var T_q_c: number = T.q.c, T_q_s: number = T.q.s;
	var p_x: number = v.x - T.p.x;
	var p_y: number = v.y - T.p.y;
	out.x = ( T_q_c * p_x + T_q_s * p_y);
	out.y = (-T_q_s * p_x + T_q_c * p_y);
	return out;
}

export function b2MulXX(A: b2Transform, B: b2Transform, out: b2Transform): b2Transform
{
	b2MulRR(A.q, B.q, out.q);
	b2AddVV(b2MulRV(A.q, B.p, out.p), A.p, out.p);
	return out;
}

export function b2MulTXX(A: b2Transform, B: b2Transform, out: b2Transform): b2Transform
{
	b2MulTRR(A.q, B.q, out.q);
	b2MulTRV(A.q, b2SubVV(B.p, A.p, out.p), out.p);
	return out;
}

/// This describes the motion of a body/shape for TOI computation.
/// Shapes are defined with respect to the body origin, which may
/// no coincide with the center of mass. However, to support dynamics
/// we must interpolate the center of mass position.
export class b2Sweep
{
	public localCenter: b2Vec2 = new b2Vec2();
	public c0: b2Vec2 = new b2Vec2();
	public c: b2Vec2 = new b2Vec2();
	public a0: number = 0;
	public a: number = 0;
	public alpha0: number = 0;

	public Clone(): b2Sweep
	{
		return new b2Sweep().Copy(this);
	}

	public Copy(other: b2Sweep): b2Sweep
	{
		//if (ENABLE_ASSERTS) { b2Assert(this !== other); }
		this.localCenter.Copy(other.localCenter);
		this.c0.Copy(other.c0);
		this.c.Copy(other.c);
		this.a0 = other.a0;
		this.a = other.a;
		this.alpha0 = other.alpha0;
		return this;
	}

	public GetTransform(xf: b2Transform, beta: number): b2Transform
	{
		var one_minus_beta: number = (1 - beta);
		xf.p.x = one_minus_beta * this.c0.x + beta * this.c.x;
		xf.p.y = one_minus_beta * this.c0.y + beta * this.c.y;
		var angle: number = one_minus_beta * this.a0 + beta * this.a;
		xf.q.SetAngleRadians(angle);

		xf.p.SelfSub(b2MulRV(xf.q, this.localCenter, b2Vec2.s_t0));
		return xf;
	}

	public Advance(alpha: number): void
	{
		if (ENABLE_ASSERTS) { b2Assert(this.alpha0 < 1); }
		var beta: number = (alpha - this.alpha0) / (1 - this.alpha0);
		var one_minus_beta: number = (1 - beta);
		this.c0.x = one_minus_beta * this.c0.x + beta * this.c.x;
		this.c0.y = one_minus_beta * this.c0.y + beta * this.c.y;
		this.a0 = one_minus_beta * this.a0 + beta * this.a;
		this.alpha0 = alpha;
	}

	public Normalize(): void
	{
		var d: number = b2_two_pi * Math.floor(this.a0 / b2_two_pi);
		this.a0 -= d;
		this.a -= d;
	}
}
