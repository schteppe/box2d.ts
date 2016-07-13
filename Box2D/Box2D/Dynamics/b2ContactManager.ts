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

import {ENABLE_ASSERTS, b2Assert} from '../Common/b2Settings';
import {b2BroadPhase} from '../Collision/b2BroadPhase';
import {b2Fixture, b2FixtureProxy} from './b2Fixture';
import {b2Body, b2BodyType} from './b2Body';
import {b2Contact, b2ContactEdge, b2ContactFlag} from './Contacts/b2Contact';
import {b2ContactFactory} from './Contacts/b2ContactFactory';
import {b2ContactFilter, b2ContactListener} from './b2WorldCallbacks';
import {b2TreeNode} from '../Collision/b2DynamicTree';

// Delegate of b2World.
export class b2ContactManager
{
	public m_broadPhase: b2BroadPhase = new b2BroadPhase();
	public m_contactList: b2Contact = null;
	public m_contactCount: number = 0;
	public m_contactFilter: b2ContactFilter = b2ContactFilter.b2_defaultFilter;
	public m_contactListener: b2ContactListener = b2ContactListener.b2_defaultListener;
	public m_allocator: any = null;

	public m_contactFactory: b2ContactFactory = null;

	constructor()
	{
		this.m_contactFactory = new b2ContactFactory(this.m_allocator);
	}

	// Broad-phase callback.
	public AddPair(proxyUserDataA, proxyUserDataB)
	{
		if (ENABLE_ASSERTS) { b2Assert(proxyUserDataA instanceof b2FixtureProxy); }
		if (ENABLE_ASSERTS) { b2Assert(proxyUserDataB instanceof b2FixtureProxy); }
		var proxyA: b2FixtureProxy = proxyUserDataA;//(proxyUserDataA instanceof b2FixtureProxy ? proxyUserDataA : null);
		var proxyB: b2FixtureProxy = proxyUserDataB;//(proxyUserDataB instanceof b2FixtureProxy ? proxyUserDataB : null);

		var fixtureA: b2Fixture = proxyA.fixture;
		var fixtureB: b2Fixture = proxyB.fixture;

		var indexA: number = proxyA.childIndex;
		var indexB: number = proxyB.childIndex;

		var bodyA: b2Body = fixtureA.GetBody();
		var bodyB: b2Body = fixtureB.GetBody();

		// Are the fixtures on the same body?
		if (bodyA == bodyB)
		{
			return;
		}

		// TODO_ERIN use a hash table to remove a potential bottleneck when both
		// bodies have a lot of contacts.
		// Does a contact already exist?
		var edge: b2ContactEdge = bodyB.GetContactList();
		while (edge)
		{
			if (edge.other == bodyA)
			{
				var fA: b2Fixture = edge.contact.GetFixtureA();
				var fB: b2Fixture = edge.contact.GetFixtureB();
				var iA: number = edge.contact.GetChildIndexA();
				var iB: number = edge.contact.GetChildIndexB();

				if (fA == fixtureA && fB == fixtureB && iA == indexA && iB == indexB)
				{
					// A contact already exists.
					return;
				}

				if (fA == fixtureB && fB == fixtureA && iA == indexB && iB == indexA)
				{
					// A contact already exists.
					return;
				}
			}

			edge = edge.next;
		}

		// Does a joint override collision? Is at least one body dynamic?
		if (bodyB.ShouldCollide(bodyA) == false)
		{
			return;
		}

		// Check user filtering.
		if (this.m_contactFilter && this.m_contactFilter.ShouldCollide(fixtureA, fixtureB) == false)
		{
			return;
		}

		// Call the factory.
		var c: b2Contact = this.m_contactFactory.Create(fixtureA, indexA, fixtureB, indexB);
		if (c == null)
		{
			return;
		}

		// Contact creation may swap fixtures.
		fixtureA = c.GetFixtureA();
		fixtureB = c.GetFixtureB();
		indexA = c.GetChildIndexA();
		indexB = c.GetChildIndexB();
		bodyA = fixtureA.m_body;
		bodyB = fixtureB.m_body;

		// Insert into the world.
		c.m_prev = null;
		c.m_next = this.m_contactList;
		if (this.m_contactList !== null)
		{
			this.m_contactList.m_prev = c;
		}
		this.m_contactList = c;

		// Connect to island graph.

		// Connect to body A
		c.m_nodeA.contact = c;
		c.m_nodeA.other = bodyB;

		c.m_nodeA.prev = null;
		c.m_nodeA.next = bodyA.m_contactList;
		if (bodyA.m_contactList != null)
		{
			bodyA.m_contactList.prev = c.m_nodeA;
		}
		bodyA.m_contactList = c.m_nodeA;

		// Connect to body B
		c.m_nodeB.contact = c;
		c.m_nodeB.other = bodyA;

		c.m_nodeB.prev = null;
		c.m_nodeB.next = bodyB.m_contactList;
		if (bodyB.m_contactList != null)
		{
			bodyB.m_contactList.prev = c.m_nodeB;
		}
		bodyB.m_contactList = c.m_nodeB;

		// Wake up the bodies
		if (fixtureA.IsSensor() == false && fixtureB.IsSensor() == false)
		{
			bodyA.SetAwake(true);
			bodyB.SetAwake(true);
		}

		++this.m_contactCount;
	}

	public FindNewContacts()
	{
		this.m_broadPhase.UpdatePairs(this);
	}

	public Destroy(c)
	{
		var fixtureA: b2Fixture = c.GetFixtureA();
		var fixtureB: b2Fixture = c.GetFixtureB();
		var bodyA: b2Body = fixtureA.GetBody();
		var bodyB: b2Body = fixtureB.GetBody();

		if (this.m_contactListener && c.IsTouching())
		{
			this.m_contactListener.EndContact(c);
		}

		// Remove from the world.
		if (c.m_prev)
		{
			c.m_prev.m_next = c.m_next;
		}

		if (c.m_next)
		{
			c.m_next.m_prev = c.m_prev;
		}

		if (c == this.m_contactList)
		{
			this.m_contactList = c.m_next;
		}

		// Remove from body 1
		if (c.m_nodeA.prev)
		{
			c.m_nodeA.prev.next = c.m_nodeA.next;
		}

		if (c.m_nodeA.next)
		{
			c.m_nodeA.next.prev = c.m_nodeA.prev;
		}

		if (c.m_nodeA == bodyA.m_contactList)
		{
			bodyA.m_contactList = c.m_nodeA.next;
		}

		// Remove from body 2
		if (c.m_nodeB.prev)
		{
			c.m_nodeB.prev.next = c.m_nodeB.next;
		}

		if (c.m_nodeB.next)
		{
			c.m_nodeB.next.prev = c.m_nodeB.prev;
		}

		if (c.m_nodeB == bodyB.m_contactList)
		{
			bodyB.m_contactList = c.m_nodeB.next;
		}

		// Call the factory.
		this.m_contactFactory.Destroy(c);
		--this.m_contactCount;
	}

	// This is the top level collision call for the time step. Here
	// all the narrow phase collision is processed for the world
	// contact list.
	public Collide()
	{
		// Update awake contacts.
		var c: b2Contact = this.m_contactList;
		while (c)
		{
			var fixtureA: b2Fixture = c.GetFixtureA();
			var fixtureB: b2Fixture = c.GetFixtureB();
			var indexA: number = c.GetChildIndexA();
			var indexB: number = c.GetChildIndexB();
			var bodyA: b2Body = fixtureA.GetBody();
			var bodyB: b2Body = fixtureB.GetBody();

			// Is this contact flagged for filtering?
			if (c.m_flags & b2ContactFlag.e_filterFlag)
			{
				// Should these bodies collide?
				if (bodyB.ShouldCollide(bodyA) == false)
				{
					var cNuke: b2Contact = c;
					c = cNuke.m_next;
					this.Destroy(cNuke);
					continue;
				}

				// Check user filtering.
				if (this.m_contactFilter && this.m_contactFilter.ShouldCollide(fixtureA, fixtureB) == false)
				{
					var cNuke: b2Contact = c;
					c = cNuke.m_next;
					this.Destroy(cNuke);
					continue;
				}

				// Clear the filtering flag.
				c.m_flags &= ~b2ContactFlag.e_filterFlag;
			}

			var activeA: boolean = bodyA.IsAwake() && bodyA.m_type != b2BodyType.b2_staticBody;
			var activeB: boolean = bodyB.IsAwake() && bodyB.m_type != b2BodyType.b2_staticBody;

			// At least one body must be awake and it must be dynamic or kinematic.
			if (activeA == false && activeB == false)
			{
				c = c.m_next;
				continue;
			}

			var proxyA: b2TreeNode = fixtureA.m_proxies[indexA].proxy;
			var proxyB: b2TreeNode = fixtureB.m_proxies[indexB].proxy;
			var overlap: boolean = this.m_broadPhase.TestOverlap(proxyA, proxyB);

			// Here we destroy contacts that cease to overlap in the broad-phase.
			if (overlap == false)
			{
				var cNuke: b2Contact = c;
				c = cNuke.m_next;
				this.Destroy(cNuke);
				continue;
			}

			// The contact persists.
			c.Update(this.m_contactListener);
			c = c.m_next;
		}
	}
}



