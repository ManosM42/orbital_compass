import React, { createContext, useContext, useState } from "react";

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const login = (email: string) => {
    setUser({ id: "usr_" + Math.random().toString(36).substring(2, 9), email });
    setIsAuthModalOpen(false);
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        login,
        logout,
      }}
    >
      {children}
      {isAuthModalOpen && (
        <AuthModal onClose={closeAuthModal} onLogin={login} />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

function AuthModal({
  onClose,
  onLogin,
}: {
  onClose: () => void;
  onLogin: (email: string) => void;
}) {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onLogin(email);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl border border-primary/30">
        <h3 className="font-display text-xl font-bold text-foreground">
          Commander Authentication
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Enter your email address to log in or create your space operations account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="commander@orbital.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 rounded-full border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-1/2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-md"
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}