import { localSettingDialog } from "@/app/(main)/local-setting-dialog";
import { StudioExtension } from "@/core/extension-base";
import { StudioExtensionContext } from "@/core/extension-manager";
import { Wand2 } from "lucide-react";

export default class LocalSettingSidebar extends StudioExtension {
  extensionName = "local-setting-sidebar";

  init(studio: StudioExtensionContext): void {
    studio.registerSidebar({
      key: "local-setting-sidebar",
      name: "Local Settings",
      icon: <Wand2 size={24} />,
      onClick: () => {
        localSettingDialog.show({}).then().catch();
      },
    });
  }
}
