import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Layout from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Archives from "./pages/Archives";
import About from "./pages/About";
import Projects from "./pages/Projects";
import Categories from "./pages/Categories";
import Tags from "./pages/Tags";
import Gallery from "./pages/Gallery";
import GalleryAdmin from "./pages/GalleryAdmin";
import PostDetail from "./pages/PostDetail";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Account from "./pages/Account";
import Admin from "./pages/Admin";

export default function App() {
  const location = useLocation();
  return (
    <Layout>
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
          <Route path="/register" element={<Register />} />
          <Route path="/account" element={<Account />} />
          <Route path="/admin" element={<ProtectedRoute requireOwner><Admin /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
    </Layout>
  );
}
