import { Toaster as Sonner, ToasterProps } from "sonner";
import { useAppStore } from "../../store/appStore";

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useAppStore();
  
  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      duration={5000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-(--bg-secondary) group-[.toaster]:text-(--text-primary) group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:border-(--border-color)",
          description: "group-[.toast]:text-(--text-muted)",
          actionButton:
            "group-[.toast]:bg-(--accent-color) group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-(--bg-tertiary) group-[.toast]:text-(--text-primary)",
          success: "group-[.toaster]:text-green-500",
          error: "group-[.toaster]:text-red-500",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
