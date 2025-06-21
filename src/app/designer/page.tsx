import UserMenu from '@/components/auth/UserMenu';
import WorkflowDesigner from '@/components/workflow/WorkflowDesigner';
import WorkflowSidebar from '@/components/workflow/WorkflowSidebar';

export default function DesignerPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">PromptBuilder</h1>
              <span className="ml-2 text-sm text-gray-900">Workflow Designer</span>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex h-0">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200">
          <WorkflowSidebar />
        </div>
        
        {/* Designer Canvas */}
        <div className="flex-1 relative">
          <WorkflowDesigner />
        </div>
      </div>
    </div>
  );
}