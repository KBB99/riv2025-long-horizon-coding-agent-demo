import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { CanopyStack } from '../lib/canopy-stack';

describe('CanopyStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new CanopyStack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    template = Template.fromStack(stack);
  });

  // DynamoDB Tests
  describe('DynamoDB', () => {
    test('creates a DynamoDB table with correct key schema', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'canopy-main-table',
        KeySchema: [
          { AttributeName: 'PK', KeyType: 'HASH' },
          { AttributeName: 'SK', KeyType: 'RANGE' },
        ],
        BillingMode: 'PAY_PER_REQUEST',
      });
    });

    test('DynamoDB table has GSI1', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        GlobalSecondaryIndexes: Match.arrayWith([
          Match.objectLike({
            IndexName: 'GSI1',
            KeySchema: [
              { AttributeName: 'GSI1PK', KeyType: 'HASH' },
              { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
            ],
          }),
        ]),
      });
    });

    test('DynamoDB table has GSI2', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        GlobalSecondaryIndexes: Match.arrayWith([
          Match.objectLike({
            IndexName: 'GSI2',
            KeySchema: [
              { AttributeName: 'GSI2PK', KeyType: 'HASH' },
              { AttributeName: 'GSI2SK', KeyType: 'RANGE' },
            ],
          }),
        ]),
      });
    });

    test('DynamoDB table has GSI3', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        GlobalSecondaryIndexes: Match.arrayWith([
          Match.objectLike({
            IndexName: 'GSI3',
            KeySchema: [
              { AttributeName: 'GSI3PK', KeyType: 'HASH' },
              { AttributeName: 'GSI3SK', KeyType: 'RANGE' },
            ],
          }),
        ]),
      });
    });

    test('DynamoDB table has point-in-time recovery', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        PointInTimeRecoverySpecification: Match.objectLike({
          PointInTimeRecoveryEnabled: true,
        }),
      });
    });
  });

  // Lambda Tests
  describe('Lambda', () => {
    test('creates a Lambda function with Node.js 20 runtime', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs20.x',
        MemorySize: 512,
        Timeout: 30,
      });
    });

    test('Lambda has correct environment variables', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            TABLE_NAME: Match.anyValue(),
          }),
        },
      });
    });

    test('Lambda has DynamoDB read/write permissions', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
            }),
          ]),
        },
      });
    });
  });

  // API Gateway Tests
  describe('API Gateway', () => {
    test('creates an HTTP API', () => {
      template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
        Name: 'canopy-api',
        ProtocolType: 'HTTP',
      });
    });

    test('API Gateway has CORS configured', () => {
      template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
        CorsConfiguration: Match.objectLike({
          AllowMethods: Match.arrayWith(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
          AllowHeaders: ['Content-Type', 'Authorization'],
        }),
      });
    });
  });

  // S3 + CloudFront Tests
  describe('Frontend Hosting', () => {
    test('creates an S3 bucket for frontend', () => {
      template.resourceCountIs('AWS::S3::Bucket', 1);
    });

    test('S3 bucket blocks public access', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });

    test('creates a CloudFront distribution', () => {
      template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    });

    test('CloudFront has SPA error handling', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          CustomErrorResponses: Match.arrayWith([
            Match.objectLike({
              ErrorCode: 403,
              ResponseCode: 200,
              ResponsePagePath: '/index.html',
            }),
            Match.objectLike({
              ErrorCode: 404,
              ResponseCode: 200,
              ResponsePagePath: '/index.html',
            }),
          ]),
        }),
      });
    });
  });

  // Stack Outputs
  describe('Stack Outputs', () => {
    test('outputs API URL', () => {
      template.hasOutput('ApiUrl', {});
    });

    test('outputs Frontend Bucket Name', () => {
      template.hasOutput('FrontendBucketName', {});
    });

    test('outputs Distribution ID', () => {
      template.hasOutput('DistributionId', {});
    });

    test('outputs Distribution Domain', () => {
      template.hasOutput('DistributionDomain', {});
    });
  });

  // Snapshot Test
  test('matches snapshot', () => {
    const templateJson = template.toJSON();
    expect(templateJson).toMatchSnapshot();
  });
});
