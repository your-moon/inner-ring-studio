import MassDropTableTab from "@/components/gui/tabs/mass-drop-table";
import { Layers2 } from "lucide-react";
import { createTabExtension } from "../extension-tab";

export const builtinMassDropTableTab = createTabExtension({
  name: "mass-drop-table",
  key: () => "",
  generate: () => ({
    title: "Mass Drop Tables",
    component: <MassDropTableTab />,
    icon: Layers2,
  }),
});
