import cdk = require('@aws-cdk/core');
import { Tag } from '@aws-cdk/core';
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');
import { Subnet } from '@aws-cdk/aws-ec2';

export class CdkWorkshopStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // The code that defines your stack goes here

    //Create VPC
    const vpc = new ec2.Vpc(this, 'cdk-Vpc', {
      maxAzs: 2,
      cidr: '10.1.0.0/16',
      subnetConfiguration: [
        {
          subnetType: ec2.SubnetType.PUBLIC,
          name: 'ApplicationPublic',
          cidrMask: 24,
        },
        // {
        //   subnetType: ec2.SubnetType.PRIVATE,
        //   name: 'ApplicationPrivate',
        //   cidrMask: 24,
        // }
      ],
    });
    Tag.add(vpc, 'Name', 'edx-build-aws-vpc')

    //Create S3 Bucket
    const bucket = new s3.Bucket(this, 'edx-build-aws-s3', {
      versioned: false,
      encryption: s3.BucketEncryption.UNENCRYPTED,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    //Create Policy for user
    const policy = new iam.PolicyStatement({
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
    })

    //Create IAM User and Group
    const role = new iam.Role(this, 'edxProjectRole', { assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com') });
    role.addToPolicy(policy)

    //Create SG
    const sg = new ec2.SecurityGroup(this, 'edx-ec2-sg', {
      vpc,
      description: 'Allow 8080 access to ec2 instances',
      allowAllOutbound: true
    })
    sg.connections.allowFromAnyIpv4(ec2.Port.tcp(8080), 'Allow inbound 8080 port')

    const awsAMI = new ec2.AmazonLinuxImage({ generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2 });

    let userData = ec2.UserData.forLinux();
    userData.addCommands(
      "sudo yum install python37 -y",
      "sudo yum install python-pip -y",
      "wget https://s3-us-west-2.amazonaws.com/us-west-2-tcdev/courses/AWS-100-ADG/v1.1.0/exercises/ex-rekognition.zip",
      "unzip ex-rekognition.zip",
      "cd exercise-rekognition/FlaskApp",
      "python3 -m venv venv",
      "source venv/bin/activate",
      "pip3 install boto3",
      "pip3 install -r requirements.txt",
      "pip3 install Pillow",
      "export PHOTOS_BUCKET=" + bucket.bucketName,
      "export FLASK_SECRET=kuma",
      "export AWS_DEFAULT_REGION=us-east-1",
      "python3 application.py");

    let instance = new ec2.Instance(this, 'edx-ec2-instance', {
      vpc: vpc,
      instanceType: new ec2.InstanceType('t2.micro'),
      machineImage: awsAMI,
      allowAllOutbound: true,
      instanceName: 'edx-ec2-instance',
      role: role,
      securityGroup: sg,
      userData: userData
    })
    bucket.grantReadWrite(instance)

  }

}

