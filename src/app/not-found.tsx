import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-muted mb-6">ページが見つかりませんでした</p>
        <Link href="/" className="text-primary hover:underline">
          トップページに戻る
        </Link>
      </div>
    </main>
  );
}
