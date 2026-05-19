/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export type PollParams = {
  question: string;
  options: string[];
  duration?: number;
  channelId?: string;
};

export function buildPollCast(params: PollParams): { text: string; embeds: string[] } {
  let text = params.question;
  if (params.options.length > 0) {
    text += '\n\n' + params.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
  }
  return { text, embeds: [] };
}
