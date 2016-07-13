import {ENABLE_ASSERTS, b2Assert} from '../../Common/b2Settings';
import {b2Joint, b2JointDef, b2JointType} from '../../Dynamics/Joints/b2Joint';
import {b2DistanceJoint, b2DistanceJointDef} from '../../Dynamics/Joints/b2DistanceJoint';
import {b2MouseJoint, b2MouseJointDef} from '../../Dynamics/Joints/b2MouseJoint';
import {b2PrismaticJoint, b2PrismaticJointDef} from '../../Dynamics/Joints/b2PrismaticJoint';
import {b2RevoluteJoint, b2RevoluteJointDef} from '../../Dynamics/Joints/b2RevoluteJoint';
import {b2PulleyJoint, b2PulleyJointDef} from '../../Dynamics/Joints/b2PulleyJoint';
import {b2GearJoint, b2GearJointDef} from '../../Dynamics/Joints/b2GearJoint';
import {b2WheelJoint, b2WheelJointDef} from '../../Dynamics/Joints/b2WheelJoint';
import {b2WeldJoint, b2WeldJointDef} from '../../Dynamics/Joints/b2WeldJoint';
import {b2FrictionJoint, b2FrictionJointDef} from '../../Dynamics/Joints/b2FrictionJoint';
import {b2RopeJoint, b2RopeJointDef} from '../../Dynamics/Joints/b2RopeJoint';
import {b2MotorJoint, b2MotorJointDef} from '../../Dynamics/Joints/b2MotorJoint';
import {b2AreaJoint, b2AreaJointDef} from '../../Dynamics/Joints/b2AreaJoint';

export class b2JointFactory
{
	public static Create(def: b2JointDef, allocator: any): b2Joint
	{
		var joint: b2Joint = null;

		switch (def.type)
		{
		case b2JointType.e_distanceJoint:
			joint = new b2DistanceJoint(<b2DistanceJointDef> def);
			break;

		case b2JointType.e_mouseJoint:
			joint = new b2MouseJoint(<b2MouseJointDef>def);
			break;

		case b2JointType.e_prismaticJoint:
			joint = new b2PrismaticJoint(<b2PrismaticJointDef> def);
			break;

		case b2JointType.e_revoluteJoint:
			joint = new b2RevoluteJoint(<b2RevoluteJointDef> def);
			break;

		case b2JointType.e_pulleyJoint:
			joint = new b2PulleyJoint(<b2PulleyJointDef> def);
			break;

		case b2JointType.e_gearJoint:
			joint = new b2GearJoint(<b2GearJointDef> def);
			break;

		case b2JointType.e_wheelJoint:
			joint = new b2WheelJoint(<b2WheelJointDef> def);
			break;

		case b2JointType.e_weldJoint:
			joint = new b2WeldJoint(<b2WeldJointDef> def);
			break;

		case b2JointType.e_frictionJoint:
			joint = new b2FrictionJoint(<b2FrictionJointDef> def);
			break;

		case b2JointType.e_ropeJoint:
			joint = new b2RopeJoint(<b2RopeJointDef> def);
			break;

		case b2JointType.e_motorJoint:
			joint = new b2MotorJoint(<b2MotorJointDef> def);
			break;

		case b2JointType.e_areaJoint:
			joint = new b2AreaJoint(<b2AreaJointDef> def);
			break;

		default:
			if (ENABLE_ASSERTS) { b2Assert(false); }
			break;
		}

		return joint;
	}

	public static Destroy(joint: b2Joint, allocator: any): void
	{
	}
}



