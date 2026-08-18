import { createInterface } from "readline";

/**
 * Prompt for a line of input on the terminal. With `hidden: true` the typed
 * characters are masked (for passwords / passphrases).
 *
 * Only usable interactively: if stdin is not a TTY the caller should fall back
 * to an environment variable instead of calling this (it would otherwise hang).
 */
export function prompt(
  question: string,
  opts: { hidden?: boolean } = {}
): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  if (opts.hidden) {
    // Mask typed characters: write the prompt once, then nothing for input.
    const rlAny = rl as unknown as {
      output: NodeJS.WriteStream;
      _writeToOutput: (s: string) => void;
    };
    let shown = false;
    rlAny._writeToOutput = (str: string) => {
      if (!shown) {
        rlAny.output.write(question);
        shown = true;
      }
      // swallow echoed keystrokes
    };
  }

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      if (opts.hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

export function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY);
}
