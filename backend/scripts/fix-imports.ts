import * as fs from 'fs';
import * as path from 'path';

/**
 * Fix Import Script
 * 
 * This script fixes all the import issues with @shared/enums by updating
 * the import paths to use the correct specific enum files.
 */

const importMappings = {
  'ExecutionStatus': '@shared/enums/execution-status.enum',
  'AgentEventType': '@shared/enums/agent-event.enum',
  'NotificationType': '@shared/enums/execution-status.enum',
  'NotificationPriority': '@shared/enums/execution-status.enum',
  'DocumentStatus': '@shared/enums/execution-status.enum',
  'SessionEventType': '@shared/enums/execution-status.enum',
  'UserRole': '@shared/interfaces',
  'HITLRequestType': '@shared/enums/hitl.enum',
  'HITLRequestPriority': '@shared/enums/hitl.enum',
  'HITLRequestStatus': '@shared/enums/hitl.enum',
  'HITLDecisionType': '@shared/enums/hitl.enum',
  'HITLEscalationReason': '@shared/enums/hitl.enum',
  'APXMessageType': '@shared/enums/apix-protocol.enum',
  'APXSecurityLevel': '@shared/enums/apix-protocol.enum',
  'APXPermissionLevel': '@shared/enums/apix-protocol.enum',
  'APXExecutionState': '@shared/enums/apix-protocol.enum',
  'APXStreamState': '@shared/enums/apix-protocol.enum',
  'WebSocketEventType': '@shared/enums',
  'EventType': '@shared/enums',
  'EventTargetType': '@shared/enums',
  'EventPriority': '@shared/enums',
  'ConnectionStatus': '@shared/enums',
  'HealthStatus': '@shared/enums',
  'PromptTemplateEventType': '@shared/enums/execution-status.enum',
  'ToolEventType': '@shared/enums/execution-status.enum'
};

function fixImportsInFile(filePath: string): void {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix @shared/enums imports
    const importRegex = /import\s*{([^}]+)}\s*from\s*['"]@shared\/enums['"];?/g;
    const matches = content.match(importRegex);

    if (matches) {
      matches.forEach(match => {
        const importMatch = match.match(/import\s*{([^}]+)}\s*from\s*['"]@shared\/enums['"];?/);
        if (importMatch) {
          const imports = importMatch[1].split(',').map(imp => imp.trim());
          const newImports: { [key: string]: string[] } = {};

          imports.forEach(imp => {
            const enumName = imp.replace(/\s+as\s+\w+/, '').trim();
            const mappedPath = importMappings[enumName as keyof typeof importMappings];
            
            if (mappedPath) {
              if (!newImports[mappedPath]) {
                newImports[mappedPath] = [];
              }
              newImports[mappedPath].push(imp.trim());
            }
          });

          // Replace the old import with new specific imports
          let replacement = '';
          Object.entries(newImports).forEach(([path, imports]) => {
            replacement += `import { ${imports.join(', ')} } from '${path}';\n`;
          });

          content = content.replace(match, replacement);
          modified = true;
        }
      });
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed imports in: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing imports in ${filePath}:`, error);
  }
}

function findAndFixFiles(dir: string): void {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      findAndFixFiles(filePath);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fixImportsInFile(filePath);
    }
  });
}

// Run the fix
console.log('🔧 Fixing import issues...');
findAndFixFiles(path.join(__dirname, '..'));
console.log('✅ Import fixes completed!'); 