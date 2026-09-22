import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Session } from '../types';
import {
  Bot,
  Send,
  Sparkles,
  Zap,
  Cpu,
  BrainCircuit,
  Copy,
  Check,
  RotateCcw,
  User,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface AiChatViewProps {
  session: Session;
}

export const AiChatView: React.FC<AiChatViewProps> = ({ session }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      text:
        `Hello ${session.name}! I am your **Hybrid Civil AI Consultant & Financial Estimator**.\n\n` +
        `I can assist you with:\n` +
        `• **Structural & Civil Calculations**: Beam/column sizing, rebar estimations, soil test evaluation\n` +
        `• **Project Estimations**: BOQ drafting, service pricing, and advance payment milestones\n` +
        `• **Associate Network Rules**: Deep-dive simulations of our 90/5/5 profit-sharing model\n` +
        `• **Client Proposals**: Drafting structural consultancy contracts and geotechnical scope documents\n\n` +
        `How can I assist your engineering project today?`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      model: 'gemini-3.1-flash-lite',
    },
  ]);

  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.1-flash-lite');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const starterPrompts = [
    'Explain the 90/5/5 profit distribution with a ৳250,000 example',
    'Calculate structural design service pricing for a G+7 building',
    'What pile foundation depth is recommended for SPT N-value of 8?',
    'Draft a formal proposal for a commercial geotechnical soil investigation',
  ];

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Build conversation payload
      const payloadMessages = newHistory.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadMessages,
          model: selectedModel,
          systemInstruction:
            'You are the expert Civil Engineering Consultant, Financial Estimator, and Project Coordinator for Hybrid Civil Associate Network. ' +
            'Provide mathematically rigorous structural engineering recommendations, BOQ analysis, soil mechanics guidelines, and associate profit calculations. Format outputs clearly with bold headers and bullet points.',
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to get response from Gemini.');
      }

      const botMessage: ChatMessage = {
        id: 'msg-' + Date.now(),
        role: 'model',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        model: data.model || selectedModel,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.message || 'Error communicating with the Gemini model. Please check network connectivity or API key.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (confirm('Clear the current conversation thread?')) {
      setMessages([
        {
          id: 'welcome-msg-reloaded',
          role: 'model',
          text: `Thread reset. Ready to assist you, ${session.name}!`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          model: selectedModel,
        },
      ]);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-130px)] pb-18 md:pb-2">
      {/* Top Controls & Model Selector Bar */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs mb-3 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#f28c28] flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-[#10243a] flex items-center gap-1.5">
              <span>Hybrid Civil AI Assistant</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                Multi-Turn
              </span>
            </h2>
            <p className="text-[10.5px] text-slate-500">
              Civil engineering advisor & project profit calculator
            </p>
          </div>
        </div>

        {/* Model Selector Affordance */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
              title="Fastest responses, lowest latency"
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                selectedModel === 'gemini-3.1-flash-lite'
                  ? 'bg-white text-orange-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-500" />
              <span>Fast (Flash-Lite)</span>
            </button>

            <button
              onClick={() => setSelectedModel('gemini-3.5-flash')}
              title="General tasks and project management"
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                selectedModel === 'gemini-3.5-flash'
                  ? 'bg-white text-blue-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Cpu className="w-3 h-3 text-blue-500" />
              <span>General (3.5 Flash)</span>
            </button>

            <button
              onClick={() => setSelectedModel('gemini-3.1-pro-preview')}
              title="Complex structural analysis & heavy calculations"
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                selectedModel === 'gemini-3.1-pro-preview'
                  ? 'bg-white text-purple-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BrainCircuit className="w-3 h-3 text-purple-500" />
              <span>Complex (3.1 Pro)</span>
            </button>
          </div>

          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Reset thread"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Error Alert if any */}
      {errorMessage && (
        <div className="mb-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 flex-shrink-0">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Scrollable Message Thread */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 p-3 sm:p-4 overflow-y-auto space-y-3 shadow-xs">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 ${
                isUser ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-[#10243a] text-white shadow-xs'
                    : 'bg-[#f28c28] text-white shadow-xs'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs relative group ${
                  isUser
                    ? 'bg-[#10243a] text-white rounded-tr-xs'
                    : 'bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-xs'
                }`}
              >
                {/* Message Header & Meta */}
                <div
                  className={`flex items-center justify-between gap-3 text-[10px] mb-1 font-medium ${
                    isUser ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  <span className="font-semibold">
                    {isUser ? session.name : 'Civil Consultant AI'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {m.model && !isUser && (
                      <span className="px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700 text-[9px] font-semibold">
                        {m.model.replace('gemini-', '')}
                      </span>
                    )}
                    <span>{m.timestamp}</span>
                    <button
                      onClick={() => handleCopy(m.id, m.text)}
                      className="opacity-0 group-hover:opacity-100 hover:text-orange-500 transition-opacity p-0.5"
                      title="Copy message"
                    >
                      {copiedId === m.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Message Content with simple formatting */}
                <div className="whitespace-pre-wrap font-sans selection:bg-orange-500/30">
                  {m.text}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#f28c28] text-white flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl rounded-tl-xs text-xs text-slate-600 flex items-center gap-2 shadow-2xs">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce [animation-delay:0.4s]" />
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Analyzing structural scope with {selectedModel}...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Starter Prompts */}
      <div className="mt-2 flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar flex-shrink-0">
        {starterPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap transition-colors flex items-center gap-1 shadow-2xs cursor-pointer flex-shrink-0"
          >
            <Sparkles className="w-3 h-3 text-orange-500" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="mt-2 bg-white rounded-xl p-2 border border-slate-200 shadow-xs flex items-center gap-2 flex-shrink-0">
        <textarea
          id="chatInputText"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask about structural designs, BOQ costs, 90/5/5 profit calculations, or client proposals..."
          rows={1}
          className="flex-1 text-xs px-3 py-1.5 resize-none focus:outline-none max-h-24 bg-transparent text-slate-800"
        />

        <button
          id="sendChatBtn"
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          className="p-2 rounded-lg bg-[#f28c28] hover:bg-[#e07f20] disabled:bg-slate-200 disabled:text-slate-400 text-white transition-all active:scale-95 cursor-pointer shadow-xs"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
