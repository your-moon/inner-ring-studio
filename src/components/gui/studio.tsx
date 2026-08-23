"use client";
import MainScreen from "@/components/gui/main-connection";
import {
  StudioContextProps,
  StudioContextProvider,
} from "@/context/driver-provider";
import { StudioExtensionManager } from "@/core/extension-manager";
import { BeforeQueryPipeline } from "@/core/query-pipeline";
import AgentDriverList from "@/drivers/agent/list";
import type { BaseDriver } from "@/drivers/base-driver";
import { SavedDocDriver } from "@/drivers/saved-doc/saved-doc-driver";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { anyStatementWrites } from "@/lib/sql/write-detect";
import EnvBadge from "../orbit/env-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { CommonDialogProvider } from "../common-dialog";
import { FullEditorProvider } from "./providers/full-editor-provider";

interface StudioProps {
  driver: BaseDriver;
  extensions?: StudioExtensionManager;
  agentDriver?: AgentDriverList;
  docDriver?: SavedDocDriver;
  name: string;
  color: string;
  /** `production` arms the write-confirmation gate and the prod badge. */
  environment?: "production" | "staging";
  onBack?: () => void;
  theme?: "dark" | "light";
  containerClassName?: string;
}

export function Studio({
  driver,
  name,
  color,
  environment,
  onBack,
  extensions,
  containerClassName,
  docDriver,
  agentDriver,
}: Readonly<StudioProps>) {
  const extensionRef = useRef<StudioExtensionManager | undefined | null>(
    extensions
  );

  useEffect(() => {
    extensionRef.current = extensions;
  }, [extensions]);

  // ── Production write gate ─────────────────────────────────────────────
  // Every statement funnels through the query proxy below, so this is the one
  // choke point: on a production-marked connection, any write statement pauses
  // on a confirmation dialog before it reaches the database. Refs keep the
  // proxy identity stable.
  const [pendingWrite, setPendingWrite] = useState<{
    statements: string[];
    resolve: () => void;
    reject: (e: Error) => void;
  } | null>(null);
  const environmentRef = useRef(environment);
  environmentRef.current = environment;

  const gateWrite = useCallback((statements: string[]): Promise<void> => {
    if (environmentRef.current !== "production") return Promise.resolve();
    if (!anyStatementWrites(statements)) return Promise.resolve();
    return new Promise<void>((resolve, reject) =>
      setPendingWrite({ statements, resolve, reject })
    );
  }, []);
  const gateWriteRef = useRef(gateWrite);
  gateWriteRef.current = gateWrite;

  const proxyDriver = useMemo(() => {
    return new Proxy(driver, {
      get(...arg) {
        const [target, property] = arg;

        if (property === "query") {
          return async (statement: string) => {
            const beforePipeline = new BeforeQueryPipeline("query", [
              statement,
            ]);

            if (extensionRef.current) {
              await extensionRef.current.beforeQuery(beforePipeline);
            }

            await gateWriteRef.current(beforePipeline.getStatments());
            return await target.query(beforePipeline.getStatments()[0]);
          };
        } else if (property === "transaction" || property === "batch") {
          return async (statements: string[]) => {
            const beforePipeline = new BeforeQueryPipeline(property, [
              ...statements,
            ]);

            if (extensionRef.current) {
              await extensionRef.current.beforeQuery(beforePipeline);
            }

            await gateWriteRef.current(beforePipeline.getStatments());
            return await target.transaction(beforePipeline.getStatments());
          };
        }

        return Reflect.get(...arg);
      },
    });
  }, [driver, extensionRef]);

  const finalExtensionManager = useMemo(() => {
    return extensions ?? new StudioExtensionManager([]);
  }, [extensions]);

  useEffect(() => {
    return () => finalExtensionManager.cleanup();
  }, [finalExtensionManager]);

  const studioContextValue: StudioContextProps = useMemo(() => {
    return {
      name,
      color,
      environment,
      onBack,
      extensions: finalExtensionManager,
      containerClassName,
      agentDriver,
      databaseDriver: proxyDriver,
      docDriver,
    };
  }, [
    name,
    color,
    environment,
    onBack,
    finalExtensionManager,
    containerClassName,
    agentDriver,
    proxyDriver,
    docDriver,
  ]);

  return (
    <StudioContextProvider value={studioContextValue}>
      <CommonDialogProvider>
        <FullEditorProvider>
          <MainScreen />
          {pendingWrite && (
            <AlertDialog open>
              <AlertDialogContent>
                <AlertDialogTitle className="flex items-center gap-2">
                  Run write on <EnvBadge environment="production" /> {name}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This statement changes data on a connection marked as
                  production.
                </AlertDialogDescription>
                <pre className="max-h-40 overflow-auto rounded-md border border-border bg-secondary/40 p-3 font-mono text-[12px] whitespace-pre-wrap text-foreground">
                  {pendingWrite.statements.join(";\n")}
                </pre>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => {
                      pendingWrite.reject(
                        new Error("Cancelled: production write not confirmed.")
                      );
                      setPendingWrite(null);
                    }}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-amber-600 text-white hover:bg-amber-700"
                    onClick={() => {
                      pendingWrite.resolve();
                      setPendingWrite(null);
                    }}
                  >
                    Run on production
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </FullEditorProvider>
      </CommonDialogProvider>
    </StudioContextProvider>
  );
}
