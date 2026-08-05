"use client";

import React, { createContext, useContext } from "react";
import { useMsg91Widget } from "@/hooks/useMsg91Widget";

interface Msg91WidgetContextValue {
  ready: boolean;
}

const Msg91WidgetContext = createContext<Msg91WidgetContextValue>({ ready: false });

export const GLOBAL_CAPTCHA_RENDER_ID = "msg91-captcha-global";

export function Msg91WidgetProvider({ children }: { children: React.ReactNode }) {
  const { ready } = useMsg91Widget(GLOBAL_CAPTCHA_RENDER_ID);

  return (
    <Msg91WidgetContext.Provider value={{ ready }}>
      {/* Single, app-wide hidden captcha container div */}
      <div
        id={GLOBAL_CAPTCHA_RENDER_ID}
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: "16px",
          right: "16px",
          zIndex: 99999,
        }}
      />
      {children}
    </Msg91WidgetContext.Provider>
  );
}

export function useMsg91Ready() {
  return useContext(Msg91WidgetContext);
}
