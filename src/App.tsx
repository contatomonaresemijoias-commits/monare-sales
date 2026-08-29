import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import RequireAuth from "@/components/RequireAuth";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Admin from "./pages/Admin.tsx";
import Rh from "./pages/Rh.tsx";
import Certificate from "./pages/Certificate.tsx";
import SejaRevendedora from "./pages/SejaRevendedora.tsx";
import CadastroRevendedora from "./pages/CadastroRevendedora.tsx";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade.tsx";
import TermosRevendedora from "./pages/TermosRevendedora.tsx";
import NotFound from "./pages/NotFound.tsx";
import { CADASTRO_PATH, PAINEL_PATH } from "@/content/landing";
import { ADMIN_PATH, RH_PATH } from "@/lib/acesso";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* ── Público ─────────────────────────────────────────────────
                A raiz do domínio é a landing: quem digita "monare" cai na
                página de captação, não numa tela de login. */}
            <Route path="/" element={<SejaRevendedora />} />
            <Route path={CADASTRO_PATH} element={<CadastroRevendedora />} />
            <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
            <Route path="/termos-revendedora" element={<TermosRevendedora />} />
            <Route path="/garantia/:id" element={<Certificate />} />
            <Route path="/garantia" element={<Certificate />} />
            <Route path="/auth" element={<Auth />} />

            {/* ── App interno ─────────────────────────────────────────── */}
            <Route
              path={PAINEL_PATH}
              element={
                <RequireAuth>
                  <Index />
                </RequireAuth>
              }
            />
            <Route
              path={ADMIN_PATH}
              element={
                <RequireAuth papeis={['administrador']}>
                  <Admin />
                </RequireAuth>
              }
            />
            {/* Painel de RH: captação, contratação e ativação/inativação.
                O admin entra junto — é o mesmo trabalho, só que ele também
                enxerga a gestão e pode excluir conta. */}
            <Route
              path={RH_PATH}
              element={
                <RequireAuth papeis={['administrador', 'rh']}>
                  <Rh />
                </RequireAuth>
              }
            />

            {/* ── Caminhos antigos e sinônimos previsíveis ─────────────────
                /seja-representante foi a URL divulgada e pode estar em link
                salvo, story ou material impresso. O nginx já devolve 301 em
                produção; estas rotas cobrem dev, preview e navegação interna.
                "revendedora" é o termo usado no resto do site, então quem
                chuta esse caminho também precisa chegar. */}
            <Route path="/seja-representante" element={<Navigate to="/" replace />} />
            <Route
              path="/seja-representante/cadastro"
              element={<Navigate to={CADASTRO_PATH} replace />}
            />
            <Route path="/seja-revendedora" element={<Navigate to="/" replace />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
