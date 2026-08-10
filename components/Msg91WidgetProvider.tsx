"use client";

import React, { createContext, useContext } from "react";
import { useMsg91Widget } from "@/hooks/useMsg91Widget";

interface Msg91WidgetContextValue {
  ready: boolean;
  widgetError: string | null;
}

const Msg91WidgetContext = createContext<Msg91WidgetContextValue>({
  ready: false,
  widgetError: null,
});

export const GLOBAL_CAPTCHA_RENDER_ID = "msg91-captcha-global";

export function Msg91WidgetProvider({ children }: { children: React.ReactNode }) {
  const { ready, widgetError } = useMsg91Widget(GLOBAL_CAPTCHA_RENDER_ID);

  return (
    <Msg91WidgetContext.Provider value={{ ready, widgetError }}>
      {children}
    </Msg91WidgetContext.Provider>
  );
}

export function CaptchaContainer({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      id={GLOBAL_CAPTCHA_RENDER_ID}
      style={{
        minHeight: "0px",
        marginBottom: "16px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        ...style,
      }}
    />
  );
}

export function useMsg91Ready() {
  return useContext(Msg91WidgetContext);
}
