import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Layout from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Home from "./pages/Home";

const Archives = lazy(() => import("./pages/Archives"));
const About = lazy(() => import("./pages/About"));
const Projects = lazy(() => import("./pages/Projects"));
const Categories = lazy(() => import("./pages/Categories"));
const Tags = lazy(() => import("./pages/Tags"));
const Gallery = lazy(() => import("./pages/Gallery"));
const GalleryAdmin = lazy(() => import("./pages/GalleryAdmin"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Account = lazy(() => import("./pages/Account"));
const Admin = lazy(() => import("./pages/Admin"));

export default function App() {
  const location = useLocation();
  return (
    <Layout>
      <Suspense fallback={null}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/archives" element={<Archives />} />
            <Route path="/about" element={<About />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/tags" element={<Tags />} />
            <Route path="/tags/:tag" element={<Tags />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/gallery/admin" element={<ProtectedRoute requireOwner><GalleryAdmin /></ProtectedRoute>} />
            <Route path="/categories/:cat" element={<Categories />} />
            <Route path="/posts/:slug" element={<PostDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/account" element={<Account />} />
            <Route path="/admin" element={<ProtectedRoute requireOwner><Admin /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </Layout>
  );
}
