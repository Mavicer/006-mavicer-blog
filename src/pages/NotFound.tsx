import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="main-content-container flex flex-col items-center justify-center min-h-[70vh] !pt-0">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <p className="text-third-text mb-6">页面不存在或已被移动。</p>
        <Link to="/" className="text-primary hover:underline">
          ← 返回首页
        </Link>
      </div>
    </div>
  );
}
