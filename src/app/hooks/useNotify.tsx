// app/ui/useNotify.tsx
"use client";

import * as React from "react";
import { Notification, toaster } from "rsuite";
import "rsuite/Notification/styles/index.css";
import "rsuite/toaster/styles/index.css";

type Placement =
  | "topStart"
  | "topCenter"
  | "topEnd"
  | "bottomStart"
  | "bottomCenter"
  | "bottomEnd";

type Opts = { placement?: Placement; duration?: number };

// En RSuite el key es string
export type ToastKey = string;

export function useNotify(
  defaults: Opts = { placement: "bottomEnd", duration: 4000 }
) {
  const defaultsRef = React.useRef(defaults);

  const push = React.useCallback(
    (n: React.ReactNode, opts?: Opts): ToastKey => {
      const placement =
        opts?.placement ?? defaultsRef.current.placement ?? "bottomEnd";
      const duration = opts?.duration ?? defaultsRef.current.duration ?? 4000;
      return toaster.push(n, { placement, duration }) as ToastKey;
    },
    []
  );

  const success = React.useCallback(
    (title: React.ReactNode, body?: React.ReactNode, opts?: Opts): ToastKey =>
      push(
        <Notification type="success" header={title} closable>
          {body}
        </Notification>,
        opts
      ),
    [push]
  );
  const info = React.useCallback(
    (title: React.ReactNode, body?: React.ReactNode, opts?: Opts): ToastKey =>
      push(
        <Notification type="info" header={title} closable>
          {body}
        </Notification>,
        opts
      ),
    [push]
  );
  const warning = React.useCallback(
    (title: React.ReactNode, body?: React.ReactNode, opts?: Opts): ToastKey =>
      push(
        <Notification type="warning" header={title} closable>
          {body}
        </Notification>,
        opts
      ),
    [push]
  );
  const error = React.useCallback(
    (title: React.ReactNode, body?: React.ReactNode, opts?: Opts): ToastKey =>
      push(
        <Notification type="error" header={title} closable>
          {body}
        </Notification>,
        opts
      ),
    [push]
  );

  const loading = React.useCallback(
    (
      title: React.ReactNode = "Procesando…",
      body?: React.ReactNode,
      opts?: Opts
    ): ToastKey =>
      push(
        <Notification type="info" header={title} closable>
          {body}
        </Notification>,
        { ...opts, duration: 0 }
      ),
    [push]
  );

  const remove = React.useCallback((key: ToastKey) => {
    toaster.remove(key); // el tipo ya es string
  }, []);

  const clear = React.useCallback(() => {
    toaster.clear();
  }, []);

  return { push, success, info, warning, error, loading, remove, clear };
}
