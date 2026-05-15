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
