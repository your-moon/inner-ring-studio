import { WindowTabItemProps } from "@/components/gui/windows-tab";
import { CommunicationChannel } from "./channel";

interface TabExtensionConfig<T> {
  name: string;
  key: (options: T) => string;
  generate: (options: T) => Omit<Omit<WindowTabItemProps, "key">, "identifier">;
}

interface TabExtensionCommand<T> {
  open: (options: T) => void;
  generate: (options: T) => WindowTabItemProps;
  replace: (options: T) => void;
  close: (options: T) => void;
}

export const tabOpenChannel = new CommunicationChannel<WindowTabItemProps>();
export const tabReplaceChannel = new CommunicationChannel<WindowTabItemProps>();
export const tabCloseChannel = new CommunicationChannel<string[]>();

export function createTabExtension<T>(
  config: TabExtensionConfig<T>
): TabExtensionCommand<T> {
    const build = (options: T): WindowTabItemProps => {
      const key = [config.name, config.key(options)].filter(Boolean).join("-");
      const generated = config.generate(options);
      return {
        ...generated,
        key,
        identifier: key,
        type: config.name,
        // Serializable snapshot for session restore. `options` is what the
        // opener consumed; `key`/`title` preserve the tab's identity so a
        // restored query tab reconnects its SQL draft (keyed by title).
        restore: {
          type: config.name,
          key,
          title: generated.title,
          options,
        },
      };
    };

  return Object.freeze({
    generate: (options: T) => build(options),

    replace(options: T) {
      tabReplaceChannel.send(build(options));
    },

    open(options: T) {
      tabOpenChannel.send(build(options));
    },

    close(options: T) {
      const key = [config.name, config.key(options)].filter(Boolean).join("-");
      // Send directly on the channel (rather than via scc.tabs.close) so this
      // module doesn't import ./command — that edge closes a require cycle
      // (command → openers → extension-tab) and triggers a TDZ at load.
      tabCloseChannel.send([key]);
    },
  });
}
