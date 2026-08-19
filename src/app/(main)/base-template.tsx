import {
  CommonConnectionConfig,
  CommonConnectionConfigTemplate,
} from "@/components/connection-config-editor";
import { ReactElement } from "react";
import { SavedConnectionRawLocalStorage } from "../(theme)/connect/saved-connection-storage";

// Was the remote "source" shape; kept as a loose type for the optional
// remote conversion hooks (unused now that the cloud layer is removed).
type RemoteSourceInput = Record<string, unknown>;

export interface ConnectionTemplateList {
  template: CommonConnectionConfigTemplate;
  localFrom?: (value: SavedConnectionRawLocalStorage) => CommonConnectionConfig;
  localTo?: (value: CommonConnectionConfig) => SavedConnectionRawLocalStorage;

  /**
   * Convert the remote source config to common connecting config
   * @param value
   * @returns
   */
  remoteFrom?: (value: {
    source: RemoteSourceInput;
    name: string;
  }) => CommonConnectionConfig;

  /**
   * Convert the common connecting config to remote source config
   * @param value
   * @returns
   */
  remoteTo?: (value: CommonConnectionConfig) => {
    source: RemoteSourceInput;
    name: string;
  };
  instruction?: ReactElement;
}
