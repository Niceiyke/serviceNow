'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from '@/components/admin/user-management';
import { DepartmentManagement } from '@/components/admin/department-management';
import { CategoryManagement } from '@/components/admin/category-management';
import { motion } from 'framer-motion';
import { ShieldAlert, Users, Landmark, Tag } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
};

export default function AdminPortal() {
  return (
    <DashboardLayout>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8 pb-20"
      >
        <motion.div variants={itemVariants} className="flex items-center gap-4 border-b border-primary/10 pb-6">
          <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Admin Console</h1>
            <p className="text-muted-foreground text-sm uppercase tracking-widest font-medium mt-1">System Administration & Oversight</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="bg-black/20 border border-primary/10 p-1 mb-8">
              <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 px-6">
                <Users className="w-4 h-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="departments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 px-6">
                <Landmark className="w-4 h-4" />
                Departments
              </TabsTrigger>
              <TabsTrigger value="categories" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 px-6">
                <Tag className="w-4 h-4" />
                Categories
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="users" className="focus-visible:outline-none">
              <UserManagement />
            </TabsContent>
            
            <TabsContent value="departments" className="focus-visible:outline-none">
              <DepartmentManagement />
            </TabsContent>
            
            <TabsContent value="categories" className="focus-visible:outline-none">
              <CategoryManagement />
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
