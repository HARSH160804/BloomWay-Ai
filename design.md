# BloomWay AI — System Design Document

> **Track:** AI for Learning & Developer Productivity  
> **Version:** 1.0  
> **Date:** January 25, 2026

---

## 1. System Overview

BloomWay AI is an AI-powered system that transforms the way developers and students understand unfamiliar codebases. The system ingests source code repositories, processes them through multiple analysis stages, and leverages Large Language Models to generate human-readable explanations, architecture summaries, and contextual answers to user questions.

### Design Principles

| Principle | Description |
|-----------|-------------|
| **AI-Native** | LLMs are central to the product, not an afterthought |
| **Semantic Over Syntactic** | Focus on understanding intent, not just structure |
| **Conversational** | Natural language as the primary interaction paradigm |
| **Progressive Disclosure** | Start with high-level views, allow drill-down |
| **Privacy-First** | Minimize data retention, support private repositories |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
│                    (Web Application - Browser-based)                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND API                                     │
│                         (REST API Gateway)                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
         ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
         │  CODE PROCESSING │ │   AI REASONING   │ │    RESPONSE      │
         │     ENGINE       │ │      LAYER       │ │    GENERATOR     │
         └──────────────────┘ └──────────────────┘ └──────────────────┘
                    │                 │                 │
                    ▼                 ▼                 ▼
         ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
         │   Vector Store   │ │    LLM APIs      │ │   Cache Layer    │
         │   (Embeddings)   │ │ (OpenAI/Gemini)  │ │    (Results)     │
         └──────────────────┘ └──────────────────┘ └──────────────────┘
```

### Component Interaction Flow

```
User Request → API Gateway → Route to appropriate service
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
     [Ingest Repo]          [Ask Question]          [Explain File]
            │                       │                       │
            ▼                       ▼                       ▼
    Code Processing         AI Reasoning              AI Reasoning
            │                       │                       │
            ▼                       ▼                       ▼
    Store Embeddings        Retrieve Context         Generate Explanation
            │                       │                       │
            └───────────────────────┼───────────────────────┘
                                    ▼
                           Response Generator
                                    │
                                    ▼
                              User Response
```

---

## 3. Component Breakdown

### 3.1 User Interface

**Purpose:** Provide an intuitive, browser-based interface for codebase exploration and interaction.

| Element | Function |
|---------|----------|
| **Repository Input** | Accept GitHub URLs or file uploads |
| **File Navigator** | Tree-view of repository structure |
| **Code Viewer** | Syntax-highlighted source display |
| **Explanation Panel** | AI-generated summaries and explanations |
| **Chat Interface** | Conversational Q&A with the codebase |
| **Architecture View** | High-level project overview |

**Key Characteristics:**
- Single-page application for responsiveness
- Split-pane layout (navigation + content + chat)
- Real-time progress indicators during processing
- Markdown rendering for formatted explanations

---

### 3.2 Backend API

**Purpose:** Orchestrate requests between the frontend and processing services; manage sessions and state.

| Endpoint Category | Responsibility |
|-------------------|----------------|
| **Ingestion** | Accept repository sources, trigger processing pipeline |
| **Query** | Route questions to AI Reasoning Layer |
| **Retrieval** | Serve file contents, explanations, and architecture data |
| **Session** | Manage user sessions and conversation history |

**API Design Principles:**
- RESTful endpoints with JSON payloads
- Stateless request handling
- Async processing for long-running operations
- Webhook/polling for ingestion status updates

**Core Endpoints:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/repos/ingest` | Start repository ingestion |
| GET | `/repos/{id}/status` | Check ingestion progress |
| GET | `/repos/{id}/architecture` | Retrieve architecture summary |
| GET | `/repos/{id}/files/{path}` | Get file with explanation |
| POST | `/repos/{id}/chat` | Submit a question |

---

### 3.3 Code Processing Engine

**Purpose:** Ingest repositories, parse source files, and prepare code for AI analysis.

```
Repository URL/Upload
         │
         ▼
┌─────────────────┐
│  Clone / Unzip  │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  File Discovery │ ──→ Filter by supported languages
└─────────────────┘      Exclude binaries, dependencies
         │
         ▼
┌─────────────────┐
│  Code Parsing   │ ──→ Extract functions, classes, imports
└─────────────────┘      Identify structure and relationships
         │
         ▼
┌─────────────────┐
│    Chunking     │ ──→ Split into semantic units
└─────────────────┘      Respect function/class boundaries
         │
         ▼
┌─────────────────┐
│   Embedding     │ ──→ Generate vector representations
└─────────────────┘      Store in vector database
         │
         ▼
┌─────────────────┐
│ Index & Store   │
└─────────────────┘
```

**Key Responsibilities:**

| Stage | Function |
|-------|----------|
| **Clone/Extract** | Retrieve code from GitHub or uploaded archives |
| **Discovery** | Enumerate files, detect languages, filter irrelevant content |
| **Parsing** | Extract structural information (AST-level) per language |
| **Chunking** | Divide code into LLM-digestible segments while preserving context |
| **Embedding** | Convert chunks to vector representations for similarity search |
| **Indexing** | Store embeddings and metadata for fast retrieval |

---

### 3.4 AI Reasoning Layer

**Purpose:** Apply Large Language Models to understand, synthesize, and explain code semantically.

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI REASONING LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Retrieval     │  │   Reasoning     │  │   Synthesis     │  │
│  │   (RAG)         │  │   (LLM)         │  │   (Output)      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│         │                    │                    │              │
│         ▼                    ▼                    ▼              │
│  Find relevant        Apply LLM to          Combine into        │
│  code chunks          understand and        coherent response   │
│  via similarity       reason about code                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Core Functions:**

| Function | Description |
|----------|-------------|
| **Context Retrieval** | Query vector store to find code chunks relevant to user's question |
| **Architecture Analysis** | Multi-pass LLM reasoning to synthesize high-level understanding |
| **File Explanation** | Generate natural language description of file purpose and contents |
| **Q&A Processing** | Answer user questions using retrieved context + LLM reasoning |
| **Pattern Detection** | Identify architectural patterns, conventions, and design decisions |

**RAG (Retrieval-Augmented Generation) Pipeline:**

```
User Question
      │
      ▼
┌─────────────┐
│  Embed      │ ──→ Convert question to vector
│  Question   │
└─────────────┘
      │
      ▼
┌─────────────┐
│  Retrieve   │ ──→ Find top-K similar code chunks
│  Context    │
└─────────────┘
      │
      ▼
┌─────────────┐
│  Construct  │ ──→ Combine: System Prompt + Context + Question
│  Prompt     │
└─────────────┘
      │
      ▼
┌─────────────┐
│  LLM Call   │ ──→ Generate answer with citations
└─────────────┘
      │
      ▼
   Response
```

---

### 3.5 Response Generator

**Purpose:** Format and structure AI outputs for presentation to users.

| Responsibility | Description |
|----------------|-------------|
| **Formatting** | Convert raw LLM output to structured, readable format |
| **Citation Linking** | Attach file paths and line numbers to claims |
| **Markdown Rendering** | Format code blocks, lists, and emphasis |
| **Confidence Indication** | Flag uncertain or incomplete answers |
| **Follow-up Suggestions** | Generate related questions for exploration |

**Output Types:**

| Type | Content |
|------|---------|
| **Architecture Summary** | Project overview, components, patterns, data flow |
| **File Explanation** | Purpose, key functions, relationships, complexity |
| **Q&A Answer** | Direct answer with citations and follow-ups |
| **Documentation** | README, API docs, getting-started guides |

---

## 4. Data Flow

### 4.1 Repository Ingestion Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  User    │───▶│  Clone   │───▶│  Parse   │───▶│  Chunk   │───▶│  Embed   │
│  Input   │    │  Repo    │    │  Files   │    │  Code    │    │  Vectors │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                                      │
                                                                      ▼
┌──────────┐    ┌──────────┐    ┌──────────┐                   ┌──────────┐
│  User    │◀───│ Display  │◀───│ Generate │◀──────────────────│  Store   │
│  Views   │    │ Summary  │    │ Summary  │                   │  Index   │
└──────────┘    └──────────┘    └──────────┘                   └──────────┘
```

### 4.2 Question Answering Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  User    │───▶│  Embed   │───▶│ Retrieve │───▶│ Construct│───▶│  Query   │
│ Question │    │  Query   │    │ Context  │    │  Prompt  │    │   LLM    │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                                      │
                                                                      ▼
┌──────────┐    ┌──────────┐    ┌──────────┐                   ┌──────────┐
│  User    │◀───│  Format  │◀───│   Add    │◀──────────────────│  Parse   │
│  Views   │    │ Response │    │Citations │                   │  Answer  │
└──────────┘    └──────────┘    └──────────┘                   └──────────┘
```

### 4.3 Data Persistence

| Data Type | Storage | Retention |
|-----------|---------|-----------|
| Repository metadata | Database | Until session expires |
| Code embeddings | Vector store | Session lifetime |
| Conversation history | Memory/Cache | Session lifetime |
| Generated summaries | Cache | 24 hours |
| User sessions | Memory | 24 hours |

---

## 5. AI Usage Justification

### 5.1 Why AI is Essential (Not Optional)

> **Core Premise:** Understanding code requires semantic reasoning that cannot be achieved through rule-based systems.

| Capability | Rule-Based Approach | AI-Powered Approach |
|------------|---------------------|---------------------|
| **Architecture Detection** | Pattern-match folder names ("controllers" → MVC) | Analyze actual data flow and separation of concerns |
| **Code Explanation** | Template-based docstrings | Context-aware, human-readable explanations |
| **Intent Inference** | Impossible | Understand what `process_data()` actually does |
| **Cross-File Reasoning** | Limited to explicit imports | Infer implicit relationships and patterns |
| **Natural Language Q&A** | Keyword matching only | True comprehension and synthesis |

### 5.2 AI Integration Points

| Feature | AI Role | Justification |
|---------|---------|---------------|
| **Architecture Summary** | Synthesize understanding across 100s of files | No rule can generalize across arbitrary projects |
| **File Explanation** | Explain purpose beyond what names suggest | Requires reading and understanding implementation |
| **Q&A** | Answer arbitrary natural language questions | Unbounded question space requires general intelligence |
| **Pattern Recognition** | Identify design patterns from code structure | Patterns are implicit, not labeled |
| **Documentation Generation** | Produce human-quality prose | Writing requires language fluency |

### 5.3 Why This Is Not Rule-Based Automation

```
RULE-BASED:
  IF folder == "models" THEN label = "Data Models"
  IF file.endswith("_controller") THEN label = "Controller"
  
LIMITATION: Fails on non-standard naming, misses intent, cannot explain WHY

AI-POWERED:
  LLM reads function bodies, understands data transformations,
  infers that "DataProcessor" class validates and transforms input,
  explains in natural language why each method exists
  
CAPABILITY: Works on arbitrary code, explains intent, adapts to context
```

---

## 6. Scalability Considerations

### 6.1 Scaling Challenges

| Challenge | Impact | Mitigation |
|-----------|--------|------------|
| **Large Repositories** | Ingestion time, storage costs | Progressive loading, prioritize key files |
| **LLM Token Limits** | Cannot process entire repo at once | Intelligent chunking, hierarchical summarization |
| **Concurrent Users** | API rate limits, compute costs | Request queuing, result caching |
| **Embedding Costs** | API costs scale with repo size | Batch processing, cache embeddings |

### 6.2 Optimization Strategies

**Caching Layer:**

| Cache Target | Strategy | Benefit |
|--------------|----------|---------|
| Embeddings | Persist per repository | Avoid re-computation |
| Architecture summaries | Cache for 24 hours | Reduce LLM calls |
| File explanations | Cache on first access | Instant repeat access |
| Q&A responses | Session-scoped cache | Reduce duplicate queries |

**Processing Optimizations:**

| Strategy | Description |
|----------|-------------|
| **Lazy Loading** | Generate explanations on-demand, not upfront |
| **Hierarchical Summarization** | Summarize files → modules → system |
| **Streaming Responses** | Return partial results as LLM generates |
| **Background Processing** | Pre-compute likely next actions |

### 6.3 Hackathon Scope Trade-offs

| Full Product | Hackathon MVP |
|--------------|---------------|
| Distributed processing queue | Single-threaded processing |
| Persistent vector database | In-memory vector store |
| Multi-region deployment | Single instance |
| 10K+ file support | 500 file limit |

---

## 7. Ethical & Responsible AI Considerations

### 7.1 Privacy & Data Handling

| Concern | Mitigation |
|---------|------------|
| **Code Exposure** | Session-based storage; auto-delete after 24 hours |
| **Sensitive Data in Code** | Warn users; do not persist credentials or secrets |
| **Third-Party LLM APIs** | Disclose that code is sent to external APIs |
| **Private Repositories** | OAuth tokens never logged; explicit consent required |

### 7.2 AI Transparency

| Concern | Mitigation |
|---------|------------|
| **Hallucination** | Always cite source files; indicate uncertainty |
| **Accuracy Limits** | Disclose that AI explanations may be incomplete |
| **Not a Replacement** | Position as learning aid, not authoritative source |

### 7.3 Fairness & Accessibility

| Concern | Mitigation |
|---------|------------|
| **Language Bias** | English-focused MVP; acknowledge limitation |
| **Skill Level Bias** | Adjustable explanation complexity |
| **Accessibility** | Follow web accessibility standards (WCAG) |

### 7.4 Responsible Use

| Concern | Mitigation |
|---------|------------|
| **Academic Integrity** | Designed for learning, not plagiarism |
| **Copyright** | Analyze code, do not reproduce verbatim |
| **Security Research** | Do not assist in finding exploits |

---

## 8. Future Enhancements

### 8.1 Short-Term (Post-Hackathon)

| Enhancement | Description | Priority |
|-------------|-------------|----------|
| **VS Code Extension** | Bring CodeLens AI into the IDE | High |
| **More Languages** | Rust, C++, Ruby, PHP support | High |
| **Diagram Generation** | Auto-generate architecture diagrams | Medium |
| **Comparison Mode** | Diff two codebases or versions | Medium |

### 8.2 Medium-Term (3-6 Months)

| Enhancement | Description | Priority |
|-------------|-------------|----------|
| **Team Workspaces** | Shared exploration sessions | High |
| **Learning Paths** | Guided tours through codebases | Medium |
| **Custom Indexing** | User-defined focus areas | Medium |
| **API Access** | Programmatic access for integrations | Medium |

### 8.3 Long-Term (6-12 Months)

| Enhancement | Description | Priority |
|-------------|-------------|----------|
| **Real-Time Collaboration** | Multi-user exploration | High |
| **Code Generation** | Suggest changes based on understanding | Medium |
| **Offline Mode** | Local LLM for sensitive codebases | Low |
| **CI/CD Integration** | Auto-generate docs on commit | Medium |

---

## Appendix: Technology Recommendations

### Hackathon Stack (Recommended)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | React + TypeScript | Fast development, rich ecosystem |
| **Backend** | Python (FastAPI) | Async, LLM library support |
| **Vector Store** | ChromaDB (in-memory) | Zero configuration, Python-native |
| **LLM** | OpenAI GPT-4o-mini | Best quality/cost for hackathon |
| **Embeddings** | OpenAI text-embedding-3-small | High quality, low cost |

### Production Stack (Future)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Vector Store** | Pinecone / Weaviate | Managed, scalable |
| **Database** | PostgreSQL | Reliable, full-featured |
| **Queue** | Redis + Celery | Background job processing |
| **Hosting** | Vercel (FE) + Railway (BE) | Simple deployment |

---

*System design document prepared for hackathon submission — Old Monkey AI Team*
