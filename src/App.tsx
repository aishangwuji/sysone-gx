import React, { useEffect } from 'react';
import { Header } from './components/Header';
import { WorkflowCanvas } from './components/Canvas/WorkflowCanvas';
import { NodeInspector } from './components/Inspector/NodeInspector';
import { LiveSandbox } from './components/Sandbox/LiveSandbox';
import { AuthModal } from './components/Auth/AuthModal';
import { ProjectManagerModal } from './components/Project/ProjectManagerModal';
import { useAuthStore } from './store/useAuthStore';
import { useWorkflowStore } from './store/useWorkflowStore';

export default function App() {
  const { initAuth, isAuthenticated } = useAuthStore();
  const { fetchUserProjects, loadProjectById, currentProjectId } = useWorkflowStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserProjects().then((projects) => {
        if (projects && projects.length > 0 && !currentProjectId) {
          loadProjectById(projects[0].id);
        }
      });
    }
  }, [isAuthenticated, fetchUserProjects, loadProjectById, currentProjectId]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0B0D13]">
      {/* Top Navbar */}
      <Header />

      {/* Main Workspace */}
      <div className="flex-1 flex w-full min-h-0 overflow-hidden">
        {/* Center Canvas (Flex Grow) */}
        <div className="flex-1 h-full relative">
          <WorkflowCanvas />
        </div>

        {/* Right Panel - Dual Tabs or Split (Inspector + Live Sandbox) */}
        <div className="w-[24rem] xl:w-[28rem] h-full bg-[#121520] border-l border-[#282D3D] flex flex-col shrink-0">
          {/* Upper Half: Node Inspector */}
          <div className="h-[55%] overflow-y-auto border-b border-[#282D3D]">
            <NodeInspector />
          </div>

          {/* Lower Half: Live Sandbox */}
          <div className="h-[45%] overflow-hidden">
            <LiveSandbox />
          </div>
        </div>
      </div>

      {/* Auth & Project Modals */}
      <AuthModal />
      <ProjectManagerModal />
    </div>
  );
}
