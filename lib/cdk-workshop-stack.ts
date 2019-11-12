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

    //Create Role
    const role = new iam.Role(this, 'edXProjectPolicy', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
    });

    role.addToPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: [
        "iam:*",
        "rds:*",
        "sns:*",
        "cloudformation:*",
        "rekognition:*",
        "ec2:*",
        "cognito-idp:*",
        "sqs:*",
        "xray:*",
        "s3:*",
        "elasticloadbalancing:*",
        "cloud9:*",
        "lambda:*",
        "tag:GetResources",
        "logs:*",
        "kms:ListKeyPolicies",
        "kms:GenerateRandom",
        "kms:ListRetirableGrants",
        "kms:GetKeyPolicy",
        "kms:ListResourceTags",
        "kms:ReEncryptFrom",
        "kms:ListGrants",
        "kms:GetParametersForImport",
        "kms:ListKeys",
        "kms:GetKeyRotationStatus",
        "kms:ListAliases",
        "kms:ReEncryptTo",
        "kms:DescribeKey"
      ]
    }));

    //Create IAM User and Group
    const user = new iam.User(this, 'edxProjectUser', { password: SecretValue.plainText('1234') });
    const group = new iam.Group(this, 'Developers');
    group.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2FullAccess'))
    group.addUser(user)
  }
}

//wget https://us-west-2-tcdev.s3.amazonaws.com/courses/AWS-100-ADG/v1.1.0/exercises/ex-s3-upload.zip
//unzip ex-s3-upload.zip
//sudo pip-3.6 install -r exercise-s3-upload/FlaskApp/requirements.txt
//sudo pip-3.6 install boto3
