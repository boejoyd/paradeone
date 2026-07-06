# ParadeOne System Architecture and Domain Model

## 1. Purpose

ParadeOne is an event operations platform for managing parade and event operations end to end. It is not merely a parade registration website.

The long-term purpose of ParadeOne is to support the operational reality of events:

- organizing participants and units
- coordinating staffing and communications
- handling check-in and staging workflows
- surfacing operational status in real time
- supporting incident response and event-day decision making

In practice, ParadeOne should be treated as the operating system for event execution, with registration and public-facing flows as one part of a larger operational system.

## 2. Guiding Principles

- Function first, fashion second
  - The product should prioritize reliable operations over visual polish or premature refinement.

- Infrastructure before features
  - Shared foundations such as authentication, organizational membership, event model clarity, and permissions should come before specialized features.

- Mission Control is the operational center
  - The product experience should center on Mission Control as the place where organizers monitor and coordinate event execution.

- Permissions before UI
  - Access rules and ownership boundaries should be clear before building rich user interfaces.

- Build for real event operations
  - Features should reflect actual event-day needs such as logistics, readiness, communications, and incident handling.

- Avoid over-generalizing too early
  - The system should not prematurely abstract every workflow into a generic engine before real use cases have proven the pattern.

## 3. Core Domain Model

The core domain is organized around people, organizations, events, operational objects, and communications.

### User
A person who can authenticate and interact with the platform. A user may belong to one or more organizations and may hold different roles within each.

### Organization
A parent entity that owns one or more events and operational workflows. Organizations are the primary boundary for membership and permissions.

### Organization Member
A relationship between a user and an organization, including role and access context. This is the foundation for organization-level permissions.

### Event
A scheduled event or program hosted by an organization. Events may include one or more parades, staging areas, check-in processes, communications workflows, and documents.

### Event Type
A classification for events such as parade, festival, community event, or other event category. Event type helps determine workflows and defaults.

### Parade
A specific parade or procession within an event. A parade may have lineup order, staging, check-in, unit composition, and communications needs.

### Parade Unit
The central operational object for Mission Control. A parade unit represents a group or entity participating in a parade, such as a float, vehicle, marching unit, or other entry. It is the object around which lineup, check-in, communications, and status monitoring should eventually converge.

### Guest / Reservation for Camp Nackte
A guest or reservation record for Camp Nackte-specific operations. This is currently a specific domain use case and should remain distinct from general event participation until there is a stronger shared abstraction.

### Waiver
A signed waiver record associated with a participant, guest, or reservation. For now, waivers are primarily visible through the Camp Nackte workflow, but the system should eventually support waiver handling more broadly.

### Message
A communication artifact such as a text-message template, outbound message, reply, or internal note. Messages are part of the operational communication layer and may eventually be tied to a selected unit, event, or participant.

### Timeline Event
An operational event that happens over time, such as a registration update, check-in event, staging change, incident note, communications event, or status transition.

### Document
A file associated with an organization, event, parade, unit, or waiver workflow. Documents may include permits, attachments, proof of insurance, or operational files.

### GPS Location
A location record representing a unit or participant position. GPS is not a first step, but it is a clear long-term operational capability and should eventually be modeled explicitly.

### Incident
An operational issue or exception that requires attention, such as a missing unit, communication problem, staging delay, or safety concern.

## 4. Hierarchy

The product should be organized around clear domain hierarchy.

### Platform
The platform is the top-level environment hosting all organizations and shared infrastructure.

### Organizations
Organizations sit below the platform and own their own events and member relationships.

### Events
Events belong to organizations and define the operational context for planning and execution.

### Event-specific operational objects
Within each event, the system should manage objects specific to that event such as parades, units, staging data, check-in processes, documents, and communications.

### Parade hierarchy
For parades, the hierarchy is:

Organization -> Event -> Parade -> Parade Units

This structure keeps the operational focus close to the parade while preserving organization ownership and event context.

### Camp Nackte hierarchy
For Camp Nackte, the hierarchy is:

Organization -> Event -> Guests / Reservations / Waivers

This reflects the current use case without prematurely forcing all workflows into the same abstraction.

## 5. Mission Control Philosophy

Mission Control is the core user experience for operational management.

### Organization Mission Control
Organization Mission Control should show the organization’s current state across events, staffing, participation, and communications. It serves as the anchor for organizational oversight.

### Event Mission Control
Event Mission Control should focus on the execution of a single event, showing readiness, parade flow, operational objects, and event-day needs.

### Parade Day Mission Control
Parade Day Mission Control is the most operationally intense view. It should focus on what the team needs to know right now:

- unit readiness
- lineup state
- staging state
- communications status
- alerts and incidents
- selected unit context

### Selected Unit model
The selected unit should be the central focus of Mission Control. The user experience should revolve around a chosen parade unit and the related operational context around that unit.

### Synchronized operational surfaces
The following surfaces should eventually align around the selected unit:

- map
- lineup
- communications
- alerts
- incident log

This creates a cohesive operational center rather than a collection of unrelated screens.

## 6. Parade Lifecycle

Parade operations should be understood as a lifecycle, not a single screen or one-time workflow.

### Planning
The organization and event team define the parade concept, expectations, staffing, and schedule.

### Registration
Participants, units, and related contacts are entered into the system.

### Review & Approval
Organizers review submissions, confirm details, and ensure readiness.

### Lineup Building
The parade order is constructed and unit sequence is arranged.

### Pre-Event Communications
Messages, reminders, and operational instructions are prepared and delivered.

### Check-In
Units and participants are confirmed as present and ready.

### Staging
Units move into staging areas and prepare for movement.

### Parade In Progress
Operations become live, with status, movement, messaging, and incident response in motion.

### Post-Parade
The event is closed out, notes are captured, and follow-up tasks are logged.

### Archive
Historical data is preserved for later review, reporting, and future planning.

## 7. Roles

The platform should eventually support a layered role model.

### Platform Admin
Manages shared platform infrastructure, platform-wide settings, and cross-organization concerns.

### Organization Owner
Owns the organization and has broad rights over organization settings and membership.

### Organization Admin
Supports organization administration and operational oversight.

### Staff
Performs day-to-day operational tasks for one or more events.

### Volunteer
Supports event operations with limited or scoped access.

### Judge
May need access to event or parade context without full operational ownership.

### Unit Captain
Represents a unit and may manage unit-specific information or participation details.

### Participant
A person participating in an event or parade and may need access to specific participant-facing workflows.

## 8. Waiver Strategy

Camp Nackte waiver handling should be treated as a real use case in ParadeOne for now.

The current situation is pragmatic:

- Camp Nackte waiver flows already exist in ParadeOne
- CampNackte.com may already exist and may eventually host or link to the waiver UI
- ParadeOne will eventually need participant waivers for broader event use

The system should not prematurely build a generic waiver engine before the pattern is proven. Instead:

- keep the current waiver implementation focused and useful
- let real use cases guide the abstraction
- avoid over-generalizing before there are multiple, clear waiver workflows

## 9. Near-Term Build Order

The build order should favor infrastructure and operational readiness over feature variety.

1. Authentication gateway
2. Organization membership
3. Organization Mission Control
4. Event model
5. Parade Unit foundation
6. Lineup
7. Check-in
8. Communications
9. GPS map
10. Incident log

This order reflects the need to establish shared context before building richer mission-control features.

## 10. Open Questions

Several product and architecture decisions remain open:

- Whether Camp Nackte remains a separate website long-term
- Whether Event should be formalized before Parade
- How public participant links should authenticate
- How text-message replies should be stored
- How GPS permissions should work

These questions should be revisited as the system grows and as real event workflows make the tradeoffs clearer.
