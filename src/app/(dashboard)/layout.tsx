import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50/50 p-4 pt-16 lg:p-8 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
