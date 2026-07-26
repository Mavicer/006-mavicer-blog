import { createContext, useCallback, useContext, useState } from "react";

type ViewerCtx = {
  src: string | null;
  show: (src: string) => void;
  hide: () => void;
};

const Ctx = createContext<ViewerCtx>(null as any);
export const useImageViewer = () => useContext(Ctx);

export function ImageViewerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const show = useCallback((s: string) => setSrc(s), []);
  const hide = useCallback(() => setSrc(null), []);
  return (
    <Ctx.Provider value={{ src, show, hide }}>
      {children}
      <div
        className={`image-viewer-container ${src ? "active" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) hide();
        }}
      >
        {src && <img src={src} alt="" />}
      </div>
    </Ctx.Provider>
  );
}
