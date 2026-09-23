import React, { useState } from 'react';
import { useWorkflowStore } from '../../store/useWorkflowStore';
import { runWorkflowSimulation } from '../../utils/simulator';
import {
  ProviderType,
  ProviderConfig,
  DEFAULT_PROVIDER_CONFIG,
  STATE_PRESETS,
  pingProvider,
} from '../../utils/decisionService';
import {
  Play,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Terminal,
  Cpu,
  Zap,
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Activity,
  Code2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import clsx from 'clsx';

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
    t,
  } = useWorkflowStore();

  // 服务商与接入配置
  const [provider, setProvider] = useState<ProviderType>('openrouter');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [endpoint, setEndpoint] = useState(DEFAULT_PROVIDER_CONFIG.openrouter.endpoint);
  const [model, setModel] = useState(DEFAULT_PROVIDER_CONFIG.openrouter.model);
  const [showConfig, setShowConfig] = useState(false);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  // 连通性测试状态
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{
    success: boolean;
    latencyMs: number;
    message: string;
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleProviderChange = (p: ProviderType) => {
    setProvider(p);
    setEndpoint(DEFAULT_PROVIDER_CONFIG[p].endpoint);
    setModel(DEFAULT_PROVIDER_CONFIG[p].model);
    setPingResult(null);
    setErrorMsg(null);
  };

  const handlePingTest = async () => {
    if (provider !== 'local' && !apiKey.trim()) {
      setPingResult({
        success: false,
        latencyMs: 0,
        message: '请先填入有效的 API Key',
      });
      return;
    }

    setPinging(true);
    setPingResult(null);
    try {
      const config: ProviderConfig = {
        provider,
        apiKey,
        endpoint,
        model,
      };
      const res = await pingProvider(config);
      setPingResult(res);
    } catch (err: any) {
      setPingResult({
        success: false,
        latencyMs: 0,
        message: err.message || '连通性测试失败',
      });
    } finally {
      setPinging(false);
    }
  };

  const handleRun = async () => {
    if (!testStateInput.trim()) {
      setErrorMsg(t.sandbox.emptyInputError);
      return;
    }

    if (provider !== 'local' && !apiKey.trim()) {
      setErrorMsg(`未配置 ${provider === 'openrouter' ? 'OpenRouter API Key (sk-or-v1-...)' : 'TypeSafe API Key'}。真实调用 Jev 模型必须提供有效密钥，或切换至本地离线评估。`);
      return;
    }

    setErrorMsg(null);
    setIsSimulating(true);

    try {
      const config: ProviderConfig = {
        provider,
        apiKey,
        endpoint,
        model,
      };

      const { trace, updatedNodes } = await runWorkflowSimulation(
        nodes,
        edges,
        testStateInput,
        config
      );

      setNodes(updatedNodes);
      setSimulationTrace(trace);

      if (trace.finalAction) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8, x: 0.85 },
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Jev 模型调用执行失败');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCopyRaw = () => {
    if (!simulationTrace?.rawResponse) return;
    navigator.clipboard.writeText(simulationTrace.rawResponse);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  return (
    <div className="p-4 flex flex-col h-full bg-[#0B1219] border-l border-[#282D3D] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-gray-200">{t.sandbox.title}</h3>
        </div>
        <button
          onClick={clearSimulation}
          className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1 transition-colors"
          title="清空仿真追踪态"
        >
          <RotateCcw className="w-3 h-3" />
          {t.sandbox.reset}
        </button>
      </div>

      {/* Provider Selector (对齐 bbs-go) */}
      <div className="mb-3 p-1.5 rounded-lg bg-[#0F1118] border border-[#282D3D] space-y-2 shrink-0">
        <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium px-1">
          <span>服务商接入：</span>
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="text-primary hover:underline flex items-center gap-0.5 text-[10px]"
          >
            {showConfig ? '收起参数' : '展开参数'}
            {showConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => handleProviderChange('local')}
            className={clsx(
              'flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs font-semibold transition-all',
              provider === 'local'
                ? 'bg-[#1E2333] text-primary border border-primary/40 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#151821]'
            )}
          >
            <Cpu className="w-3 h-3" />
            <span>本地离线评估</span>
          </button>

          <button
            type="button"
            onClick={() => handleProviderChange('openrouter')}
            className={clsx(
              'flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs font-semibold transition-all',
              provider === 'openrouter'
                ? 'bg-purple-950/60 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#151821]'
            )}
          >
            <Zap className="w-3 h-3 text-purple-400" />
            <span>OpenRouter (真实)</span>
          </button>

          <button
            type="button"
            onClick={() => handleProviderChange('typesafe')}
            className={clsx(
              'flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs font-semibold transition-all',
              provider === 'typesafe'
                ? 'bg-sky-950/60 text-sky-300 border border-sky-500/40 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#151821]'
            )}
          >
            <ShieldCheck className="w-3 h-3 text-sky-400" />
            <span>TypeSafe 官方 (真实)</span>
          </button>
        </div>

        {/* Provider Config Details */}
        {showConfig && provider !== 'local' && (
          <div className="mt-2 pt-2 border-t border-[#232736] space-y-2 text-xs">
            {/* API Key Input */}
            <div>
              <div className="flex items-center justify-between mb-1 text-[11px] text-gray-400">
                <span>API Key (必填，真实请求 Jev 模型):</span>
              </div>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={DEFAULT_PROVIDER_CONFIG[provider].placeholderKey}
                  className="w-full bg-[#12141C] border border-[#2B3145] rounded px-2.5 py-1.5 pr-8 text-xs font-mono text-gray-200 focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-2 text-gray-500 hover:text-gray-300"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Endpoint */}
            <div>
              <label className="block text-[11px] text-gray-400 mb-0.5">接口地址 (Endpoint):</label>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="w-full bg-[#12141C] border border-[#2B3145] rounded px-2.5 py-1 text-xs font-mono text-gray-300 focus:outline-none focus:border-primary"
              />
            </div>

            {/* Model */}
            <div>
              <label className="block text-[11px] text-gray-400 mb-0.5">模型标识 (Model):</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-[#12141C] border border-[#2B3145] rounded px-2.5 py-1 text-xs font-mono text-gray-300 focus:outline-none focus:border-primary"
              />
            </div>

            {/* Ping Test Button */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handlePingTest}
                disabled={pinging}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#202535] hover:bg-[#282E42] text-gray-300 text-[11px] font-medium border border-[#2F364C] transition-colors"
              >
                <Activity className="w-3 h-3 text-sky-400" />
                {pinging ? '正在连接接口...' : '测试接口连通性'}
              </button>

              {pingResult && (
                <span
                  className={clsx(
                    'text-[10px] font-mono flex items-center gap-1',
                    pingResult.success ? 'text-emerald-400' : 'text-rose-400'
                  )}
                >
                  {pingResult.success ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {pingResult.latencyMs}ms ({pingResult.success ? '连通' : '报错'})
                </span>
              )}
            </div>
            {pingResult && (
              <div
                className={clsx(
                  'p-1.5 rounded text-[10px] leading-tight font-mono',
                  pingResult.success
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20'
                    : 'bg-rose-950/40 text-rose-300 border border-rose-500/20'
                )}
              >
                {pingResult.message}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preset State Samples */}
      <div className="mb-2 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-gray-400">快速填入测试样本：</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATE_PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setTestStateInput(p.text)}
              className="px-2 py-0.5 rounded text-[10px] bg-[#141724] hover:bg-[#1D2133] border border-[#282E42] text-gray-300 font-medium transition-colors"
              title={`填入：${p.name}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* State Input */}
      <div className="mb-3 shrink-0">
        <label className="block text-[11px] font-medium text-gray-400 mb-1">
          {t.sandbox.stateInputLabel}
        </label>
        <textarea
          rows={3}
          value={testStateInput}
          onChange={(e) => setTestStateInput(e.target.value)}
          placeholder={t.sandbox.statePlaceholder}
          className="w-full bg-[#0F1118] border border-[#282D3D] rounded-lg px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-primary resize-y"
        />
      </div>

      {/* Run Control */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <button
          onClick={handleRun}
          disabled={isSimulating}
          className="flex-1 py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          {isSimulating ? t.sandbox.runningBtn : '运行真实决策调用'}
        </button>
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 mb-3 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Decision Summary Card */}
      {simulationTrace && (
        <div className="mb-3 p-3 rounded-xl bg-gradient-to-br from-[#131724] to-[#0E1018] border border-[#2B3147] space-y-2.5 shrink-0">
          <div className="flex items-center justify-between border-b border-[#242A3D] pb-2">
            <div className="flex items-center gap-2">
              <span
                className={clsx(
                  'px-2 py-0.5 rounded text-xs font-bold font-mono',
                  simulationTrace.suggestedAction?.includes('拦截') ||
                    simulationTrace.rejectReasons?.length
                    ? 'bg-rose-950 text-rose-300 border border-rose-800/40'
                    : simulationTrace.suggestedAction?.includes('人工') ||
                      simulationTrace.reviewReasons?.length
                    ? 'bg-amber-950 text-amber-300 border border-amber-800/40'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                )}
              >
                {simulationTrace.suggestedAction || '决策完成'}
              </span>
              <span className="text-[10px] text-gray-400">
                耗时 {simulationTrace.executionTimeMs}ms
              </span>
            </div>

            {simulationTrace.usage && (
              <span className="text-[10px] font-mono text-gray-400">
                Tokens: {simulationTrace.usage.inputTokens} in / {simulationTrace.usage.outputTokens} out
              </span>
            )}
          </div>

          {/* Reject / Review Reasons */}
          {simulationTrace.rejectReasons && simulationTrace.rejectReasons.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                拦截触发原因：
              </div>
              <ul className="text-[11px] text-rose-200/90 pl-3 list-disc space-y-0.5">
                {simulationTrace.rejectReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {simulationTrace.reviewReasons && simulationTrace.reviewReasons.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                送审复核原因：
              </div>
              <ul className="text-[11px] text-amber-200/90 pl-3 list-disc space-y-0.5">
                {simulationTrace.reviewReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Question Breakdown Bars */}
          {simulationTrace.answers && Object.keys(simulationTrace.answers).length > 0 && (
            <div className="pt-1.5 border-t border-[#23283B] space-y-2">
              <div className="text-[10px] font-semibold text-gray-400">问询判定明细：</div>
              <div className="space-y-1.5">
                {Object.entries(simulationTrace.answers).map(([qKey, qVal]: [string, any]) => (
                  <div key={qKey} className="p-2 rounded bg-[#171B2A] border border-[#23283B] text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-gray-300 font-semibold">{qKey}</span>
                      <span
                        className={clsx(
                          'text-[10px] font-mono px-1 rounded font-bold uppercase',
                          qVal.type === 'choice'
                            ? 'bg-purple-950 text-purple-300'
                            : qVal.type === 'score'
                            ? 'bg-blue-950 text-blue-300'
                            : 'bg-emerald-950 text-emerald-300'
                        )}
                      >
                        {qVal.type}
                      </span>
                    </div>

                    {qVal.type === 'choice' && (
                      <div className="flex items-center justify-between text-[11px] text-purple-300">
                        <span>命中选项: <strong>{qVal.choice}</strong></span>
                        {qVal.confidence !== undefined && (
                          <span className="text-[10px] text-gray-400 font-mono">
                            置信度: {(qVal.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    )}

                    {qVal.type === 'score' && (
                      <div className="flex items-center justify-between text-[11px] text-blue-300">
                        <span>评分档位: <strong>{qVal.score} 档</strong></span>
                        {qVal.confidence !== undefined && (
                          <span className="text-[10px] text-gray-400 font-mono">
                            置信度: {(qVal.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    )}

                    {qVal.type === 'noul' && (
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-gray-300">校准概率:</span>
                          <span
                            className={clsx(
                              'font-mono font-bold',
                              (qVal.noul ?? 0) >= 0.7
                                ? 'text-rose-400'
                                : (qVal.noul ?? 0) <= 0.3
                                ? 'text-emerald-400'
                                : 'text-amber-400'
                            )}
                          >
                            {((qVal.noul ?? 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={clsx(
                              'h-full transition-all duration-300',
                              (qVal.noul ?? 0) >= 0.7
                                ? 'bg-rose-500'
                                : (qVal.noul ?? 0) <= 0.3
                                ? 'bg-emerald-500'
                                : 'bg-amber-500'
                            )}
                            style={{ width: `${Math.max(4, (qVal.noul ?? 0) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw Response Accordion */}
          {simulationTrace.rawResponse && (
            <div className="pt-1 border-t border-[#23283B]">
              <button
                type="button"
                onClick={() => setShowRawResponse(!showRawResponse)}
                className="w-full flex items-center justify-between text-[10px] text-gray-400 hover:text-gray-200 py-1"
              >
                <span className="flex items-center gap-1 font-mono">
                  <Code2 className="w-3 h-3 text-primary" />
                  查看 API 原生返回报文 (Raw Response JSON)
                </span>
                {showRawResponse ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showRawResponse && (
                <div className="mt-1 relative bg-[#090C12] rounded border border-[#242A3D] p-2.5">
                  <button
                    type="button"
                    onClick={handleCopyRaw}
                    className="absolute right-2 top-2 px-1.5 py-0.5 rounded bg-[#1C2132] hover:bg-[#262C44] text-[10px] text-gray-300 flex items-center gap-1 font-mono"
                  >
                    {copiedRaw ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedRaw ? '已复制' : '复制 JSON'}
                  </button>
                  <pre className="font-mono text-[10px] leading-tight text-gray-300 overflow-x-auto max-h-48 whitespace-pre-wrap select-all pr-14">
                    {simulationTrace.rawResponse}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Trace Execution Logs */}
      <div className="flex-1 flex flex-col min-h-[140px] bg-[#0F1118] rounded-lg border border-[#282D3D] overflow-hidden">
        <div className="p-2.5 bg-[#151821] border-b border-[#282D3D] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-mono text-gray-300">{t.sandbox.executionTrace}</span>
          </div>
          {simulationTrace && (
            <span className="text-[10px] text-emerald-400 font-mono">
              已流经: {simulationTrace.visitedNodeIds.length} 个节点
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
                className={clsx(
                  'p-1.5 rounded border text-[11px] leading-relaxed',
                  log.type === 'decision'
                    ? 'bg-[#12141C] border-primary/30 text-gray-200'
                    : log.type === 'fallback'
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                    : log.type === 'action'
                    ? 'bg-sky-950/40 border-sky-500/40 text-sky-200 font-bold'
                    : 'bg-[#151821] border-[#282D3D] text-gray-400'
                )}
              >
                <span className="opacity-70 mr-1 font-bold">[{log.type}]</span>
                {log.message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
