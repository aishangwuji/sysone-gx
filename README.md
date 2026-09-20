# SysOne GX: TypeSafe System One Visual Decision Workflow Studio

SysOne GX is a production-ready visual decision tree workflow studio and live simulation sandbox tailored specifically for **TypeSafe (System One / Jev)** probabilistic models.

It allows prompt engineers and AI workflow developers to compose, simulate, and export complex, calibrated, multi-question decision trees with parallel batch optimization and confidence-based guardrails.

---

## 🚀 Key Capabilities

1. **Parallel Question Batching (`batchNode`)**:
   - Single API call evaluates multiple questions simultaneously (`client.system_one(state=..., questions={...})`).
   - Supports **Choice** (categorical routing), **Score** (ordered level positions), and **Noul** (calibrated probabilities).

2. **Confidence-based Guardrails**:
   - Built-in low-confidence fallback handles (`fallback_handle`) that route tickets or requests to human review or escalation queues whenever confidence falls below threshold.

3. **Interactive Configuration Inspector**:
   - Fine-tune questions, options, definitions (`what`), exclusions (`not_for`), few-shot examples, and thresholds in real-time.

4. **Real-time Live Sandbox & Trace Simulation**:
   - Test with realistic customer support scenarios or arbitrary JSON payloads.
   - Animated visual path tracing on the canvas with probability gauges and execution logs.

5. **Native Code Export**:
   - One-click export for **Python SDK (`typesafe_sdk`)**, **TypeScript**, and **Workflow DSL (JSON)**.

6. **Full Internationalization (i18n)**:
   - One-click seamless language switching between **简体中文 (Simplified Chinese)** and **English**.

---

## 🛠️ Tech Stack

- **Framework**: Vite + React 19 + TypeScript
- **Flow Engine**: `@xyflow/react` (React Flow 12)
- **Styling**: Tailwind CSS + Lucide Icons
- **State Management**: Zustand
- **Quality Assurance**: Oxlint + TypeScript Compiler (`tsc`)

---

## 📦 Getting Started

### Installation
```bash
pnpm install
```

### Development Server
```bash
pnpm dev
```
Visit [http://localhost:5173/](http://localhost:5173/) in your browser.

### Production Build
```bash
pnpm build
```

---

## 📄 License
MIT
