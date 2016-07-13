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

import {TestEntry} from '../../../Box2D/Testbed/Framework/Test';
import {SphereStack} from '../../../Box2D/Testbed/Tests/SphereStack';
import {Car} from '../../../Box2D/Testbed/Tests/Car';

//goog.require('AddPair');
//goog.require('ApplyForce');
//goog.require('BodyTypes');
//goog.require('Breakable');
//goog.require('Bridge');
//goog.require('BulletTest');
//goog.require('Cantilever');
///<reference path='../../../Box2D/Testbed/Tests/Car.ts' />
//goog.require('ContinuousTest');
//goog.require('Chain');
//goog.require('CharacterCollision');
//goog.require('CollisionFiltering');
//goog.require('CollisionProcessing');
//goog.require('CompoundShapes');
//goog.require('Confined');
//goog.require('ConvexHull');
//goog.require('ConveyorBelt');
//goog.require('DistanceTest');
//goog.require('Dominos');
//goog.require('DumpShell');
//goog.require('DynamicTreeTest');
//goog.require('EdgeShapes');
//goog.require('EdgeTest');
//goog.require('Gears');
//goog.require('Mobile');
//goog.require('MobileBalanced');
//goog.require('MotorJoint');
//goog.require('OneSidedPlatform');
//goog.require('Pinball');
//goog.require('PolyCollision');
//goog.require('PolyShapes');
//goog.require('Prismatic');
//goog.require('Pulleys');
//goog.require('Pyramid');
//goog.require('RayCast');
//goog.require('Revolute');
//goog.require('Rope');
//goog.require('RopeJoint');
//goog.require('SensorTest');
//goog.require('ShapeEditing');
//goog.require('SliderCrank');
///<reference path='../../../Box2D/Testbed/Tests/SphereStack.ts' />
//goog.require('TheoJansen');
//goog.require('Tiles');
//goog.require('TimeOfImpact');
//goog.require('Tumbler');
//goog.require('VaryingFriction');
//goog.require('VaryingRestitution');
//goog.require('VerticalStack');
//goog.require('Web');

//goog.require('BlobTest');
//goog.require('BuoyancyTest');

//goog.require('TestCCD');
//goog.require('TestRagdoll');
//goog.require('TestStack');

export function GetTestEntries(entries: TestEntry[]): TestEntry[]
{
//	entries.push(new TestEntry("Continuous Test", ContinuousTest.Create));
//	entries.push(new TestEntry("Time of Impact", TimeOfImpact.Create));
//	entries.push(new TestEntry("Motor Joint", MotorJoint.Create));
//	entries.push(new TestEntry("Mobile", Mobile.Create));
//	entries.push(new TestEntry("MobileBalanced", MobileBalanced.Create));
//	entries.push(new TestEntry("Ray-Cast", RayCast.Create));
//	entries.push(new TestEntry("Conveyor Belt", ConveyorBelt.Create));
//	entries.push(new TestEntry("Gears", Gears.Create));
//	entries.push(new TestEntry("Convex Hull", ConvexHull.Create));
//	entries.push(new TestEntry("Varying Restitution", VaryingRestitution.Create));
//	entries.push(new TestEntry("Tumbler", Tumbler.Create));
//	entries.push(new TestEntry("Tiles", Tiles.Create));
//	entries.push(new TestEntry("Dump Shell", DumpShell.Create));
//	entries.push(new TestEntry("Cantilever", Cantilever.Create));
//	entries.push(new TestEntry("Character Collision", CharacterCollision.Create));
//	entries.push(new TestEntry("Edge Test", EdgeTest.Create));
//	entries.push(new TestEntry("Body Types", BodyTypes.Create));
//	entries.push(new TestEntry("Shape Editing", ShapeEditing.Create));
	entries.push(new TestEntry("Car", Car.Create));
//	entries.push(new TestEntry("Apply Force", ApplyForce.Create));
//	entries.push(new TestEntry("Prismatic", Prismatic.Create));
//	entries.push(new TestEntry("Vertical Stack", VerticalStack.Create));
	entries.push(new TestEntry("SphereStack", SphereStack.Create));
//	entries.push(new TestEntry("Revolute", Revolute.Create));
//	entries.push(new TestEntry("Pulleys", Pulleys.Create));
//	entries.push(new TestEntry("Polygon Shapes", PolyShapes.Create));
//	entries.push(new TestEntry("Rope", Rope.Create));
//	entries.push(new TestEntry("Web", Web.Create));
//	entries.push(new TestEntry("RopeJoint", RopeJoint.Create));
//	entries.push(new TestEntry("One-Sided Platform", OneSidedPlatform.Create));
//	entries.push(new TestEntry("Pinball", Pinball.Create));
//	entries.push(new TestEntry("Bullet Test", BulletTest.Create));
//	entries.push(new TestEntry("Confined", Confined.Create));
//	entries.push(new TestEntry("Pyramid", Pyramid.Create));
//	entries.push(new TestEntry("Theo Jansen's Walker", TheoJansen.Create));
//	entries.push(new TestEntry("Edge Shapes", EdgeShapes.Create));
//	entries.push(new TestEntry("PolyCollision", PolyCollision.Create));
//	entries.push(new TestEntry("Bridge", Bridge.Create));
//	entries.push(new TestEntry("Breakable", Breakable.Create));
//	entries.push(new TestEntry("Chain", Chain.Create));
//	entries.push(new TestEntry("Collision Filtering", CollisionFiltering.Create));
//	entries.push(new TestEntry("Collision Processing", CollisionProcessing.Create));
//	entries.push(new TestEntry("Compound Shapes", CompoundShapes.Create));
//	entries.push(new TestEntry("Distance Test", DistanceTest.Create));
//	entries.push(new TestEntry("Dominos", Dominos.Create));
//	entries.push(new TestEntry("Dynamic Tree", DynamicTreeTest.Create));
//	entries.push(new TestEntry("Sensor Test", SensorTest.Create));
//	entries.push(new TestEntry("Slider Crank", SliderCrank.Create));
//	entries.push(new TestEntry("Varying Friction", VaryingFriction.Create));
//	entries.push(new TestEntry("Add Pair Stress Test", AddPair.Create));

//	entries.push(new TestEntry("Blob Test", BlobTest.Create));
//	entries.push(new TestEntry("Buoyancy Test", BuoyancyTest.Create));

//	entries.push(new TestEntry("Continuous Collision", TestCCD.Create));
//	entries.push(new TestEntry("Ragdolls", TestRagdoll.Create));
//	entries.push(new TestEntry("Stacked Boxes", TestStack.Create));

	return entries;
}
