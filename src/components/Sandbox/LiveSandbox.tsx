import React, { useState } from 'react';
import { useWorkflowStore } from '../../store/useWorkflowStore';
import { runWorkflowSimulation } from '../../utils/simulator';
import { PRESET_STATES } from '../../utils/defaultTemplates';
import { Play, RotateCcw, Sparkles, AlertCircle, Terminal } from 'lucide-react';
import confetti from 'canvas-confetti';

export function LiveSandbox() {
  const {
    nodes,
    edges,
    testStateInput,
    setTestStateInput,
    isSimulating,
    setIsSimulating,
    simulationTrace,
    setSimulationTrace,
    setNodes,
    clearSimulation,
    t
  } = useWorkflowStore();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRun = async () => {
    if (!testStateInput.trim()) {
      setErrorMsg(t.sandbox.emptyInputError);
      return;
    }

    setErrorMsg(null);
    setIsSimulating(true);

    try {
      const { trace, updatedNodes } = await runWorkflowSimulation(
        nodes,
        edges,
        testStateInput
      );

      setNodes(updatedNodes);
      setSimulationTrace(trace);

      if (trace.finalAction) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8, x: 0.85 }
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Execution failed.');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="p-4 flex flex-col h-full bg-[#0B1219] border-l border-[#282D3D]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-gray-200">{t.sandbox.title}</h3>
        </div>
        <button
          onClick={clearSimulation}
          className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1"
          title="Reset trace state"
        >
          <RotateCcw className="w-3 h-3" />
          {t.sandbox.reset}
        </button>
      </div>

      {/* Presets */}
      <div className="mb-3">
        <label className="block text-[11px] font-medium text-gray-400 mb-1.5">
          {t.sandbox.loadPreset}
        </label>
        <div className="flex flex-wrap gap-1">
          {PRESET_STATES.map((ps, i) => (
            <button
              key={i}
              onClick={() => setTestStateInput(ps.state)}
              className="px-2 py-0.5 rounded text-[10px] bg-[#151821] border border-[#282D3D] text-gray-300 hover:bg-[#1C202C] hover:text-white truncate max-w-[140px]"
            >
              {ps.name}
            </button>
          ))}
        </div>
      </div>

      {/* State Input */}
      <div className="mb-3">
        <label className="block text-[11px] font-medium text-gray-400 mb-1">
          {t.sandbox.stateInputLabel}
        </label>
        <textarea
          rows={3}
          value={testStateInput}
          onChange={(e) => setTestStateInput(e.target.value)}
          placeholder={t.sandbox.statePlaceholder}
          className="w-full bg-[#0F1118] border border-[#282D3D] rounded-lg px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-primary"
        />
      </div>

      {/* Run Control */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={handleRun}
          disabled={isSimulating}
          className="flex-1 py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          <Play className="w-4 h-4 fill-white" />
          {isSimulating ? t.sandbox.runningBtn : t.sandbox.runBtn}
        </button>
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 mb-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Trace Execution Logs */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#0F1118] rounded-lg border border-[#282D3D] overflow-hidden">
        <div className="p-2.5 bg-[#151821] border-b border-[#282D3D] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-mono text-gray-300">{t.sandbox.executionTrace}</span>
          </div>
          {simulationTrace && (
            <span className="text-[10px] text-emerald-400 font-mono">
              {t.sandbox.visitedCount.replace('{count}', String(simulationTrace.visitedNodeIds.length))}
            </span>
          )}
        </div>

        <div className="flex-1 p-3 overflow-y-auto space-y-2 font-mono text-xs">
          {!simulationTrace ? (
            <div className="text-gray-500 italic text-center py-6">
              {t.sandbox.noTraceYet}
            </div>
          ) : (
            simulationTrace.logs.map((log, lidx) => (
              <div
                key={lidx}
                className={`p-1.5 rounded border text-[11px] line-clamp-3 ${
                  log.type === 'decision'
                    ? 'bg-[#12141C] border-primary/30 text-gray-200'
                    : log.type === 'fallback'
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                    : log.type === 'action'
                    ? 'bg-sky-950/40 border-sky-500/40 text-sky-200 font-bold'
                    : 'bg-[#151821] border-[#282D3D] text-gray-400'
                }`}
              >
                <span className="opacity-70 mr-1">[{log.type}]</span>
                {log.message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
