import { PromptSelectedFragment } from "@/components/editor/prompt-plugin";
import SqlEditor from "@/components/gui/sql-editor";
import OpacityLoading from "@/components/gui/loading-opacity";
import { addHistory } from "@/lib/query-history";
import { getSingleTableName } from "@/lib/sql/single-table-name";
import { usePathname } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TAB_PREFIX_SAVED_QUERY } from "@/const";
import { useStudioContext } from "@/context/driver-provider";
import { useSchema } from "@/context/schema-provider";
import {
  SavedDocData,
  SavedDocInput,
} from "@/drivers/saved-doc/saved-doc-driver";
import {
  discoverPlaceholders,
  prepareStatements,
  sqlAltersSchema,
} from "@/lib/query-plan";
import EmptyState from "@/components/orbit/empty-state";
import Kbd from "@/components/ui/kbd";
import { KEY_BINDING } from "@/lib/key-matcher";
import {
  multipleQuery,
  MultipleQueryProgress,
  MultipleQueryResult,
} from "@/lib/sql/multiple-query";
import { sendAnalyticEvents } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import { CaretDown } from "@phosphor-icons/react";
import { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import {
  LucideGrid,
  LucideMessageSquareWarning,
  LucideHistory,
  LucidePlay,
  LucideWrapText,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { format } from "sql-formatter";
import { isExplainQueryPlan } from "../query-explanation";
import QueryProgressLog from "../query-progress-log";
import SaveDocButton from "../save-doc-button";
import {
  resolveToNearestStatement,
  splitSqlQuery,
} from "../sql-editor/statement-highlight";
import ExplainResultTab from "../tabs-result/explain-result-tab";
import QueryResult from "../tabs-result/query-result-tab";
import WindowTabs, {
  useCurrentTab,
  useTabsContext,
  WindowTabItemProps,
} from "../windows-tab";
import { QueryPlaceholder } from "./query-placeholder";
import QueryHistoryPalette from "./query-history-palette";

interface QueryWindowProps {
  initialCode?: string;
  initialName: string;
  initialSavedKey?: string;
  initialNamespace?: string;
}

export default function QueryWindow({
  initialCode,
  initialName,
  initialSavedKey,
  initialNamespace,
}: QueryWindowProps) {
  const { databaseDriver, docDriver, agentDriver } = useStudioContext();
  const { refresh: refreshSchema, autoCompleteSchema } = useSchema();
  const pathname = usePathname();
  // Auto-persist unsaved query text across reloads/exits, scoped per connection
  // (pathname carries the connection id) and per tab.
  const persistKey = `pmsql.query:${pathname}:${initialSavedKey ?? initialName}`;
  const [code, setCode] = useState(() => {
    if (typeof window !== "undefined" && initialCode === undefined) {
      const saved = window.localStorage.getItem(persistKey);
      if (saved !== null) return saved;
    }
    return initialCode ?? "";
  });
  const [isRunning, setIsRunning] = useState(false);
  // Live elapsed time while a query runs — latency is a feature, show it.
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [runElapsedMs, setRunElapsedMs] = useState(0);
  useEffect(() => {
    if (runStartedAt === null) return;
    const id = setInterval(() => setRunElapsedMs(Date.now() - runStartedAt), 100);
    return () => clearInterval(id);
  }, [runStartedAt]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { isActiveTab } = useCurrentTab();
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  // ⌘⇧H / Ctrl+Shift+H opens the query-history quick-open palette. Guarded by
  // isActiveTab so only the visible query tab responds (all tabs stay mounted).
  useEffect(() => {
    if (!isActiveTab) return;
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "h"
      ) {
        e.preventDefault();
        setHistoryOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isActiveTab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = setTimeout(() => {
      try {
        window.localStorage.setItem(persistKey, code);
      } catch {
        /* ignore quota errors */
      }
    }, 300);
    return () => clearTimeout(id);
  }, [code, persistKey]);

  const [fontSize, setFontSize] = useState(0.875);
  // Soft-wrap long lines in the editor. Global editor preference, persisted.
  const [lineWrap, setLineWrap] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("pmsql.editor.lineWrap") === "1";
  });
  const toggleLineWrap = useCallback(() => {
    setLineWrap((v) => {
      const next = !v;
      try {
        window.localStorage.setItem("pmsql.editor.lineWrap", next ? "1" : "0");
      } catch {
        /* ignore quota errors */
      }
      return next;
    });
  }, []);
  const [lineNumber, setLineNumber] = useState(0);
  const [columnNumber, setColumnNumber] = useState(0);

  const [queryTabIndex, setQueryTabIndex] = useState(0);
  const [progress, setProgress] = useState<MultipleQueryProgress>();
  const [data, setData] = useState<MultipleQueryResult[]>();
  const [name, setName] = useState(initialName);
  const { changeCurrentTab } = useTabsContext();

  // The saved-doc namespace this query belongs to; undefined = unsaved. Unsaved
  // is represented as absence, never as a placeholder label — a user's real
  // namespace could be named anything.
  const [namespaceName, setNamespaceName] = useState<string | undefined>(
    initialNamespace
  );
  const [savedKey, setSavedKey] = useState<string | undefined>(initialSavedKey);
  const [placeholders, setPlaceholders] = useState<Record<string, string>>({});
  const { schema } = useSchema();

  useEffect(() => {
    const timer = setTimeout(() => {
      setPlaceholders((prev) => {
        const next: Record<string, string> = {};
        for (const name of discoverPlaceholders(
          code,
          databaseDriver.getFlags().dialect
        )) {
          next[name] = prev[name] ?? "";
        }
        return next;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [code, databaseDriver]);

  const onFormatClicked = () => {
    try {
      setCode(
        format(code, {
          language: "sqlite",
          tabWidth: 2,
        })
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onRunClicked = (all = false, explained = false) => {
    const editorState = editorRef.current?.view?.state;
    if (!editorState) return;

    // Pick the statements to run from the editor (CodeMirror-coupled).
    let statements: string[];
    if (all) {
      statements = splitSqlQuery(editorState).map((q) => q.text);
    } else {
      const segment = resolveToNearestStatement(editorState);
      if (!segment) return;
      const statement = editorState.doc.sliceString(segment.from, segment.to);
      statements = statement ? [statement] : [];
    }
    if (statements.length === 0) return;

    // Prepare (explain-prefix + placeholder substitution). On failure, surface
    // it and stop before any loading state is set.
    const prepared = prepareStatements(statements, {
      dialect: databaseDriver.getFlags().dialect,
      explained,
      placeholders,
    });
    if (!prepared.ok) {
      if (prepared.analytics) sendAnalyticEvents(prepared.analytics);
      toast.error(prepared.message);
      return;
    }

    // Record the pre-substitution statements (placeholder values never enter
    // history), then run the substituted ones.
    for (const stmt of prepared.history) addHistory(pathname, stmt);

    // Keep the previous result visible while the new query runs; only replace
    // it once the new result is ready (a loading overlay shows meanwhile).
    setProgress(undefined);
    setQueryTabIndex(0);
    setIsRunning(true);
    setRunStartedAt(Date.now());
    setRunElapsedMs(0);

    multipleQuery(
      databaseDriver,
      prepared.run,
      (currentProgress) => setProgress(currentProgress),
      { paginatePageSize: 200 }
    )
      .then(({ result: completeQueryResult, logs: completeLogs }) => {
        setData(completeQueryResult);
        if (
          sqlAltersSchema(completeLogs, {
            supportUseStatement: databaseDriver.getFlags().supportUseStatement,
          })
        ) {
          refreshSchema();
        }
      })
      .catch((e) => toast.error((e as Error).message))
      .finally(() => {
        setIsRunning(false);
        setRunStartedAt(null);
      });
  };

  const onSaveComplete = useCallback(
    (doc: SavedDocData) => {
      setNamespaceName(doc.namespace.name);
      setSavedKey(doc.id);
      changeCurrentTab({ identifier: TAB_PREFIX_SAVED_QUERY + doc.id });
    },
    [changeCurrentTab]
  );

  const onPrepareSaveContent = useCallback((): SavedDocInput => {
    return { content: code, name };
  }, [code, name]);

  const windowTab = useMemo(() => {
    const queryTabs: WindowTabItemProps[] = [];

    for (const queryResult of data ?? []) {
      if (
        isExplainQueryPlan(queryResult.sql, databaseDriver.getFlags().dialect)
      ) {
        queryTabs.push({
          component: <ExplainResultTab data={queryResult.result} />,
          key: "explain_" + queryResult.order,
          identifier: "explain_" + queryResult.order,
          title: "Explain (Visual)",
          icon: LucideMessageSquareWarning,
        });
      }

      queryTabs.push({
        component: <QueryResult result={queryResult} key={queryResult.order} />,
        key: "query_" + queryResult.order,
        identifier: "query_" + queryResult.order,
        title:
          `${getSingleTableName(queryResult.sql) ?? "Query " + (queryResult.order + 1)}` +
          ` (${queryResult.result.rows.length}x${queryResult.result.headers.length})`,
        icon: LucideGrid,
      });
    }

    if (progress) {
      queryTabs.push({
        key: "summary",
        identifier: "summary",
        title: "Summary",
        icon: LucideMessageSquareWarning,
        component: (
          <div className="h-full w-full overflow-x-hidden overflow-y-auto">
            <QueryProgressLog progress={progress} />
          </div>
        ),
      });
    }

    // Nothing has run yet. One quiet line — the editor's own placeholder
    // already teaches the run shortcut; repeating it here would say the same
    // thing twice on one screen.
    if (queryTabs.length === 0) {
      return (
        <EmptyState>
          Results show up here. Run with{" "}
          <Kbd>{KEY_BINDING.run.toString()}</Kbd>, or pick a table from the
          sidebar.
        </EmptyState>
      );
    }

    return (
      <WindowTabs
        key="main-window-tab"
        onSelectChange={setQueryTabIndex}
        onTabsChange={() => {}}
        hideCloseButton
        selected={queryTabIndex}
        tabs={queryTabs}
      />
    );
  }, [progress, queryTabIndex, data, databaseDriver]);

  const onCursorChange = useCallback(
    (_: unknown, line: number, col: number) => {
      setLineNumber(line);
      setColumnNumber(col);
    },
    []
  );

  const onPrompt = useCallback(
    async (promptQuery: string, option: PromptSelectedFragment) => {
      if (!agentDriver) return "";

      const agentResponse = await agentDriver.run(
        option.selectedModel ?? "gemma-7b-it",
        promptQuery,
        option.sessionId,
        {
          selected: option?.text ?? "",
          schema: schema,
        }
      );

      return agentResponse;
    },
    [agentDriver, schema]
  );

  return (
    <ResizablePanelGroup direction="vertical" autoSaveId="pmsql.layout.query">
      <ResizablePanel id="editor" order={1} style={{ position: "relative" }}>
        <div className="absolute top-0 right-0 bottom-0 left-0 flex flex-col">
          <div className="flex border-b border-border bg-background py-3 pr-1 pl-3">
            {namespaceName && (
              <div className="flex shrink-0 items-center p-1 text-sm text-muted-foreground">
                {namespaceName}&nbsp;/
              </div>
            )}
            <div className="relative inline-block">
              <span className="border-background inline-block min-w-[175px] border p-1 text-sm font-semibold opacity-0 outline-hidden">
                &nbsp;{name}
              </span>
              <input
                onBlur={(e) => {
                  changeCurrentTab({
                    title: e.currentTarget.value || "Unnamed Query",
                  });
                }}
                placeholder="Please name your query"
                spellCheck="false"
                className="focus:border-secondary-foreground absolute top-0 right-0 bottom-0 left-0 rounded bg-transparent p-1 text-sm font-semibold outline-hidden"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
              />
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              {isRunning && (
                <span className="px-1 text-[12px] text-muted-foreground tabular-nums">
                  Running · {(runElapsedMs / 1000).toFixed(1)}s
                </span>
              )}
              {docDriver && (
                <SaveDocButton
                  onComplete={onSaveComplete}
                  onPrepareContent={onPrepareSaveContent}
                  docId={savedKey}
                />
              )}

              <button
                className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}
                title="Query history (⌘⇧H)"
                onClick={() => setHistoryOpen(true)}
              >
                <LucideHistory className="mr-2 h-4 w-4" />
                History
              </button>

              <QueryHistoryPalette
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                scope={pathname}
                onPick={(sql) => {
                  const view = editorRef.current?.view;
                  if (view) {
                    // Append below the current SQL (blank line between) and put
                    // the cursor at the end, in ONE transaction — text + caret
                    // land together, so there's no reconcile race. onChange
                    // syncs `code` state. Trailing whitespace is collapsed.
                    const base = view.state.doc.toString().replace(/\s+$/, "");
                    const next = base ? `${base}\n\n${sql}` : sql;
                    view.dispatch({
                      changes: { from: 0, to: view.state.doc.length, insert: next },
                      selection: { anchor: next.length },
                      scrollIntoView: true,
                    });
                    view.focus();
                  } else {
                    setCode((prev) => {
                      const base = prev.replace(/\s+$/, "");
                      return base ? `${base}\n\n${sql}` : sql;
                    });
                  }
                }}
              />

              <div className="flex">
                <button
                  onClick={() => onRunClicked()}
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "rounded-r-none"
                  )}
                >
                  <LucidePlay className="mr-2 h-4 w-4" />
                  Run
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        buttonVariants({ size: "sm" }),
                        "rounded-l-none border-l"
                      )}
                    >
                      <CaretDown size={12} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => onRunClicked()}>
                      Run Current Statement
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onRunClicked(true)}>
                      Run All Statements
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onRunClicked(false, true)}>
                      Explain Current Statement
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          <div className="grow overflow-hidden p-2">
            <SqlEditor
              onPrompt={onPrompt}
              agents={agentDriver}
              ref={editorRef}
              dialect={databaseDriver.getFlags().dialect}
              value={code}
              onChange={setCode}
              schema={autoCompleteSchema}
              fontSize={fontSize}
              onFontSizeChanged={setFontSize}
              lineWrap={lineWrap}
              onCursorChange={onCursorChange}
              onKeyDown={(e) => {
                if (KEY_BINDING.run.match(e)) {
                  onRunClicked();
                  e.preventDefault();
                } else if (KEY_BINDING.format.match(e)) {
                  onFormatClicked();
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            />
          </div>
          <div className="shrink-0 grow-0">
            <div className="flex gap-1 px-2 pb-1">
              <div className="mr-2 flex grow items-center gap-2 pl-4 text-xs">
                <div>Ln {lineNumber}</div>
                <div>Col {columnNumber + 1}</div>
              </div>
              <div>
                {Object.keys(placeholders).length > 0 && (
                  <QueryPlaceholder
                    placeholders={placeholders}
                    onChange={setPlaceholders}
                  />
                )}
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={"ghost"}
                    size="sm"
                    onClick={toggleLineWrap}
                    aria-pressed={lineWrap}
                    className={cn(
                      "px-2",
                      lineWrap
                        ? "text-foreground bg-secondary"
                        : "text-muted-foreground dark:text-muted-foreground"
                    )}
                  >
                    <LucideWrapText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="p-4">
                  <p>{lineWrap ? "Disable" : "Enable"} soft line wrap</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={"ghost"}
                    size="sm"
                    onClick={onFormatClicked}
                    className="text-secondary-foreground"
                  >
                    Format
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="p-4">
                  <p className="mb-2">
                    <span className="bg-secondary text-secondary-foreground inline-block rounded px-2 py-1">
                      {KEY_BINDING.format.toString()}
                    </span>
                  </p>
                  <p>Format SQL queries for readability</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle orientation="horizontal" withHandle />
      <ResizablePanel id="results" order={2} defaultSize={50} style={{ position: "relative" }}>
        {isRunning && <OpacityLoading />}
        {windowTab}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

