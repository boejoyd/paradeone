# ParadeOne Database Design v1.0

## Core Principle
The central object in ParadeOne is an Entry.

An Entry may be a float, walking group, band, vehicle, motorcycle group, dignitary, sponsor, emergency unit, or any other parade participant.

## Primary Hierarchy

Organization
→ Event
→ Section
→ Zone
→ Staging Spot
→ Entry

## Foundation Tables

### organizations
Represents a customer or organizing body.

Examples:
- Pride San Antonio
- Fiesta Parade Association

Fields:
- id
- name
- slug
- created_at

### profiles
Represents a logged-in user.

Fields:
- id
- full_name
- email
- phone
- created_at

### organization_members
Connects users to organizations.

Fields:
- id
- organization_id
- profile_id
- role
- created_at

### events
Represents one parade or event.

Fields:
- id
- organization_id
- name
- event_date
- status
- created_at

## Parade Structure Tables

### zones
Operational map areas.

Examples:
- Blue Zone
- Green Zone
- Main Street
- Judging Area
- Dispersal Area

### sections
Groups of entries that line up together and enter the parade together.

Examples:
- Blue Section
- Green Section
- VIP Section

### staging_spots
Specific assigned physical locations.

Fields:
- id
- event_id
- section_id
- zone_id
- spot_code
- latitude
- longitude
- geofence_radius_feet
- sort_order

### parade_numbers
The official prebuilt parade number list.

Fields:
- id
- event_id
- number
- section_id
- staging_spot_id
- status

## Entry Tables

### entries
The main parade participant record.

Fields:
- id
- event_id
- parade_number_id
- section_id
- staging_spot_id
- name
- entry_type
- status
- announcer_script
- estimated_length_feet
- created_at

### entry_contacts
People responsible for an entry.

Fields:
- id
- entry_id
- name
- email
- phone
- is_primary

### vehicles
Vehicle/float information.

Fields:
- id
- entry_id
- vehicle_type
- length_feet
- width_feet
- height_feet
- license_plate
- driver_name
- driver_phone

## Operations Tables

### check_ins
Records when an entry checks in.

Fields:
- id
- entry_id
- checked_in_at
- latitude
- longitude
- distance_from_spot_feet
- method
- checked_in_by

### location_updates
Temporary live location sharing.

Fields:
- id
- entry_id
- latitude
- longitude
- accuracy_meters
- speed_mph
- heading
- created_at

### messages
SMS/email messages sent through ParadeOne.

Fields:
- id
- event_id
- entry_id
- recipient_phone
- message_body
- message_type
- sent_at

### section_releases
Tracks when a section is told to move.

Fields:
- id
- section_id
- released_by
- released_at
- number_of_entries_notified
- message_body

## Announcer and Judging Tables

### announcer_scripts
Stores final announcer copy.

Fields:
- id
- entry_id
- script_text
- approved_at
- approved_by

### judge_scores
Stores judging results.

Fields:
- id
- entry_id
- judge_id
- category
- score
- notes
- created_at

## Event Lifecycle

draft
registration_open
registration_closed
review
lineup_building
lineup_locked
assignments_sent
check_in_open
parade_active
awards
archived

## Entry Statuses

draft
submitted
needs_review
approved
rejected
assigned
instructions_sent
checked_in
moving
on_route
completed
no_show
