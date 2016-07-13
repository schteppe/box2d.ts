import * as b2BroadPhase from './Box2D/Box2D/Collision/b2BroadPhase';
import * as b2CollideCircle from './Box2D/Box2D/Collision/b2CollideCircle';
import * as b2CollideEdge from './Box2D/Box2D/Collision/b2CollideEdge';
import * as b2CollidePolygon from './Box2D/Box2D/Collision/b2CollidePolygon';
import * as b2Collision from './Box2D/Box2D/Collision/b2Collision';
import * as b2Distance from './Box2D/Box2D/Collision/b2Distance';
import * as b2DynamicTree from './Box2D/Box2D/Collision/b2DynamicTree';
import * as b2TimeOfImpact from './Box2D/Box2D/Collision/b2TimeOfImpact';
import * as b2ChainShape from './Box2D/Box2D/Collision/Shapes/b2ChainShape';
import * as b2CircleShape from './Box2D/Box2D/Collision/Shapes/b2CircleShape';
import * as b2EdgeShape from './Box2D/Box2D/Collision/Shapes/b2EdgeShape';
import * as b2PolygonShape from './Box2D/Box2D/Collision/Shapes/b2PolygonShape';
import * as b2Shape from './Box2D/Box2D/Collision/Shapes/b2Shape';
import * as b2Draw from './Box2D/Box2D/Common/b2Draw';
import * as b2GrowableStack from './Box2D/Box2D/Common/b2GrowableStack';
import * as b2Math from './Box2D/Box2D/Common/b2Math';
import * as b2Settings from './Box2D/Box2D/Common/b2Settings';
import * as b2Timer from './Box2D/Box2D/Common/b2Timer';
import * as b2Body from './Box2D/Box2D/Dynamics/b2Body';
import * as b2ContactManager from './Box2D/Box2D/Dynamics/b2ContactManager';
import * as b2Fixture from './Box2D/Box2D/Dynamics/b2Fixture';
import * as b2Island from './Box2D/Box2D/Dynamics/b2Island';
import * as b2TimeStep from './Box2D/Box2D/Dynamics/b2TimeStep';
import * as b2World from './Box2D/Box2D/Dynamics/b2World';
import * as b2WorldCallbacks from './Box2D/Box2D/Dynamics/b2WorldCallbacks';
import * as b2ChainAndCircleContact from './Box2D/Box2D/Dynamics/Contacts/b2ChainAndCircleContact';
import * as b2ChainAndPolygonContact from './Box2D/Box2D/Dynamics/Contacts/b2ChainAndPolygonContact';
import * as b2CircleContact from './Box2D/Box2D/Dynamics/Contacts/b2CircleContact';
import * as b2Contact from './Box2D/Box2D/Dynamics/Contacts/b2Contact';
import * as b2ContactFactory from './Box2D/Box2D/Dynamics/Contacts/b2ContactFactory';
import * as b2ContactSolver from './Box2D/Box2D/Dynamics/Contacts/b2ContactSolver';
import * as b2EdgeAndCircleContact from './Box2D/Box2D/Dynamics/Contacts/b2EdgeAndCircleContact';
import * as b2EdgeAndPolygonContact from './Box2D/Box2D/Dynamics/Contacts/b2EdgeAndPolygonContact';
import * as b2PolygonAndCircleContact from './Box2D/Box2D/Dynamics/Contacts/b2PolygonAndCircleContact';
import * as b2PolygonContact from './Box2D/Box2D/Dynamics/Contacts/b2PolygonContact';
import * as b2AreaJoint from './Box2D/Box2D/Dynamics/Joints/b2AreaJoint';
import * as b2DistanceJoint from './Box2D/Box2D/Dynamics/Joints/b2DistanceJoint';
import * as b2FrictionJoint from './Box2D/Box2D/Dynamics/Joints/b2FrictionJoint';
import * as b2GearJoint from './Box2D/Box2D/Dynamics/Joints/b2GearJoint';
import * as b2Joint from './Box2D/Box2D/Dynamics/Joints/b2Joint';
import * as b2JointFactory from './Box2D/Box2D/Dynamics/Joints/b2JointFactory';
import * as b2MotorJoint from './Box2D/Box2D/Dynamics/Joints/b2MotorJoint';
import * as b2MouseJoint from './Box2D/Box2D/Dynamics/Joints/b2MouseJoint';
import * as b2PrismaticJoint from './Box2D/Box2D/Dynamics/Joints/b2PrismaticJoint';
import * as b2PulleyJoint from './Box2D/Box2D/Dynamics/Joints/b2PulleyJoint';
import * as b2RevoluteJoint from './Box2D/Box2D/Dynamics/Joints/b2RevoluteJoint';
import * as b2RopeJoint from './Box2D/Box2D/Dynamics/Joints/b2RopeJoint';
import * as b2WeldJoint from './Box2D/Box2D/Dynamics/Joints/b2WeldJoint';
import * as b2WheelJoint from './Box2D/Box2D/Dynamics/Joints/b2WheelJoint';
import * as b2Rope from './Box2D/Box2D/Rope/b2Rope';

export = (Object as any).assign({},
    b2BroadPhase,
    b2CollideCircle,
    b2CollideEdge,
    b2CollidePolygon,
    b2Collision,
    b2Distance,
    b2DynamicTree,
    b2TimeOfImpact,
    b2ChainShape,
    b2CircleShape,
    b2EdgeShape,
    b2PolygonShape,
    b2Shape,
    b2Draw,
    b2GrowableStack,
    b2Math,
    b2Settings,
    b2Timer,
    b2Body,
    b2ContactManager,
    b2Fixture,
    b2Island,
    b2TimeStep,
    b2World,
    b2WorldCallbacks,
    b2ChainAndCircleContact,
    b2ChainAndPolygonContact,
    b2CircleContact,
    b2Contact,
    b2ContactFactory,
    b2ContactSolver,
    b2EdgeAndCircleContact,
    b2EdgeAndPolygonContact,
    b2PolygonAndCircleContact,
    b2PolygonContact,
    b2AreaJoint,
    b2DistanceJoint,
    b2FrictionJoint,
    b2GearJoint,
    b2Joint,
    b2JointFactory,
    b2MotorJoint,
    b2MouseJoint,
    b2PrismaticJoint,
    b2PulleyJoint,
    b2RevoluteJoint,
    b2RopeJoint,
    b2WeldJoint,
    b2WheelJoint,
    b2Rope
);