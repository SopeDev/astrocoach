"use client";

import { RotateCcw } from "lucide-react";
import { useFormStatus } from "react-dom";
import { resetAccount } from "@/app/actions/account";
import type { Locale } from "@/i18n/config";

type Labels = {
  button: string;
  resetting: string;
  confirmation: string;
};

function ResetButton({ labels }: { labels: Labels }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-300 px-5 py-3 font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
      disabled={pending}
      type="submit"
    >
      <RotateCcw aria-hidden="true" className="size-4" />
      {pending ? labels.resetting : labels.button}
    </button>
  );
}

export function ResetAccountButton({ locale, labels }: { locale: Locale; labels: Labels }) {
  const action = resetAccount.bind(null, locale);

  return (
    <form
      action={action}
      className="mt-3"
      onSubmit={(event) => {
        if (!window.confirm(labels.confirmation)) event.preventDefault();
      }}
    >
      <ResetButton labels={labels} />
    </form>
  );
}
