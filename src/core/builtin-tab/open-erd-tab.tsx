import RelationalDiagramTab from "@/components/gui/tabs/relational-diagram-tab";
import { Network } from "lucide-react";
import { createTabExtension } from "../extension-tab";

export const builtinOpenERDTab = createTabExtension({
  name: "erd",
  key: () => "",
  generate: () => ({
    title: "Relational Diagram",
    component: <RelationalDiagramTab />,
    icon: Network,
  }),
});
