import cdk = require('@aws-cdk/core');
import { Tag, SecretValue } from '@aws-cdk/core';
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3')
import { BucketEncryption } from '@aws-cdk/aws-s3';

export class CdkWorkshopStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // The code that defines your stack goes here

    //Create VPC
    const vpc = new ec2.Vpc(this, 'cdk-Vpc', {
      maxAzs: 2,
      cidr: '10.1.0.0/16',
    });
    Tag.add(vpc, 'Name', 'edx-build-aws-vpc')

    //Create SG
    const sg = new ec2.SecurityGroup(this, 'edx-ec2-sg', {
      vpc,
      description: 'Allow 8080 access to ec2 instances',
      allowAllOutbound: true
    })
    sg.connections.allowFromAnyIpv4(ec2.Port.tcp(8080), 'Allow inbound 8080 port')

    const awsAMI = new ec2.AmazonLinuxImage({ generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2 });

    //Create ec2 instance
    let instance = new ec2.CfnInstance(this, 'edx-ec2-instance', {
      imageId: awsAMI.getImage(this).imageId,
      instanceType: "t2.micro",
      monitoring: false,
      tags: [
        { "key": "Name", "value": "edx-instance" }
      ],
      networkInterfaces: [
        {
          deviceIndex: "0",
          associatePublicIpAddress: true,
          subnetId: vpc.publicSubnets[0].subnetId,
          groupSet: [sg.securityGroupId]
        }
      ]
    })

    instance.addOverride('Metadata', {
      'AWS::CloudFormation::Init': {
        'config': {
          'commands': {
            'test': {
              'command': "echo $STACK_NAME test",
              'env': {
                'STACK_NAME': this.stackName
              }
            }
          },
        }
      }
    });

    let userData = ec2.UserData.forLinux();
    userData.addCommands(
      '/opt/aws/bin/cfn-init',
      `--region ${this.region}`,
      `--stack ${this.stackName}`,
      `--resource ${instance.logicalId}`
    );
    userData.addCommands('sudo yum install python37 -y \
    curl -O https://bootstrap.pypa.io/get-pip.py \
    python3 get-pip.py --user \
    wget https://s3-us-west-2.amazonaws.com/us-west-2-tcdev/courses/AWS-100-ADG/v1.1.0/exercises/ex-rekognition.zip \
    unzip ex-rekognition.zip \
    cd exercise-rekognition/FlaskApp \
    python3 -m venv venv \
    source venv/bin/activate \
    pip install boto3 \
    pip install -r requirement.txt \
    pip install Pillow \
    python3 application.py');
    instance.userData = cdk.Fn.base64(userData.render());

    //Create S3 Bucket
    const bucket = new s3.Bucket(this, 'edx-build-aws-s3', {
      encryption: BucketEncryption.KMS
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
    const user = new iam.User(this, 'edxProjectUser', { password: SecretValue.plainText('1234') });
    const group = new iam.Group(this, 'Developers');
    group.addToPolicy(policy)
    group.addUser(user)
  }
}

/*

#!/bin/bash
sudo yum install python37 -y
sudo yum install python-pip -y
wget https://s3-us-west-2.amazonaws.com/us-west-2-tcdev/courses/AWS-100-ADG/v1.1.0/exercises/ex-rekognition.zip 
unzip ex-rekognition.zip
cd exercise-rekognition/FlaskApp
python3 -m venv venv
source venv/bin/activate
pip3 install boto3
pip3 install -r requirements.txt
pip3 install Pillow
export PHOTOS_BUCKET=iot-ive-cloud-connect
export FLASK_SECRET=kuma
export AWS_DEFAULT_REGION=us-east-1
python3 application.py

*/
