import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import { Tag, SecretValue } from '@aws-cdk/core';
// import{User, Group, Policy} from '@aws-cdk/aws-iam'
import iam = require('@aws-cdk/aws-iam')
import { SubnetType, PublicSubnet, SecurityGroup } from '@aws-cdk/aws-ec2';
import { ManagedPolicy } from '@aws-cdk/aws-iam';


export class CdkWorkshopStack extends cdk.Stack {
  readonly user: iam.User;
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // The code that defines your stack goes here
    const vpc = new ec2.Vpc(this, 'cdk-Vpc', {
      maxAzs: 2,
      cidr: '10.1.0.0/16',
    });

    // Tag.add(vpc, 'Name', 'edx-build-aws-vpc')
    const user = new iam.User(this, 'edxProjectUser', { password: SecretValue.plainText('1234') });
    const group = new iam.Group(this, 'Developers');
    group.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2FullAccess'))
    group.addUser(user)
  }
}