# Cortile · Monday Triage

A React and TypeScript tool for Priya, the Riverside Quarter building manager. The queue opens on the Cortile API snapshot with unresolved maintenance tickets, review bands, evidence for each escalation, and expandable ticket details.

## Purpose and scope

Monday Triage helps Priya decide which unresolved repairs at Riverside Quarter need attention first. A ticket marked urgent may already have a response, while a medium-priority repair may have gone unanswered for days or be part of a cluster in the same block. The queue combines ticket details, home records and resident feedback to make those differences visible.

The queue supports review and prioritisation. Ticket resolution and resident messaging take place through the building team's existing workflow. The take-home API provides read-only access.

## Queue layout

- **Immediate follow-up** displays up to five tickets with possible safety, security or essential-service risks. Additional tickets appear in the collapsible queue below, so the first view stays focused.
- **Ticket cards** separate status, time unresolved and reported priority. Red tags highlight risk and other triage signals. Supporting evidence appears in **Request details**.
- **Response gaps** are highlighted in yellow from five days and red from ten days. Gaps over 20 days qualify for **Follow up**. The calculation starts at the first recorded response or, for unanswered tickets, at creation. The API supplies only the first response timestamp, so later activity may be missing.
- **Household size** appears as context in the ticket details. Occupant count is difficult to turn into a fair priority because a serious issue affecting one person can require faster action than a minor issue affecting several.

A live API check loaded 189 tickets and ranked 15 unresolved requests from the 30 September 2026 snapshot.

## Run locally

Requires Node.js 22.18 or later.

```sh
npm install
npm run dev
```

Run the tests and production build in a separate terminal.

```sh
npm test
npm run build
```

## How the queue works

- **Review first** surfaces possible safety, security, or essential-service risks. Category-specific phrases in the title and description help identify hazards. Possible communal safety issues rank first within this band. These are clues for Priya to verify. Simple phrase matching can miss risks or misread negation.
- **Follow up** surfaces possible worsening property damage and equipment faults ahead of other follow-up work, and combines service and resident-experience signals. A possible wider issue adds 4 points when at least two distinct homes in the same block have unresolved reports of the same category within 48 hours of the ticket. This is a clue to investigate a shared cause. Recent 1–2/5 feedback on the ticket adds 3 points and another recent low rating by the same resident on a different ticket adds 2. The feedback window is 30 days. A response gap longer than 20 days adds 2 points.
- **Routine** covers other unresolved work. Within the risk and follow-up ordering, reported priority breaks ties, followed by ticket age and ID. Reported urgency records how a ticket was raised.
- **Occupancy** shows current resident records for the home where available. The calculation uses the supplied resident snapshot and move-out dates. Household size carries zero ranking weight because it does not establish severity.

These thresholds are prototype assumptions. The queue supports Cortile-aligned principles through risk-first review, resident feedback, visible response delays, and traceable explanations tied to ticket IDs. Resolved work drops out of the queue while its recent feedback can still inform resident experience. The model contains no contractor-to-ticket joins.

## Ticket topics

Topic tags are based on the ticket category, title, description and communal location. Tickets can have multiple topics. For example, a communal lift report can appear under Lifts and Communal, while a dishwasher that will not drain can appear under Appliances and Plumbing. Access brings together window, door, lift and communal wording for review. Topic tags support filtering in the collapsible queue. Red risk tags and immediate placement still depend on the separate triage rules.

## API boundary

The queue loads Riverside Quarter directly from the [Cortile API](https://takehome.cortile.com/docs) using unauthenticated browser requests. It resolves the community by name, follows the cursor on tickets, homes, feedback and residents, and joins ticket locations to homes by ID. Communal tickets have no home or confirmed block. Resident records contribute occupancy context through IDs and tenancy dates.

The client requests up to 10 records per page and follows each cursor until the API returns a null cursor. It ranks the combined results in the browser and filters the queue locally. React keeps the ranked queue in memory while the page is open. The app has no persistent cache, so refreshing, retrying, or switching back to live data fetches the results again.

The API serves a fixed snapshot from 30 September 2026 at 08:00 UTC. Ticket age, feedback recency and occupancy use that clock. The UI offers a labelled demo mode and a retry button for API failures.

## Project structure

- `src/main.tsx` mounts React.
- `src/components/MondayTriage/` contains the page component, ticket list, demo data and ranking rules. The `triage/` subfolder evaluates risk, response gaps and feedback.
- `src/api/` contains the Cortile API client and cursor pagination.
- `tests/` covers ranking, response and satisfaction signals, cluster safeguards, occupancy independence and pagination.
