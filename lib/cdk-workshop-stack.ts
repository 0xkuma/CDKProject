import cdk = require("@aws-cdk/core");
import { Tag } from "@aws-cdk/core";
import ec2 = require("@aws-cdk/aws-ec2");
import iam = require("@aws-cdk/aws-iam");
import s3 = require("@aws-cdk/aws-s3");
import rds = require("@aws-cdk/aws-rds");
import elb = require("@aws-cdk/aws-elasticloadbalancing");
import autoscaling = require("@aws-cdk/aws-autoscaling");
import cognito = require("@aws-cdk/aws-cognito");

export class CdkWorkshopStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // The code that defines your stack goes here

    //Create VPC
    const vpc = new ec2.Vpc(this, "cdk-Vpc", {
      maxAzs: 2,
      cidr: "10.1.0.0/16",
      subnetConfiguration: [
        {
          subnetType: ec2.SubnetType.PUBLIC,
          name: "ApplicationPublic",
          cidrMask: 24
        },
        {
          subnetType: ec2.SubnetType.ISOLATED,
          name: "Database",
          cidrMask: 24
        }
        // {
        //   subnetType: ec2.SubnetType.PRIVATE,
        //   name: 'ApplicationPrivate',
        //   cidrMask: 24,
        // }
      ]
    });
    Tag.add(vpc, "Name", "edx-build-aws-vpc");

    //Create S3 Bucket
    const bucket = new s3.Bucket(this, "edx-build-aws-s3", {
      versioned: false,
      encryption: s3.BucketEncryption.UNENCRYPTED,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    const rdsinstance = new rds.DatabaseInstance(this, "edx-photos-db", {
      engine: rds.DatabaseInstanceEngine.MYSQL,
      instanceClass: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE2,
        ec2.InstanceSize.SMALL
      ),
      masterUsername: "master",
      masterUserPassword: new cdk.SecretValue("edxrdspasword"),
      vpc,
      databaseName: "Photos"
    });

    //Create Policy for user
    const policy = new iam.PolicyStatement({
      resources: ["*"],
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
    });

    //Create IAM User and Group
    const role = new iam.Role(this, "edxProjectRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com")
    });
    role.addToPolicy(policy);

    //Create SG
    const sg = new ec2.SecurityGroup(this, "edx-ec2-sg", {
      vpc,
      description: "Allow 8080 access to ec2 instances",
      allowAllOutbound: true
    });
    sg.connections.allowFromAnyIpv4(
      ec2.Port.tcp(8080),
      "Allow inbound 8080 port"
    );

    const awsAMI = new ec2.AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2
    });

    let userData = ec2.UserData.forLinux();
    userData.addCommands(
      "sudo yum install python37 -y",
      "sudo yum install python-pip -y",
      "wget https://s3-us-west-2.amazonaws.com/us-west-2-tcdev/courses/AWS-100-ADG/v1.1.0/exercises/ex-rds.zip",
      "unzip ex-rds.zip",
      "cd exercise-rds/",
      "python3 -m venv venv",
      "source venv/bin/activate",
      "pip3 install boto3",
      "pip3 install -r FlaskApp/requirements.txt",
      "pip3 install Pillow",
      "pip3 install mysql-connector",
      "python3 exercise-rds/SetupScripts/database_create_tables.py",
      rdsinstance.dbInstanceEndpointAddress,
      "master",
      "edxrdspasword",
      "Photos",
      "edxwebuserpassword",
      "export DATABASE_HOST=" + rdsinstance.dbInstanceEndpointAddress,
      "export DATABASE_USER=web_user",
      "export DATABASE_PASSWORD=edxrdspasword",
      "export DATABASE_DB_NAME=Photos",
      "export PHOTOS_BUCKET=" + bucket.bucketName,
      "export FLASK_SECRET=kuma",
      "export AWS_DEFAULT_REGION=us-east-1",
      "python3 exercise-rds/FlaskApp/application.py"
    );

    //Create ELB
    const lb = new elb.LoadBalancer(this, "photos-alb", {
      vpc,
      internetFacing: true,
      healthCheck: {
        port: 8080
      },
      crossZone: true
    });

    lb.addListener({
      internalPort: 8080,
      externalPort: 8080,
      externalProtocol: elb.LoadBalancingProtocol.HTTP
    });

    //Create Auto Scaling Group
    const asg = new autoscaling.AutoScalingGroup(this, "ASG", {
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: awsAMI,
      allowAllOutbound: true,
      role: role,
      userData: userData,
      minCapacity: 2,
      maxCapacity: 3
    });

    lb.addTarget(asg);

    bucket.grantReadWrite(asg);

    //Create Cognito
    const userPool: cognito.UserPool = new cognito.UserPool(
      this,
      "photos-pool",
      {
        signInType: cognito.SignInType.EMAIL_OR_PHONE,
        autoVerifiedAttributes: [cognito.UserPoolAttribute.EMAIL]
      }
    );

    new cognito.UserPoolClient(this, "WebsiteClient", {
      userPool: userPool,
      generateSecret: true,
      enabledAuthFlows: [cognito.AuthFlow.USER_PASSWORD]
    });

  }
}
