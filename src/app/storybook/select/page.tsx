"use client";

import Block from "@/components/orbit/block";
import Inset from "@/components/orbit/inset";
import Section from "@/components/orbit/section";
import { Select } from "@/components/orbit/select";
import {
  Select as CrispSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

const dbs = [
  { value: "SQLite", label: "SQLite" },
  { value: "MySQL", label: "MySQL" },
  { value: "Postgres", label: "Postgres" },
  { value: "LibSQL", label: "LibSQL" },
  { value: "MongoDB", label: "MongoDB" },
  { value: "Clickhouse", label: "Clickhouse" },
  { value: "BigQuery", label: "BigQuery" },
];

export default function SelectStorybook() {
  const [value, setValue] = useState(dbs[0].value);

  return (
    <Section>
      <Inset>
        <Block title="Select">
          <Select
            options={dbs}
            setValue={(value) => setValue(value)}
            value={value}
            size="sm"
          />
          <Select
            options={dbs}
            setValue={(value) => setValue(value)}
            value={value}
            size="base"
          />
          <Select
            options={dbs}
            setValue={(value) => setValue(value)}
            value={value}
            size="lg"
          />
        </Block>

        <Block title="Crisp select (Radix) — trigger is the crisp input box, menu is the crisp menu recipe">
          <div className="max-w-[240px]">
            <CrispSelect value={value} onValueChange={setValue}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a database" />
              </SelectTrigger>
              <SelectContent>
                {dbs.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </CrispSelect>
          </div>
        </Block>

        <Block title="Crisp native select (.irs-select) — used by schedules, workspace, import pickers">
          <select
            className="irs-select max-w-[240px]"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          >
            {dbs.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </Block>
      </Inset>
    </Section>
  );
}
