import { Heart, LayoutDashboard, Stethoscope, Users, LogOut, Shield, Activity, Trash2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, user, signOut } = useAuth();

  const mainItems = [
    { title: "Dashboard", icon: LayoutDashboard, path: "/" },
    { title: "Doctors", icon: Stethoscope, path: "/doctors", roles: ["admin"] },
    { title: "Patients", icon: Users, path: "/patients" },
  ];

  const adminItems = [
    { title: "Audit Logs", icon: Activity, path: "/audit-logs" },
    { title: "Deleted Records", icon: Trash2, path: "/deleted-records" },
  ];

  const filteredMain = mainItems.filter(
    (item) => !item.roles || (role && item.roles.includes(role))
  );

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-sidebar-primary p-1.5">
            <Heart className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-sidebar-foreground">HealthCare</h2>
            <p className="text-xs text-sidebar-foreground/60">Management System</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {filteredMain.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton isActive={location.pathname === item.path} onClick={() => navigate(item.path)} tooltip={item.title}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {role === "admin" && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Administration</SidebarGroupLabel>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton isActive={location.pathname === item.path} onClick={() => navigate(item.path)} tooltip={item.title}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-2 rounded-md bg-sidebar-accent p-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
            {user?.email?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.email}</p>
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-sidebar-foreground/60" />
              <p className="text-xs text-sidebar-foreground/60 capitalize">{role ?? "user"}</p>
            </div>
          </div>
          <button onClick={signOut} className="text-sidebar-foreground/60 hover:text-sidebar-foreground" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
