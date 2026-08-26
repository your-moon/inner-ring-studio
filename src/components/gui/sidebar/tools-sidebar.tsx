"use client";
import { scc } from "@/core/command";
import ListButtonItem from "../list-button-item";
import { Layers2, Network } from "lucide-react";

export default function SettingSidebar() {
  return (
    <div className="flex flex-col grow p-2">
      <ListButtonItem
        text="Relational Diagram"
        onClick={() => {
          scc.tabs.openBuiltinERD({});
        }}
        icon={Network}
      />
      <ListButtonItem
        text="Drop & Empty Multiple Tables"
        onClick={() => {
          scc.tabs.openBuiltinMassDropTable({});
        }}
        icon={Layers2}
      />
    </div>
  );
}
