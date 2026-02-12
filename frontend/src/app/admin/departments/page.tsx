'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [newCatName, setNewCatName] = useState<{ [key: string]: string }>({});

  const fetchDepts = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/departments', { name: newDeptName });
      setNewDeptName('');
      fetchDepts();
    } catch (err) {
      alert('Failed to create department. Make sure you are an ADMIN.');
    }
  };

  const handleCreateCat = async (deptId: string) => {
    try {
      await api.post(`/departments/${deptId}/categories`, { name: newCatName[deptId] });
      setNewCatName({ ...newCatName, [deptId]: '' });
      fetchDepts();
    } catch (err) {
      alert('Failed to create category');
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-8">Department Management</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create New Department</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateDept} className="flex space-x-2">
            <Input 
              placeholder="Department Name" 
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              required
            />
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead>Add Category</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map((dept: any) => (
              <TableRow key={dept.id}>
                <TableCell className="font-medium">{dept.name}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Input 
                      placeholder="Category Name" 
                      size={20}
                      value={newCatName[dept.id] || ''}
                      onChange={(e) => setNewCatName({ ...newCatName, [dept.id]: e.target.value })}
                    />
                    <Button 
                      size="sm" 
                      onClick={() => handleCreateCat(dept.id)}
                      disabled={!newCatName[dept.id]}
                    >
                      Add
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}
