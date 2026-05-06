import { EventCreateForm } from "@/components/event";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            調整さんネオ
          </h1>
          <p className="text-muted">
            日程調整をもっと簡単に。候補日を設定して、みんなの都合を集めましょう。
          </p>
        </header>

        <div className="bg-card-bg rounded-xl shadow-sm border border-border p-6 md:p-8">
          <h2 className="text-xl font-semibold mb-6">新規作成</h2>
          <EventCreateForm />
        </div>

        <footer className="mt-8 text-center text-sm text-muted">
          <p>LINEで共有 / Googleカレンダーに追加 / ICSダウンロード対応</p>
        </footer>
      </div>
    </main>
  );
}
