'use client';

import { useRef } from 'react';
import { MessageThread } from '@sherpa/ui';
import { EXAMPLE_PROMPTS, usePromptFlow } from '../../hooks/usePromptFlow';

/**
 * Legacy Sherpa command surface.
 *
 * As of the Glass Aurora migration this is a thin renderer over
 * {@link usePromptFlow} (the parse/safety/signing orchestration). The
 * behaviour is unchanged — Prompt.test.tsx is the contract that proves it
 * — only the logic moved out so the Glass home can render the same flow.
 */
type PromptProps = {
  connectionEpoch?: number;
  isConnected: boolean;
  userAddress?: `0x${string}`;
  disconnectedCopy?: string;
};

export function Prompt({
  connectionEpoch = 0,
  isConnected,
  userAddress,
  disconnectedCopy = 'Connect wallet to start',
}: PromptProps) {
  const { input, setInput, busy, submitParse, confirm, cancel, chat } =
    usePromptFlow({ connectionEpoch, isConnected, userAddress });
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <section className="flex min-h-0 w-full flex-1 flex-col gap-3">
      <MessageThread
        isLoading={chat.isLoading}
        messages={chat.messages}
        onCancelConfirmation={cancel}
        onConfirmMessage={(messageId) => void confirm(messageId)}
        onLoadOlder={() => void chat.loadOlder()}
        showLoadOlder={chat.showLoadOlder}
      />

      <div className="flex flex-wrap gap-2">
        {EXAMPLE_PROMPTS.map((example) => (
          <button
            className="rounded-full border border-border bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground transition hover:border-base-blue/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isConnected || busy}
            key={example}
            onClick={() => {
              setInput(example);
              inputRef.current?.focus();
            }}
            type="button"
          >
            / {example}
          </button>
        ))}
      </div>

      <div className="flex items-stretch gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submitParse();
          }}
          placeholder={isConnected ? 'send 5 usdc to vitalik.eth' : disconnectedCopy}
          className="base-input min-h-11 w-full text-base disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Sherpa prompt"
          disabled={!isConnected || busy}
          title={!isConnected ? disconnectedCopy : undefined}
        />
        <button
          type="button"
          className="base-btn min-h-11 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!isConnected || busy}
          onClick={submitParse}
        >
          Preview
        </button>
      </div>
    </section>
  );
}
