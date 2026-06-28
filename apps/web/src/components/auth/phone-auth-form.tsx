"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bootstrapUser } from "@/lib/auth-actions";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isFirebaseClientConfigured } from "@/lib/env.client";
import { isValidE164Phone, maskPhoneNumber, normalizePhoneNumber } from "@/lib/phone";

type PhoneAuthFormProps = {
  mode: "sign-in" | "sign-up";
  displayName?: string;
  onBeforeBootstrap?: () => string | null;
  onSuccess: () => void;
};

export function PhoneAuthForm({ mode, displayName, onBeforeBootstrap, onSuccess }: PhoneAuthFormProps) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  const setupRecaptcha = useCallback(() => {
    if (!isFirebaseClientConfigured()) return null;
    if (recaptchaRef.current) return recaptchaRef.current;
    const auth = getFirebaseAuth();
    recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
    });
    return recaptchaRef.current;
  }, []);

  useEffect(() => {
    return () => {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    };
  }, []);

  async function sendOtp() {
    if (!isFirebaseClientConfigured()) {
      toast.error("Firebase is not configured");
      return;
    }
    const normalized = normalizePhoneNumber(phone);
    if (!isValidE164Phone(normalized)) {
      toast.error("Enter a valid phone number with country code (e.g. +91XXXXXXXXXX)");
      return;
    }
    setLoading(true);
    try {
      const verifier = setupRecaptcha();
      if (!verifier) throw new Error("reCAPTCHA failed to initialize");
      confirmationRef.current = await signInWithPhoneNumber(
        getFirebaseAuth(),
        normalized,
        verifier,
      );
      setStep("otp");
      toast.success(`OTP sent to ${maskPhoneNumber(normalized)}`);
    } catch (err) {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
      toast.error(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (!confirmationRef.current) {
      toast.error("Request a new OTP");
      return;
    }
    if (otp.length < 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const precheck = onBeforeBootstrap?.();
      if (precheck) {
        toast.error(precheck);
        return;
      }
      await confirmationRef.current.confirm(otp);
      await bootstrapUser(mode === "sign-up" && displayName ? { displayName } : undefined);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  if (step === "otp") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="otp">Verification code</Label>
          <Input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
          />
        </div>
        <Button type="button" className="w-full min-h-[44px]" onClick={verifyOtp} disabled={loading}>
          {loading ? "Verifying..." : "Verify & continue"}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("phone")} disabled={loading}>
          Change phone number
        </Button>
        <div id="recaptcha-container" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">Phone number</Label>
        <Input
          id="phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 98765 43210"
        />
        <p className="text-xs text-muted-foreground">Include country code. India numbers can start with +91.</p>
      </div>
      <Button type="button" className="w-full min-h-[44px]" onClick={sendOtp} disabled={loading}>
        {loading ? "Sending..." : "Send OTP"}
      </Button>
      <div id="recaptcha-container" />
    </div>
  );
}
