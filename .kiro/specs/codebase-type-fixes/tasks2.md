# 🔧 TypeScript Errors Fix Checklist

## 📋 Overview
Systematic checklist to resolve all TypeScript compilation errors in SynapseAI codebase for production readiness.

---

## 🔴 PRIORITY 1: Type Mismatch / Assignability Errors

### WebSocket Service Issues
- [ ] **TS2322: WebSocketService.prototype.emitToOrganization**
  - Fix: Change return type from `void` to `Promise<void>`
  - Location: WebSocket service implementation
  - Impact: Critical for async operations

### Event Type Union Issues  
- [ ] **TS2322: WebSocketEventType | AgentEventType union conflict**
  - Fix: Standardize event type unions across codebase
  - Location: Event handling code
  - Impact: Type safety for event system

### Analytics Type Issues
- [ ] **TS2322: sessionDuration type assignment**
  - Fix: Correct `number` to proper analytics property type
  - Location: Analytics properties assignment
  - Impact: Analytics data integrity

- [ ] **TS2345: WidgetAnalytics eventType incompatibility**
  - Fix: Align `AnalyticsEventType` with `WidgetAnalytics` expected types
  - Location: Widget analytics implementation
  - Impact: Widget analytics functionality

### Null vs Undefined Issues
- [ ] **TS2322: templateDemoUrl null assignment**
  - Fix: Change `|| null` to `|| undefined` or update type definition
  - Location: Template handling code
  - Impact: Template URL handling

- [ ] **TS2322: Widget repository null vs undefined**
  - Fix: Align `findOne()` return type with expected `Widget | undefined`
  - Location: Widget repository calls
  - Impact: Widget data retrieval

### Parameter Type Safety
- [ ] **TS2345: organizationId string | undefined**
  - Fix: Add type guard or make parameter required
  - Location: Rate limiting functions
  - Impact: Organization-based operations

### Session Type Issues
- [ ] **TS2322: Date assignment in analytics**
  - Fix: Correct `lastActivity: session.lastActivity` type
  - Location: Session analytics
  - Impact: Session tracking

- [ ] **TS2322: Session status type**
  - Fix: Align session status enum with expected type
  - Location: Session status handling
  - Impact: Session state management

---

## 🟡 PRIORITY 2: Missing Type Annotations

### Analytics Variables
- [ ] **TS7034: journeys array type**
  - Fix: Add explicit type `const journeys: AnalyticsJourney[] = []`
  - Location: Analytics calculations
  - Impact: Type safety for journey data

- [ ] **TS7034: retentionRates array type**
  - Fix: Add explicit type `const retentionRates: RetentionRate[] = []`
  - Location: Retention analytics
  - Impact: Retention calculation accuracy

- [ ] **TS7034: cohortData array type**
  - Fix: Add explicit type `const cohortData: CohortData[] = []`
  - Location: Cohort analysis
  - Impact: Cohort analytics integrity

### Function Parameters
- [ ] **TS7006: Parameter 'a' implicit any**
  - Fix: Add explicit type annotation
  - Location: Comparison/sorting functions
  - Impact: Function type safety

- [ ] **TS7006: Parameter 'b' implicit any**
  - Fix: Add explicit type annotation
  - Location: Comparison/sorting functions
  - Impact: Function type safety

- [ ] **TS7006: Parameter 'event' implicit any**
  - Fix: Add explicit event type annotation
  - Location: Event handlers
  - Impact: Event handling type safety

- [ ] **TS7006: Parameter 'e' implicit any**
  - Fix: Add explicit type annotation
  - Location: Error handlers or event callbacks
  - Impact: Error handling type safety

- [ ] **TS7006: Parameter 'sum' implicit any**
  - Fix: Add explicit type `sum: number`
  - Location: Aggregation functions
  - Impact: Calculation accuracy

- [ ] **TS7006: Parameter 's' implicit any**
  - Fix: Add explicit type annotation
  - Location: String/session handlers
  - Impact: Data processing type safety

---

## 🟠 PRIORITY 3: Property Access Issues

### Error Handling
- [ ] **TS18046: 'error' is of type 'unknown'**
  - Fix: Add error type guards before accessing properties
  - Example: `if (error instanceof Error) { error.message }`
  - Location: Multiple error handling blocks
  - Impact: Runtime error safety

### Missing Widget Properties
- [ ] **TS2339: Property 'error' missing on WidgetExecution**
  - Fix: Add `error?: string` to WidgetExecution type
  - Location: Widget execution type definition
  - Impact: Error tracking in widgets

- [ ] **TS2339: Missing WidgetExecutionContext properties**
  - Fix: Add missing properties:
    - `recovered?: boolean`
    - `recoveryTime?: Date`
    - `userId?: string`
  - Location: WidgetExecutionContext type
  - Impact: Widget execution tracking

- [ ] **TS2339: Missing WidgetSecurity properties**
  - Fix: Add missing properties:
    - `maxMemoryUsage?: number`
    - `maxExecutionTime?: number`
  - Location: WidgetSecurity type
  - Impact: Widget security constraints

---

## 🔵 PRIORITY 4: Array Method Issues

### Widget Execution Array Errors
- [ ] **TS2339: markAsRunning on array**
  - Fix: Call on individual elements, not array
  - Change: `executions.markAsRunning()` → `executions.forEach(e => e.markAsRunning())`
  - Location: Widget execution management
  - Impact: Widget state management

- [ ] **TS2339: markAsCompleted on array**
  - Fix: Call on individual elements, not array
  - Change: `executions.markAsCompleted()` → `executions.forEach(e => e.markAsCompleted())`
  - Location: Widget completion handling
  - Impact: Widget completion tracking

- [ ] **TS2339: markAsFailed on array**
  - Fix: Call on individual elements, not array
  - Change: `executions.markAsFailed()` → `executions.forEach(e => e.markAsFailed())`
  - Location: Widget error handling
  - Impact: Widget failure tracking

- [ ] **TS2339: Property access on arrays**
  - Fix: Access properties on individual elements
  - Change: `executions.id` → `executions.map(e => e.id)`
  - Change: `executions.costUsd` → `executions.reduce((sum, e) => sum + e.costUsd, 0)`
  - Location: Widget data aggregation
  - Impact: Widget data processing

- [ ] **TS2339: calculateCost on array**
  - Fix: Call on individual elements or implement array method
  - Change: `executions.calculateCost()` → `executions.reduce((sum, e) => sum + e.calculateCost(), 0)`
  - Location: Cost calculation
  - Impact: Cost tracking accuracy

---

## 🟣 PRIORITY 5: Syntax Issues

### Controller Parameter Order
- [ ] **TS1016: Required parameter after optional**
  - Fix: Reorder controller method parameters
  - Move `@Request() req: any` before optional `@Query()` parameters
  - Location: Two controller methods
  - Impact: Controller method signatures

---

## 📊 Progress Tracking

**Total Issues:** 25+
- [ ] Priority 1 (Critical): 8 issues
- [ ] Priority 2 (Important): 8 issues  
- [ ] Priority 3 (Moderate): 7 issues
- [ ] Priority 4 (Low): 5 issues
- [ ] Priority 5 (Syntax): 1 issue

**Estimated Fix Time:** 2-3 days
**Impact:** Essential for production deployment and type safety
