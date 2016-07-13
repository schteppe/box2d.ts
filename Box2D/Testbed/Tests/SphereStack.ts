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

import {Test} from '../Framework/Test';
import {b2Body} from '../../../Box2D/Box2D/Dynamics/b2Body';

export class SphereStack extends Test
{
	public static e_count: number = 10;

	public m_bodies: b2Body[] = null;

	constructor(canvas: HTMLCanvasElement, settings: Settings)
	{
		super(canvas, settings); // base class constructor

		this.m_bodies = new Array(SphereStack.e_count);

		{
			var bd: b2BodyDef = new box2d.b2BodyDef();
			var ground: b2Body = this.m_world.CreateBody(bd);

			var edge_shape: b2EdgeShape = new box2d.b2EdgeShape();
			edge_shape.SetAsEdge(new box2d.b2Vec2(-40.0, 0.0), new box2d.b2Vec2(40.0, 0.0));
			ground.CreateFixture2(edge_shape, 0.0);
		}

		{
			var circle_shape: b2CircleShape = new box2d.b2CircleShape();
			circle_shape.m_radius = 1.0;

			for (var i: number = 0; i < SphereStack.e_count; ++i)
			{
				var bd: b2BodyDef = new box2d.b2BodyDef();
				bd.type = box2d.b2BodyType.b2_dynamicBody;
				bd.position.SetXY(0.0, 4.0 + 3.0 * i);

				this.m_bodies[i] = this.m_world.CreateBody(bd);

				this.m_bodies[i].CreateFixture2(circle_shape, 1.0);

				this.m_bodies[i].SetLinearVelocity(new box2d.b2Vec2(0.0, -50.0));
			}
		}
	}

	public Step(settings: Settings): void
	{
		super.Step(settings);

		//for (var i: number = 0; i < SphereStack.e_count; ++i)
		//{
		//	printf("%g ", this.m_bodies[i].GetWorldCenter().y);
		//}

		//for (var i: number = 0; i < SphereStack.e_count; ++i)
		//{
		//	printf("%g ", this.m_bodies[i].GetLinearVelocity().y);
		//}

		//printf("\n");
	}

	public static Create(canvas: HTMLCanvasElement, settings: Settings): Test
	{
		return new SphereStack(canvas, settings);
	}
}
