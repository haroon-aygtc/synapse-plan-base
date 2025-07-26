import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedToolTemplates1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert initial tool templates
    await queryRunner.query(`
      INSERT INTO tool_templates (
        id, name, description, category, endpoint, method, schema, headers, authentication, tags, 
        icon_url, is_active, is_public, template_rating, template_rating_count, template_downloads, 
        template_featured, template_metadata, version, metadata, created_at, updated_at, 
        organization_id, user_id
      ) VALUES 
      (
        gen_random_uuid(), 'Slack Message Sender', 'Send messages to Slack channels with rich formatting and attachments', 
        'communication', 'https://slack.com/api/chat.postMessage', 'POST',
        '{"type":"object","properties":{"channel":{"type":"string","description":"Slack channel ID or name (e.g., #general)","required":true},"text":{"type":"string","description":"Message text content","required":true},"blocks":{"type":"array","description":"Slack block kit blocks for rich formatting","items":{"type":"object"}},"attachments":{"type":"array","description":"Message attachments","items":{"type":"object"}}},"required":["channel","text"]}',
        '{"Content-Type":"application/json","Authorization":"Bearer {{SLACK_BOT_TOKEN}}"}',
        '{"type":"bearer","token":"{{SLACK_BOT_TOKEN}}"}',
        ARRAY['slack', 'messaging', 'communication', 'notifications'],
        NULL, true, true, 4.5, 120, 850, true,
        '{"complexity":"beginner","estimatedSetupTime":"5 minutes","prerequisites":["Slack Bot Token"],"documentation":"https://api.slack.com/messaging/sending","examples":[{"name":"Simple Message","description":"Send a basic text message","parameters":{"channel":"#general","text":"Hello from SynapseAI!"}}]}',
        '1.0.0', '{}', NOW(), NOW(),
        (SELECT id FROM organizations WHERE name = 'System' LIMIT 1),
        (SELECT id FROM users WHERE email = 'system@synapseai.com' LIMIT 1)
      ),
      (
        gen_random_uuid(), 'Email Sender', 'Send emails via SMTP or email service providers',
        'communication', 'https://api.sendgrid.com/v3/mail/send', 'POST',
        '{"type":"object","properties":{"to":{"type":"array","description":"Recipient email addresses","items":{"type":"string","format":"email"},"required":true},"from":{"type":"string","description":"Sender email address","format":"email","required":true},"subject":{"type":"string","description":"Email subject line","required":true},"text":{"type":"string","description":"Plain text email content"},"html":{"type":"string","description":"HTML email content"},"attachments":{"type":"array","description":"Email attachments","items":{"type":"object","properties":{"content":{"type":"string","description":"Base64 encoded file content"},"filename":{"type":"string","description":"Attachment filename"},"type":{"type":"string","description":"MIME type"}}}}},"required":["to","from","subject"]}',
        '{"Content-Type":"application/json","Authorization":"Bearer {{SENDGRID_API_KEY}}"}',
        '{"type":"bearer","token":"{{SENDGRID_API_KEY}}"}',
        ARRAY['email', 'communication', 'notifications', 'sendgrid'],
        NULL, true, true, 4.3, 95, 720, true,
        '{"complexity":"beginner","estimatedSetupTime":"10 minutes","prerequisites":["SendGrid API Key"],"documentation":"https://sendgrid.com/docs/api-reference/mail-api/","examples":[{"name":"Basic Email","description":"Send a simple email","parameters":{"to":["user@example.com"],"from":"noreply@company.com","subject":"Welcome","text":"Welcome to our platform!"}}]}',
        '1.0.0', '{}', NOW(), NOW(),
        (SELECT id FROM organizations WHERE name = 'System' LIMIT 1),
        (SELECT id FROM users WHERE email = 'system@synapseai.com' LIMIT 1)
      ),
      (
        gen_random_uuid(), 'Webhook Receiver', 'Receive and process webhook events from external services',
        'integration', '{{WEBHOOK_URL}}', 'POST',
        '{"type":"object","properties":{"event_type":{"type":"string","description":"Type of webhook event","required":true},"payload":{"type":"object","description":"Event payload data","required":true},"timestamp":{"type":"string","format":"date-time","description":"Event timestamp"},"signature":{"type":"string","description":"Webhook signature for verification"}},"required":["event_type","payload"]}',
        '{"Content-Type":"application/json","User-Agent":"SynapseAI-Webhook/1.0"}',
        '{"type":"webhook_signature","secret":"{{WEBHOOK_SECRET}}"}',
        ARRAY['webhook', 'integration', 'events', 'real-time'],
        NULL, true, true, 4.2, 78, 650, false,
        '{"complexity":"intermediate","estimatedSetupTime":"15 minutes","prerequisites":["Webhook URL","Secret Key"],"documentation":"https://docs.synapseai.com/webhooks","examples":[{"name":"GitHub Webhook","description":"Process GitHub push events","parameters":{"event_type":"push","payload":{"ref":"refs/heads/main","commits":[{"id":"abc123","message":"Update README"}]}}}]}',
        '1.0.0', '{}', NOW(), NOW(),
        (SELECT id FROM organizations WHERE name = 'System' LIMIT 1),
        (SELECT id FROM users WHERE email = 'system@synapseai.com' LIMIT 1)
      ),
      (
        gen_random_uuid(), 'Database Query Tool', 'Execute SQL queries against databases with parameterized inputs',
        'analytics', '{{DATABASE_API_URL}}/query', 'POST',
        '{"type":"object","properties":{"query":{"type":"string","description":"SQL query to execute","required":true},"parameters":{"type":"object","description":"Query parameters for parameterized queries","additionalProperties":true},"timeout":{"type":"number","description":"Query timeout in seconds","default":30},"max_rows":{"type":"number","description":"Maximum number of rows to return","default":1000}},"required":["query"]}',
        '{"Content-Type":"application/json","Authorization":"Bearer {{DATABASE_API_KEY}}"}',
        '{"type":"bearer","token":"{{DATABASE_API_KEY}}"}',
        ARRAY['database', 'sql', 'analytics', 'data'],
        NULL, true, true, 4.1, 65, 580, false,
        '{"complexity":"advanced","estimatedSetupTime":"20 minutes","prerequisites":["Database API Access","SQL Knowledge"],"documentation":"https://docs.synapseai.com/database-queries","examples":[{"name":"User Analytics","description":"Get user statistics","parameters":{"query":"SELECT COUNT(*) as user_count, DATE(created_at) as date FROM users GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30"}}]}',
        '1.0.0', '{}', NOW(), NOW(),
        (SELECT id FROM organizations WHERE name = 'System' LIMIT 1),
        (SELECT id FROM users WHERE email = 'system@synapseai.com' LIMIT 1)
      ),
      (
        gen_random_uuid(), 'File Upload Service', 'Upload files to cloud storage services like AWS S3, Google Cloud Storage',
        'integration', 'https://storage.googleapis.com/upload/storage/v1/b/{{BUCKET_NAME}}/o', 'POST',
        '{"type":"object","properties":{"file":{"type":"string","description":"Base64 encoded file content","required":true},"filename":{"type":"string","description":"Name of the file to upload","required":true},"content_type":{"type":"string","description":"MIME type of the file"},"path":{"type":"string","description":"Destination path in storage bucket"},"metadata":{"type":"object","description":"Additional metadata for the file","additionalProperties":true}},"required":["file","filename"]}',
        '{"Authorization":"Bearer {{GOOGLE_ACCESS_TOKEN}}","Content-Type":"multipart/form-data"}',
        '{"type":"oauth2","access_token":"{{GOOGLE_ACCESS_TOKEN}}"}',
        ARRAY['file-upload', 'storage', 'google-cloud', 'aws-s3'],
        NULL, true, true, 4.0, 52, 490, false,
        '{"complexity":"intermediate","estimatedSetupTime":"25 minutes","prerequisites":["Google Cloud Storage Access","OAuth2 Setup"],"documentation":"https://cloud.google.com/storage/docs/uploading-objects","examples":[{"name":"Image Upload","description":"Upload an image file","parameters":{"file":"base64_encoded_image","filename":"profile.jpg","content_type":"image/jpeg","path":"users/profiles/"}}]}',
        '1.0.0', '{}', NOW(), NOW(),
        (SELECT id FROM organizations WHERE name = 'System' LIMIT 1),
        (SELECT id FROM users WHERE email = 'system@synapseai.com' LIMIT 1)
      ),
      (
        gen_random_uuid(), 'AI Text Completion', 'Generate text completions using AI models like GPT, Claude, or local models',
        'automation', 'https://api.openai.com/v1/chat/completions', 'POST',
        '{"type":"object","properties":{"model":{"type":"string","description":"AI model to use (e.g., gpt-4, gpt-3.5-turbo)","default":"gpt-3.5-turbo","required":true},"messages":{"type":"array","description":"Array of message objects","items":{"type":"object","properties":{"role":{"type":"string","enum":["system","user","assistant"]},"content":{"type":"string"}}},"required":true},"temperature":{"type":"number","description":"Sampling temperature (0-2)","default":0.7,"minimum":0,"maximum":2},"max_tokens":{"type":"number","description":"Maximum tokens to generate","default":1000}},"required":["model","messages"]}',
        '{"Content-Type":"application/json","Authorization":"Bearer {{OPENAI_API_KEY}}"}',
        '{"type":"bearer","token":"{{OPENAI_API_KEY}}"}',
        ARRAY['ai', 'text-generation', 'openai', 'automation'],
        NULL, true, true, 4.7, 180, 1200, true,
        '{"complexity":"beginner","estimatedSetupTime":"5 minutes","prerequisites":["OpenAI API Key"],"documentation":"https://platform.openai.com/docs/api-reference/chat","examples":[{"name":"Chat Completion","description":"Generate a chat response","parameters":{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"Explain quantum computing in simple terms"}],"temperature":0.7}}]}',
        '1.0.0', '{}', NOW(), NOW(),
        (SELECT id FROM organizations WHERE name = 'System' LIMIT 1),
        (SELECT id FROM users WHERE email = 'system@synapseai.com' LIMIT 1)
      ),
      (
        gen_random_uuid(), 'CRM Contact Manager', 'Create, update, and manage contacts in CRM systems like Salesforce, HubSpot',
        'crm', 'https://api.hubapi.com/crm/v3/objects/contacts', 'POST',
        '{"type":"object","properties":{"properties":{"type":"object","description":"Contact properties","properties":{"firstname":{"type":"string","description":"Contact first name"},"lastname":{"type":"string","description":"Contact last name"},"email":{"type":"string","format":"email","description":"Contact email address"},"phone":{"type":"string","description":"Contact phone number"},"company":{"type":"string","description":"Company name"},"jobtitle":{"type":"string","description":"Job title"}}},"associations":{"type":"array","description":"Associated objects (companies, deals, etc.)","items":{"type":"object"}}},"required":["properties"]}',
        '{"Content-Type":"application/json","Authorization":"Bearer {{HUBSPOT_API_KEY}}"}',
        '{"type":"bearer","token":"{{HUBSPOT_API_KEY}}"}',
        ARRAY['crm', 'contacts', 'hubspot', 'salesforce', 'sales'],
        NULL, true, true, 4.4, 110, 890, true,
        '{"complexity":"intermediate","estimatedSetupTime":"15 minutes","prerequisites":["HubSpot API Key"],"documentation":"https://developers.hubspot.com/docs/api/crm/contacts","examples":[{"name":"Create Contact","description":"Create a new contact","parameters":{"properties":{"firstname":"John","lastname":"Doe","email":"john.doe@example.com","company":"Acme Corp"}}}]}',
        '1.0.0', '{}', NOW(), NOW(),
        (SELECT id FROM organizations WHERE name = 'System' LIMIT 1),
        (SELECT id FROM users WHERE email = 'system@synapseai.com' LIMIT 1)
      ),
      (
        gen_random_uuid(), 'Analytics Report Generator', 'Generate and export analytics reports from various data sources',
        'analytics', '{{ANALYTICS_API_URL}}/reports/generate', 'POST',
        '{"type":"object","properties":{"report_type":{"type":"string","enum":["summary","detailed","trend","comparison"],"description":"Type of report to generate","required":true},"date_range":{"type":"object","description":"Date range for the report","properties":{"start_date":{"type":"string","format":"date"},"end_date":{"type":"string","format":"date"}}},"metrics":{"type":"array","description":"Metrics to include in the report","items":{"type":"string"}},"dimensions":{"type":"array","description":"Dimensions to group by","items":{"type":"string"}},"format":{"type":"string","enum":["json","csv","pdf","excel"],"description":"Output format","default":"json"}},"required":["report_type"]}',
        '{"Content-Type":"application/json","Authorization":"Bearer {{ANALYTICS_API_KEY}}"}',
        '{"type":"bearer","token":"{{ANALYTICS_API_KEY}}"}',
        ARRAY['analytics', 'reports', 'data', 'insights'],
        NULL, true, true, 4.6, 140, 950, true,
        '{"complexity":"advanced","estimatedSetupTime":"30 minutes","prerequisites":["Analytics API Access","Data Source Configuration"],"documentation":"https://docs.synapseai.com/analytics-reports","examples":[{"name":"Monthly Summary","description":"Generate monthly user activity summary","parameters":{"report_type":"summary","date_range":{"start_date":"2024-01-01","end_date":"2024-01-31"},"metrics":["active_users","page_views","conversions"],"format":"pdf"}}]}',
        '1.0.0', '{}', NOW(), NOW(),
        (SELECT id FROM organizations WHERE name = 'System' LIMIT 1),
        (SELECT id FROM users WHERE email = 'system@synapseai.com' LIMIT 1)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove seeded tool templates
    await queryRunner.query(`
      DELETE FROM tool_templates 
      WHERE user_id = (SELECT id FROM users WHERE email = 'system@synapseai.com' LIMIT 1)
      AND organization_id = (SELECT id FROM organizations WHERE name = 'System' LIMIT 1);
    `);
  }
} 