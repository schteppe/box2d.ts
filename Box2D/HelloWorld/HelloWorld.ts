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

///<reference path='../../Box2D/Box2D/Box2D.ts' />

module box2d.HelloWorld {

// This is a simple example of building and running a simulation
// using Box2D. Here we create a large ground box and a small dynamic
// box.
// There are no graphics for this example. Box2D is meant to be used
// with your rendering engine in your game engine.
export function main()
{
//	var pre = document.body.appendChild(document.createElement('pre'));

	// Define the gravity vector.
	var gravity: b2Vec2 = new b2Vec2(0, -10);

	// Construct a world object, which will hold and simulate the rigid bodies.
	var world: b2World = new b2World(gravity);

	// Define the ground body.
	var groundBodyDef: b2BodyDef = new b2BodyDef();
	groundBodyDef.position.SetXY(0, -10);

	// Call the body factory which allocates memory for the ground body
	// from a pool and creates the ground box shape (also from a pool).
	// The body is also added to the world.
	var groundBody: b2Body = world.CreateBody(groundBodyDef);

	// Define the ground box shape.
	var groundBox: b2PolygonShape = new b2PolygonShape();

	// The extents are the half-widths of the box.
	groundBox.SetAsBox(50, 10);

	// Add the ground fixture to the ground body.
	groundBody.CreateFixture2(groundBox, 0);

	// Define the dynamic body. We set its position and call the body factory.
	var bodyDef: b2BodyDef = new b2BodyDef();
	bodyDef.type = b2BodyType.b2_dynamicBody;
	bodyDef.position.SetXY(0, 4);
	var body: b2Body = world.CreateBody(bodyDef);

	// Define another box shape for our dynamic body.
	var dynamicBox: b2PolygonShape = new b2PolygonShape();
	dynamicBox.SetAsBox(1, 1);

	// Define the dynamic body fixture.
	var fixtureDef: b2FixtureDef = new b2FixtureDef();
	fixtureDef.shape = dynamicBox;

	// Set the box density to be non-zero, so it will be dynamic.
	fixtureDef.density = 1;

	// Override the default friction.
	fixtureDef.friction = 0.3;

	// Add the shape to the body.
	body.CreateFixture(fixtureDef);

	// Prepare for simulation. Typically we use a time step of 1/60 of a
	// second (60Hz) and 10 iterations. This provides a high quality simulation
	// in most game scenarios.
	var timeStep: number = 1 / 60;
	var velocityIterations: number = 6;
	var positionIterations: number = 2;

	// This is our little game loop.
	for (var i: number = 0; i < 60; ++i)
	{
		// Instruct the world to perform a single step of simulation.
		// It is generally best to keep the time step and iterations fixed.
		world.Step(timeStep, velocityIterations, positionIterations);

		// Now print the position and angle of the body.
		var position: b2Vec2 = body.GetPosition();
		var angle: number = body.GetAngleRadians();

		console.log(position.x.toFixed(2), position.y.toFixed(2), angle.toFixed(2));
//		var s = goog.string.format("%4.2f %4.2f %4.2f\n", position.x, position.y, angle);
//		console.log(s);
//		pre.innerHTML += s;
	}

	// When the world destructor is called, all bodies and joints are freed. This can
	// create orphaned pointers, so be careful about your world management.

	return 0;
}



