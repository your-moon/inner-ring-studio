"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { AlertDialog, AlertDialogContent } from "./alert-dialog";

/**
 * A promise-based confirm, so call sites read like the native window.confirm
 * they replace — `if (!(await confirm({...}))) return;` — but render the
 * focus-trapped, tokenized AlertDialog instead of the OS popup. Mount one
 * <ConfirmProvider> near the app root.
 */
export type ConfirmOptions = {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within <ConfirmProvider>");
  }
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setOptions(opts);
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={options !== null}
        onOpenChange={(open) => {
          if (!open) settle(false);
        }}
      >
        {options ? (
          <AlertDialogContent
            title={options.title}
            description={options.description}
            confirmLabel={options.confirmLabel ?? "Confirm"}
            cancelLabel={options.cancelLabel ?? "Cancel"}
            destructive={options.destructive ?? true}
            onConfirm={() => settle(true)}
          />
        ) : null}
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}
