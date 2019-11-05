import cdk = require('@aws-cdk/core');
import { Tag, SecretValue } from '@aws-cdk/core';
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3')
import { BucketEncryption } from '@aws-cdk/aws-s3';

export class CdkWorkshopStack extends cdk.Stack {
  readonly user: iam.User;
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // The code that defines your stack goes here

    //Create VPC
    const vpc = new ec2.Vpc(this, 'cdk-Vpc', {
      maxAzs: 2,
      cidr: '10.1.0.0/16',
    });
    Tag.add(vpc, 'Name', 'edx-build-aws-vpc')

    //Create S3 Bucket
    const bucket = new s3.Bucket(this, 'edx-build-aws-s3', {
      encryption: BucketEncryption.KMS
    });

    //Create IAM User and Group
    const user = new iam.User(this, 'edxProjectUser', { password: SecretValue.plainText('1234') });
    const group = new iam.Group(this, 'Developers');
    group.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2FullAccess'))
    group.addUser(user)
  }
}