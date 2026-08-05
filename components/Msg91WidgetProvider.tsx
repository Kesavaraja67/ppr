"use client";

import React, { createContext, useContext, useState } from "react";
import { useMsg91Widget } from "@/hooks/useMsg91Widget";

interface Msg91WidgetContextValue {
  ready: boolean;
  showCaptcha: boolean;
  setShowCaptcha: (show: boolean) => void;
}

const Msg91WidgetContext = createContext<Msg91WidgetContextValue>({
  ready: false,
  showCaptcha: false,
  setShowCaptcha: () => {},
});

export const GLOBAL_CAPTCHA_RENDER_ID = "msg91-captcha-global";

export function Msg91WidgetProvider({ children }: { children: React.ReactNode }) {
  const { ready } = useMsg91Widget(GLOBAL_CAPTCHA_RENDER_ID);
  const [showCaptcha, setShowCaptcha] = useState(false);

  return (
    <Msg91WidgetContext.Provider value={{ ready, showCaptcha, setShowCaptcha }}>
      {/* Captcha container div — visible ONLY when showCaptcha is true during OTP send */}
      <div
        id={GLOBAL_CAPTCHA_RENDER_ID}
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: "16px",
          right: "16px",
          zIndex: 99999,
          display: showCaptcha ? "block" : "none",
        }}
      />
      {children}
    </Msg91WidgetContext.Provider>
  );
}

export function useMsg91Ready() {
  return useContext(Msg91WidgetContext);
}
