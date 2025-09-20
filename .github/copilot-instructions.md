# PhisioLog Backend - AI Agent Instructions

## Project Overview

PhisioLog is a health journaling backend built with Node.js/Express/TypeScript, supporting AI-powered health record creation through voice input and conversational interfaces. The system processes natural language descriptions into structured health records using OpenAI GPT-3.5-turbo and Google Cloud Speech-to-Text.

## Architecture Patterns

### Modular Startup System

The app bootstraps through `src/index.ts` using three startup modules:

- `startup/db.ts` - MongoDB connection (currently without authentication)
- `startup/routes.ts` - Express middleware and route mounting
- `startup/server.ts` - Port binding and global error handling

### Conversation-Based Validation Flow

The core feature uses a stateful conversation system (`Map<string, Conversation>`) that:

1. Maintains conversation history with OpenAI format messages
2. Tracks validation state (`requestedData` object) to avoid re-asking for data
3. Uses cron jobs to clean stale conversations every hour
4. Stores `healthRecordId` for update operations

### Three-Layer Validation Architecture

Health records use a sophisticated validation pattern:

1. **Zod Schema** (`healthRecordValidation.ts`) - Type-safe runtime validation
2. **Mongoose Schema** (`healthRecord.ts`) - Database constraints and defaults
3. **Custom Validators** (`customValidators.ts`) - Business logic (minimum symptoms, follow-up prompts)

## Key Development Patterns

### AI Integration Standards

- All AI prompts live in `ai-prompts/prompts.ts` with template literal formatting
- Use `jsonGen()` for structured data extraction, `textGen()` for conversational responses
- Google Cloud Speech-to-Text requires `phisiolog-service-account.json` in project root
- Conversation history follows OpenAI message format: `{role: "system|user|assistant", content: string}`

### Data Model Conventions

- Use nested Mongoose schemas (e.g., `statusSchema`, `symptomSchema`) for complex objects
- Enum values defined as `const` arrays in service files, then referenced in Zod and Mongoose
- Date handling: Convert string dates to `Date` objects before Zod validation
- Default user is hardcoded as `"me"` (authentication pending)

### Error Handling & Validation

```typescript
// Pattern: Validate with Zod, then add to conversation if needed
const validationResult = await validateHealthRecord(healthRecord, conversation);
if (validationResult.assistantPrompt) {
  conversation.history.push({ role: "assistant", content: validationResult.assistantPrompt });
}
```

## Development Workflow

### Docker Setup (Highly Recommended)

Docker is the **preferred development approach** for consistent environments:

```bash
npm install
docker compose build --no-cache  # Initial build only
docker compose up                 # Start containers
docker compose up --build        # When dependencies change
docker compose down              # Stop containers
```

**Critical**: Add `MONGO_HOST=mongo` to `.env` file for Docker setup.

### Alternative Local Development

```bash
npm run dev          # Uses nodemon with ts-node and .env file
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier formatting
```

### Docker Volume Management

- Anonymous volumes preserve `node_modules` in containers
- Rebuild container when adding/removing dependencies
- Use `docker compose build` for initial setup, then `docker compose up` for regular starts

### Key File Locations

- Health record logic: `src/models/health-record/` (model, validation, service constants)
- Routes: `src/routes/healthRecords.routes.ts` (single route file with conversation management)
- AI services: `src/services/genAI.ts` and `src/services/transcription.ts`
- Config: `src/config.ts` (MongoDB connection strings)

### Environment Dependencies

- `OPENAI_API_KEY` required for AI features
- `MONGO_HOST=mongo` required for Docker setup (use `localhost` for local)
- Google Cloud service account JSON (`phisiolog-service-account.json`) for speech-to-text
- MongoDB runs on default port 27017 (no auth in development)

## Common Integration Points

- **Frontend Communication**: REST API with conversational flow (not GraphQL despite README mention)
- **External APIs**: OpenAI GPT-3.5-turbo, Google Cloud Speech-to-Text
- **Data Flow**: Audio → Transcription → AI Parsing → Zod Validation → MongoDB Storage
- **State Management**: In-memory conversation storage with automatic cleanup

## Testing & Debugging

The project includes a `transcript-test-10-seconds.wav` file for testing audio transcription. No formal test suite exists yet - validation happens through the conversation flow and manual testing.
