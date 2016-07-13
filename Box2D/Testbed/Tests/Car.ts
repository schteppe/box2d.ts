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

import {Test, Settings, DRAW_STRING_NEW_LINE, KeyCode} from '../Framework/Test';
import {b2Vec2, b2Max} from '../../../Box2D/Box2D/Common/b2Math';
import {b2_pi} from '../../../Box2D/Box2D/Common/b2Settings';
import {b2EdgeShape} from '../../../Box2D/Box2D/Collision/Shapes/b2EdgeShape';
import {b2PolygonShape} from '../../../Box2D/Box2D/Collision/Shapes/b2PolygonShape';
import {b2CircleShape} from '../../../Box2D/Box2D/Collision/Shapes/b2CircleShape';
import {b2Body, b2BodyType, b2BodyDef} from '../../../Box2D/Box2D/Dynamics/b2Body';
import {b2FixtureDef} from '../../../Box2D/Box2D/Dynamics/b2Fixture';
import {b2WheelJoint, b2WheelJointDef} from '../../../Box2D/Box2D/Dynamics/Joints/b2WheelJoint';
import {b2RevoluteJointDef} from '../../../Box2D/Box2D/Dynamics/Joints/b2RevoluteJoint';

// This is a fun demo that shows off the wheel joint
export class Car extends Test
{
	public m_car: b2Body = null;
	public m_wheel1: b2Body = null;
	public m_wheel2: b2Body = null;
	public m_hz: number = 0.0;
	public m_zeta: number = 0.0;
	public m_speed: number = 0.0;
	public m_spring1: b2WheelJoint = null;
	public m_spring2: b2WheelJoint = null;

	constructor(canvas: HTMLCanvasElement, settings: Settings)
	{
		super(canvas, settings); // base class constructor

		this.m_hz = 4.0;
		this.m_zeta = 0.7;
		this.m_speed = 50.0;

		var ground: b2Body = null;
		if (true)
		{
			var bd: b2BodyDef = new b2BodyDef();
			ground = this.m_world.CreateBody(bd);

			var edge_shape: b2EdgeShape = new b2EdgeShape();

			var fd: b2FixtureDef = new b2FixtureDef();
			fd.shape = edge_shape;
			fd.density = 0.0;
			fd.friction = 0.6;

			edge_shape.SetAsEdge(new b2Vec2(-20.0, 0.0), new b2Vec2(20.0, 0.0));
			ground.CreateFixture(fd);

			var hs: number[] = [0.25, 1.0, 4.0, 0.0, 0.0, -1.0, -2.0, -2.0, -1.25, 0.0];

			var x: number = 20.0, y1 = 0.0, dx = 5.0;

			for (var i: number = 0; i < 10; ++i)
			{
				var y2: number = hs[i];
				edge_shape.SetAsEdge(new b2Vec2(x, y1), new b2Vec2(x + dx, y2));
				ground.CreateFixture(fd);
				y1 = y2;
				x += dx;
			}

			for (var i: number = 0; i < 10; ++i)
			{
				var y2: number = hs[i];
				edge_shape.SetAsEdge(new b2Vec2(x, y1), new b2Vec2(x + dx, y2));
				ground.CreateFixture(fd);
				y1 = y2;
				x += dx;
			}

			edge_shape.SetAsEdge(new b2Vec2(x, 0.0), new b2Vec2(x + 40.0, 0.0));
			ground.CreateFixture(fd);

			x += 80.0;
			edge_shape.SetAsEdge(new b2Vec2(x, 0.0), new b2Vec2(x + 40.0, 0.0));
			ground.CreateFixture(fd);

			x += 40.0;
			edge_shape.SetAsEdge(new b2Vec2(x, 0.0), new b2Vec2(x + 10.0, 5.0));
			ground.CreateFixture(fd);

			x += 20.0;
			edge_shape.SetAsEdge(new b2Vec2(x, 0.0), new b2Vec2(x + 40.0, 0.0));
			ground.CreateFixture(fd);

			x += 40.0;
			edge_shape.SetAsEdge(new b2Vec2(x, 0.0), new b2Vec2(x, 20.0));
			ground.CreateFixture(fd);
		}

		// Teeter
		if (true)
		{
			var bd: b2BodyDef = new b2BodyDef();
			bd.position.SetXY(140.0, 1.0);
			bd.type = b2BodyType.b2_dynamicBody;
			var body: b2Body = this.m_world.CreateBody(bd);

			var box: b2PolygonShape = new b2PolygonShape();
			box.SetAsBox(10.0, 0.25);
			body.CreateFixture2(box, 1.0);

			var jd: b2RevoluteJointDef = new b2RevoluteJointDef();
			jd.Initialize(ground, body, body.GetPosition());
			jd.lowerAngle = -8.0 * b2_pi / 180.0;
			jd.upperAngle = 8.0 * b2_pi / 180.0;
			jd.enableLimit = true;
			this.m_world.CreateJoint(jd);

			body.ApplyAngularImpulse(100.0);
		}

		// Bridge
		if (true)
		{
			var N: number = 20;
			var polygon_shape: b2PolygonShape = new b2PolygonShape();
			polygon_shape.SetAsBox(1.0, 0.125);

			var fd: b2FixtureDef = new b2FixtureDef();
			fd.shape = polygon_shape;
			fd.density = 1.0;
			fd.friction = 0.6;

			var jd: b2RevoluteJointDef = new b2RevoluteJointDef();

			var prevBody: b2Body = ground;
			for (var i: number = 0; i < N; ++i)
			{
				var bd: b2BodyDef = new b2BodyDef();
				bd.type = b2BodyType.b2_dynamicBody;
				bd.position.SetXY(161.0 + 2.0 * i, -0.125);
				var body: b2Body = this.m_world.CreateBody(bd);
				body.CreateFixture(fd);

				var anchor: b2Vec2 = new b2Vec2(160.0 + 2.0 * i, -0.125);
				jd.Initialize(prevBody, body, anchor);
				this.m_world.CreateJoint(jd);

				prevBody = body;
			}

			var anchor: b2Vec2 = new b2Vec2(160.0 + 2.0 * N, -0.125);
			jd.Initialize(prevBody, ground, anchor);
			this.m_world.CreateJoint(jd);
		}

		// Boxes
		if (true)
		{
			var box: b2PolygonShape = new b2PolygonShape();
			box.SetAsBox(0.5, 0.5);

			var body: b2Body = null;
			var bd: b2BodyDef = new b2BodyDef();
			bd.type = b2BodyType.b2_dynamicBody;

			bd.position.SetXY(230.0, 0.5);
			body = this.m_world.CreateBody(bd);
			body.CreateFixture2(box, 0.5);

			bd.position.SetXY(230.0, 1.5);
			body = this.m_world.CreateBody(bd);
			body.CreateFixture2(box, 0.5);

			bd.position.SetXY(230.0, 2.5);
			body = this.m_world.CreateBody(bd);
			body.CreateFixture2(box, 0.5);

			bd.position.SetXY(230.0, 3.5);
			body = this.m_world.CreateBody(bd);
			body.CreateFixture2(box, 0.5);

			bd.position.SetXY(230.0, 4.5);
			body = this.m_world.CreateBody(bd);
			body.CreateFixture2(box, 0.5);
		}

		// Car
		if (true)
		{
			var chassis: b2PolygonShape = new b2PolygonShape();
			var vertices: b2Vec2[] = b2Vec2.MakeArray(8);
			vertices[0].SetXY(-1.5, -0.5);
			vertices[1].SetXY(1.5, -0.5);
			vertices[2].SetXY(1.5, 0.0);
			vertices[3].SetXY(0.0, 0.9);
			vertices[4].SetXY(-1.15, 0.9);
			vertices[5].SetXY(-1.5, 0.2);
			chassis.SetAsVector(vertices, 6);

			var circle: b2CircleShape = new b2CircleShape();
			circle.m_radius = 0.4;

			var bd: b2BodyDef = new b2BodyDef();
			bd.type = b2BodyType.b2_dynamicBody;
			bd.position.SetXY(0.0, 1.0);
			this.m_car = this.m_world.CreateBody(bd);
			this.m_car.CreateFixture2(chassis, 1.0);

			var fd: b2FixtureDef = new b2FixtureDef();
			fd.shape = circle;
			fd.density = 1.0;
			fd.friction = 0.9;

			bd.position.SetXY(-1.0, 0.35);
			this.m_wheel1 = this.m_world.CreateBody(bd);
			this.m_wheel1.CreateFixture(fd);

			bd.position.SetXY(1.0, 0.4);
			this.m_wheel2 = this.m_world.CreateBody(bd);
			this.m_wheel2.CreateFixture(fd);

			var wjd: b2WheelJointDef = new b2WheelJointDef();
			var axis: b2Vec2 = new b2Vec2(0.0, 1.0);

			wjd.Initialize(this.m_car, this.m_wheel1, this.m_wheel1.GetPosition(), axis);
			wjd.motorSpeed = 0.0;
			wjd.maxMotorTorque = 20.0;
			wjd.enableMotor = true;
			wjd.frequencyHz = this.m_hz;
			wjd.dampingRatio = this.m_zeta;
			this.m_spring1 = <b2WheelJoint> this.m_world.CreateJoint(wjd);

			wjd.Initialize(this.m_car, this.m_wheel2, this.m_wheel2.GetPosition(), axis);
			wjd.motorSpeed = 0.0;
			wjd.maxMotorTorque = 10.0;
			wjd.enableMotor = false;
			wjd.frequencyHz = this.m_hz;
			wjd.dampingRatio = this.m_zeta;
			this.m_spring2 = <b2WheelJoint> this.m_world.CreateJoint(wjd);
		}
	}

	public Keyboard(key: KeyCode): void
	{
		switch (key)
		{
		case KeyCode.A:
			this.m_spring1.SetMotorSpeed(this.m_speed);
			break;

		case KeyCode.S:
			this.m_spring1.SetMotorSpeed(0.0);
			break;

		case KeyCode.D:
			this.m_spring1.SetMotorSpeed(-this.m_speed);
			break;

		case KeyCode.Q:
			this.m_hz = b2Max(0.0, this.m_hz - 1.0);
			this.m_spring1.SetSpringFrequencyHz(this.m_hz);
			this.m_spring2.SetSpringFrequencyHz(this.m_hz);
			break;

		case KeyCode.E:
			this.m_hz += 1.0;
			this.m_spring1.SetSpringFrequencyHz(this.m_hz);
			this.m_spring2.SetSpringFrequencyHz(this.m_hz);
			break;
		}
	}

	public Step(settings: Settings): void
	{
		this.m_debugDraw.DrawString(5, this.m_textLine, "Keys: left = a, brake = s, right = d, hz down = q, hz up = e");
		this.m_textLine += DRAW_STRING_NEW_LINE;
		this.m_debugDraw.DrawString(5, this.m_textLine, "frequency = " + this.m_hz.toFixed(2) + " hz, damping ratio = " + this.m_zeta.toFixed(2));
		this.m_textLine += DRAW_STRING_NEW_LINE;

		settings.viewCenter.x = this.m_car.GetPosition().x;
		super.Step(settings);
	}

	public static Create(canvas: HTMLCanvasElement, settings: Settings): Test
	{
		return new Car(canvas, settings);
	}
}
