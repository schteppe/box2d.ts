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

import {b2Transform} from '../../Common/b2Math';
import {ENABLE_ASSERTS, b2Assert} from '../../Common/b2Settings';
import {b2ShapeType} from '../../Collision/Shapes/b2Shape';
import {b2ChainShape} from '../../Collision/Shapes/b2ChainShape';
import {b2PolygonShape} from '../../Collision/Shapes/b2PolygonShape';
import {b2EdgeShape} from '../../Collision/Shapes/b2EdgeShape';
import {b2Fixture} from '../../Dynamics/b2Fixture';
import {b2Contact} from '../../Dynamics/Contacts/b2Contact';
import {b2CollideEdgeAndPolygon} from '../../Collision/b2CollideEdge';
import {b2Manifold} from '../../Collision/b2Collision';

export class b2ChainAndPolygonContact extends b2Contact
{
	constructor()
	{
		super(); // base class constructor
	}

	public static Create(allocator: any): b2Contact
	{
		return new b2ChainAndPolygonContact();
	}

	public static Destroy(contact: b2Contact, allocator: any): void
	{
	}

	public Reset(fixtureA: b2Fixture, indexA: number, fixtureB: b2Fixture, indexB: number): void
	{
		super.Reset(fixtureA, indexA, fixtureB, indexB);
		if (ENABLE_ASSERTS) { b2Assert(fixtureA.GetType() == b2ShapeType.e_chainShape); }
		if (ENABLE_ASSERTS) { b2Assert(fixtureB.GetType() == b2ShapeType.e_polygonShape); }
	}

	private static Evaluate_s_edge = new b2EdgeShape();
	public Evaluate(manifold: b2Manifold, xfA: b2Transform, xfB: b2Transform): void
	{
		var shapeA = this.m_fixtureA.GetShape();
		var shapeB = this.m_fixtureB.GetShape();
		if (ENABLE_ASSERTS) { b2Assert(shapeA instanceof b2ChainShape); }
		if (ENABLE_ASSERTS) { b2Assert(shapeB instanceof b2PolygonShape); }
		var chain = <b2ChainShape> shapeA;
		var edge = b2ChainAndPolygonContact.Evaluate_s_edge;
		chain.GetChildEdge(edge, this.m_indexA);
		b2CollideEdgeAndPolygon(
			manifold,
			edge, xfA,
			<b2PolygonShape> shapeB, xfB);
	}
}



