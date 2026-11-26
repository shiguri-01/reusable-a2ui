import { useEffect, useState, type ComponentType } from "react";

interface StreamdownComponentProps {
  children?: string;
  isAnimating?: boolean;
  plugins?: Record<string, unknown>;
}

interface LoadedMarkdownModule {
  Streamdown: ComponentType<StreamdownComponentProps>;
  plugins: Record<string, unknown>;
}

let cachedModule: LoadedMarkdownModule | null = null;
let loadPromise: Promise<LoadedMarkdownModule> | null = null;

function loadStreamdown(): Promise<LoadedMarkdownModule> {
  if (import.meta.env.SSR) {
    return new Promise(() => {});
  }
  if (cachedModule) return Promise.resolve(cachedModule);
  if (!loadPromise) {
    loadPromise = Promise.all([import("streamdown"), import("@streamdown/cjk")]).then(
      ([sdMod, cjkMod]) => {
        const loaded: LoadedMarkdownModule = {
          Streamdown: sdMod.Streamdown as ComponentType<StreamdownComponentProps>,
          plugins: { cjk: cjkMod.cjk },
        };
        cachedModule = loaded;
        return loaded;
      },
    );
  }
  return loadPromise;
}

interface MarkdownContentProps {
  content: string;
  isAnimating?: boolean;
}

export function MarkdownContent({ content, isAnimating = false }: MarkdownContentProps) {
  const [mod, setMod] = useState<LoadedMarkdownModule | null>(() => cachedModule);

  useEffect(() => {
    if (cachedModule) {
      setMod(cachedModule);
      return;
    }
    let active = true;
    void loadStreamdown().then((loaded) => {
      if (active) setMod(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!mod) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  const { Streamdown, plugins } = mod;
  return (
    <Streamdown plugins={plugins} isAnimating={isAnimating}>
      {content}
    </Streamdown>
  );
}
