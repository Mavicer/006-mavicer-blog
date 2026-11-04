import { Routes, Route, useLocation } from "react-router-dom";
import { lazy, Suspense, type ComponentType } from "react";
import Layout from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Archives from "./pages/Archives";
import About from "./pages/About";
import Projects from "./pages/Projects";
import Categories from "./pages/Categories";
import Tags from "./pages/Tags";
import Gallery from "./pages/Gallery";
import NotFound from "./pages/NotFound";
import Feedback from "./pages/Feedback";
import { SeoMetadata } from "./components/SeoMetadata";
import { publicPaths, normalizePath } from "../shared/seo";
import { usePosts } from "./hooks/usePosts";

const LazyPostDetail = lazy(() => import("./pages/PostDetail"));
let PostDetail: ComponentType = LazyPostDetail;
// Resolve the initial article before hydration. Otherwise a theme/auth update
// can interrupt a still-suspended boundary and cause React to replace its HTML.
export async function prepareInitialRoute(path: string) {
  if (path.startsWith("/posts/")) PostDetail = (await import("./pages/PostDetail")).default;
}
const Login = lazy(() => import("./pages/Login"));
const Account = lazy(() => import("./pages/Account"));
const Admin = lazy(() => import("./pages/Admin"));
const UserAdmin = lazy(() => import("./pages/UserAdmin"));
const ArticleEditor = lazy(() => import("./pages/ArticleEditor"));
const FeedbackAdmin = lazy(() => import("./pages/FeedbackAdmin"));
const GalleryAdmin = lazy(() => import("./pages/GalleryAdmin"));

function RouteBoundary({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const isPublic = publicPaths(usePosts().posts).includes(normalizePath(pathname));
  // Initial public pages are already loaded on both server and client, so no
  // dehydrated Suspense boundary can be interrupted by live theme/auth effects.
  if (isPublic && (!pathname.startsWith("/posts/") || PostDetail !== LazyPostDetail)) return <>{children}</>;
  return <Suspense fallback={<div className="main-content-container !pt-[140px] text-center text-third-text py-20">正在加载页面</div>}>{children}</Suspense>;
}

export default function App() {
  const location = useLocation();
  return (
    <Layout>
      <SeoMetadata />
      <RouteBoundary>
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/admin/feedback" element={<ProtectedRoute requireOwner><FeedbackAdmin /></ProtectedRoute>} />
        <Route path="/archives" element={<Archives />} />
        <Route path="/about" element={<About />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/tags" element={<Tags />} />
        <Route path="/tags/:tag" element={<Tags />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/gallery/admin" element={<ProtectedRoute requireOwner><GalleryAdmin /></ProtectedRoute>} />
        <Route path="/categories/:cat" element={<Categories />} />
        <Route path="/posts/:slug" element={<PostDetail key={location.pathname} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Login registering />} />
        <Route path="/admin/users" element={<ProtectedRoute requireOwner><UserAdmin /></ProtectedRoute>} />
        <Route path="/account" element={<Account />} />
        <Route path="/admin/articles/new" element={<ProtectedRoute requireOwner><ArticleEditor /></ProtectedRoute>} />
        <Route path="/admin/articles/:slug/edit" element={<ProtectedRoute requireOwner><ArticleEditor /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute requireOwner><Admin /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </RouteBoundary>
    </Layout>
  );
}
