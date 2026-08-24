"use client";

import {
  Checkbox,
  Field,
  FieldLabel,
  NumberField,
  PasswordField,
  RadioGroup,
  RadioGroupItem,
  SearchField,
  StatusDot,
  Switch,
  TextField,
  TextareaField,
  type FieldSize,
} from "@/components/orbit";
import type { ReactNode } from "react";
import { useState } from "react";

function CatalogSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="border-border-subtle border-t py-9">
      <div className="mb-5">
        <h2 className="text-heading-small font-semibold tracking-[var(--tracking-heading)]">
          {title}
        </h2>
        <p className="text-ui-small text-content-tertiary mt-1 max-w-2xl">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-border-default bg-surface-panel flex flex-col gap-3 rounded-[var(--radius-panel)] border p-5">
      <div className="text-ui-caption text-content-tertiary">{label}</div>
      {children}
    </div>
  );
}

export default function FormStorybook() {
  const [checks, setChecks] = useState({ ssl: true, pool: false });
  const [env, setEnv] = useState("staging");
  const [live, setLive] = useState(true);
  const [readonly, setReadonly] = useState(false);
  const allChecked = checks.ssl && checks.pool;
  const someChecked = checks.ssl || checks.pool;

  return (
    <main className="mx-auto w-full max-w-[1180px] px-2 pt-8 pb-24 sm:px-6">
      <header className="border-border-subtle flex flex-col justify-between gap-5 border-b pb-8 md:flex-row md:items-end">
        <div>
          <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">
            PMSQL UI / 03
          </div>
          <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
            Form controls
          </h1>
          <p className="text-body text-content-secondary mt-2 max-w-2xl">
            Text entry, selection, and toggles on one control shell—label,
            help, and validation wired for assistive technology by the Field.
          </p>
        </div>
        <div className="text-ui-small text-content-secondary flex items-center gap-2">
          <StatusDot status="live" />8 controls · ready
        </div>
      </header>

      <CatalogSection
        title="Field anatomy"
        description="Field ties a label, description, and error to its control: the label targets the input, help and error are announced through aria-describedby, and an invalid control sets aria-invalid."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="border-border-default bg-surface-panel rounded-[var(--radius-panel)] border p-5">
            <Field
              label="Connection name"
              description="Shown in the sidebar and command palette."
              required
            >
              <TextField placeholder="Production replica" />
            </Field>
          </div>
          <div className="border-border-default bg-surface-panel rounded-[var(--radius-panel)] border p-5">
            <Field
              label="Port"
              error="Port must be between 1 and 65535."
              required
            >
              <TextField defaultValue="70000" invalid />
            </Field>
          </div>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Text inputs"
        description="One shell, four presets. Search, password, and number add only the affordance their job needs."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card label="TextField">
            <TextField placeholder="localhost" />
          </Card>
          <Card label="SearchField">
            <SearchField placeholder="Search tables" />
          </Card>
          <Card label="PasswordField">
            <PasswordField defaultValue="hunter2" />
          </Card>
          <Card label="NumberField">
            <NumberField defaultValue={5432} min={1} max={65535} />
          </Card>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Sizes and states"
        description="The 28/32/36px ladder matches the button family. Disabled and invalid are first-class."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card label="Size ladder">
            <div className="flex flex-col gap-2">
              {(["sm", "base", "lg"] as FieldSize[]).map((size) => (
                <TextField key={size} size={size} placeholder={size} />
              ))}
            </div>
          </Card>
          <Card label="Disabled">
            <TextField defaultValue="read-only-connection" disabled />
          </Card>
          <Card label="Textarea">
            <TextareaField placeholder="-- notes about this connection" />
          </Card>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Selection"
        description="Checkbox for many independent choices and indeterminate parents; radio for one of a set."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Card label="Checkbox — with indeterminate parent">
            <div className="flex flex-col gap-2.5">
              <label className="flex items-center gap-2 text-ui-default">
                <Checkbox
                  checked={
                    allChecked ? true : someChecked ? "indeterminate" : false
                  }
                  onCheckedChange={(v) =>
                    setChecks({ ssl: v === true, pool: v === true })
                  }
                />
                Connection options
              </label>
              <div className="ml-6 flex flex-col gap-2.5">
                <label className="flex items-center gap-2 text-ui-default">
                  <Checkbox
                    checked={checks.ssl}
                    onCheckedChange={(v) =>
                      setChecks((c) => ({ ...c, ssl: v === true }))
                    }
                  />
                  Require SSL
                </label>
                <label className="flex items-center gap-2 text-ui-default">
                  <Checkbox
                    checked={checks.pool}
                    onCheckedChange={(v) =>
                      setChecks((c) => ({ ...c, pool: v === true }))
                    }
                  />
                  Connection pooling
                </label>
              </div>
            </div>
          </Card>
          <Card label="Radio group">
            <Field label="Default environment">
              <RadioGroup value={env} onValueChange={setEnv}>
                {["development", "staging", "production"].map((value) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 text-ui-default capitalize"
                  >
                    <RadioGroupItem value={value} />
                    {value}
                  </label>
                ))}
              </RadioGroup>
            </Field>
          </Card>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Switches"
        description="A switch takes effect immediately; a checkbox waits for submit. Never use color alone to signal state."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Card label="Immediate settings">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <FieldLabel>Live query timer</FieldLabel>
                <Switch
                  aria-label="Live query timer"
                  checked={live}
                  onCheckedChange={setLive}
                />
              </div>
              <div className="flex items-center justify-between">
                <FieldLabel>Read-only mode</FieldLabel>
                <Switch
                  aria-label="Read-only mode"
                  checked={readonly}
                  onCheckedChange={setReadonly}
                />
              </div>
              <div className="flex items-center justify-between opacity-50">
                <FieldLabel>Auto-commit (locked)</FieldLabel>
                <Switch aria-label="Auto-commit" checked disabled />
              </div>
            </div>
          </Card>
        </div>
      </CatalogSection>
    </main>
  );
}
