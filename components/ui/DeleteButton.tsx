"use client";

type DeleteButtonProps = {
  label: string;
  confirmMessage: string;
};

export function DeleteButton({ label, confirmMessage }: DeleteButtonProps) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      className="rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-400"
    >
      {label}
    </button>
  );
}
