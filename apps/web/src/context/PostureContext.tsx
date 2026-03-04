import { createContext, useContext } from "react";
import { usePostureStream } from "../hooks/usePostureStream";

type PostureContextType = ReturnType<typeof usePostureStream>;

const PostureContext = createContext<PostureContextType | null>(null);

export function PostureProvider({ children }: { children: React.ReactNode }) {
  const posture = usePostureStream();

  return (
    <PostureContext.Provider value={posture}>
      {children}
    </PostureContext.Provider>
  );
}

export function usePosture() {
  const context = useContext(PostureContext);
  if (!context) throw new Error("usePosture must be used inside PostureProvider");
  return context;
}