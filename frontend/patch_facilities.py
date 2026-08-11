import os

# 1. Create FacilityManagement.tsx
facility_path = "C:/Users/hp/knust-library/frontend/src/components/admin/facilities/FacilityManagement.tsx"
os.makedirs(os.path.dirname(facility_path), exist_ok=True)
facility_content = """import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import { Building2, Users, MapPin, Plus, Trash2, Edit, Loader2 } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { useToast } from '../../../hooks/useToast';

interface Room {
  id: number;
  roomUuid: string;
  roomNumber: string;
  capacity: number;
  location: string;
  description: string;
  amenities: string[];
}

export default function FacilityManagement() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ roomNumber: '', capacity: '', location: '', description: '', amenities: '' });

  const { data: roomsData, isLoading } = useQuery({
    queryKey: ['adminRooms'],
    queryFn: async () => {
      const res = await API.get('/rooms');
      return res.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post('/rooms/create', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRooms'] });
      addToast('Room created successfully!');
      setIsModalOpen(false);
      setFormData({ roomNumber: '', capacity: '', location: '', description: '', amenities: '' });
    },
    onError: (err: any) => {
      addToast(`Error: ${err.response?.data?.error || 'Failed to create room'}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await API.delete(`/rooms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRooms'] });
      addToast('Room deleted successfully!');
    },
    onError: (err: any) => {
      addToast(`Error: ${err.response?.data?.error || 'Failed to delete room'}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      roomNumber: formData.roomNumber,
      capacity: formData.capacity,
      location: formData.location,
      description: formData.description,
      amenities: formData.amenities.split(',').map(a => a.trim()).filter(Boolean)
    });
  };

  const rooms: Room[] = roomsData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Facility Management</h2>
          <p className="text-sm text-slate-500 mt-1">Manage study rooms and library spaces.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Room
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => (
            <Card key={room.id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#7A1C2C]" /> {room.roomNumber}
                  </h3>
                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                    <Users className="w-3 h-3" /> {room.capacity}
                  </span>
                </div>
                <p className="text-sm text-slate-500 flex items-center gap-1 mb-2">
                  <MapPin className="w-4 h-4" /> {room.location || 'N/A'}
                </p>
                <p className="text-xs text-slate-400 mb-3">{room.description}</p>
                <div className="flex flex-wrap gap-1">
                  {room.amenities.map(a => (
                    <span key={a} className="bg-slate-50 border border-slate-200 text-slate-500 text-[10px] px-2 py-0.5 rounded">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => {
                    if (confirm('Delete this room?')) deleteMutation.mutate(room.id);
                  }}
                  className="text-rose-500 hover:text-rose-700 p-2"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
          {rooms.length === 0 && (
             <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
               <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-3" />
               <p className="text-sm font-bold text-slate-600">No rooms found</p>
               <p className="text-xs text-slate-400 mt-1">Create a study room to allow student reservations.</p>
             </div>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Study Room">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Room Number *</label>
              <input required value={formData.roomNumber} onChange={e => setFormData({...formData, roomNumber: e.target.value})} className="w-full px-3 py-2 border rounded-xl" placeholder="A101" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Capacity *</label>
              <input required type="number" min="1" value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} className="w-full px-3 py-2 border rounded-xl" placeholder="4" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Location</label>
            <input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-3 py-2 border rounded-xl" placeholder="Ground Floor, Main Library" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Description</label>
            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border rounded-xl" placeholder="Quiet study space..." />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Amenities (comma separated)</label>
            <input value={formData.amenities} onChange={e => setFormData({...formData, amenities: e.target.value})} className="w-full px-3 py-2 border rounded-xl" placeholder="Whiteboard, Projector, Outlets" />
          </div>
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button type="submit" isLoading={createMutation.isPending}>Create Room</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
"""
with open(facility_path, "w", encoding="utf-8") as f:
    f.write(facility_content)


# 2. Patch AdminDashboard.tsx
dash_path = "C:/Users/hp/knust-library/frontend/src/components/admin/layout/AdminDashboard.tsx"
with open(dash_path, "r", encoding="utf-8") as f:
    dash_content = f.read()

if "FacilityManagement =" not in dash_content:
    dash_content = dash_content.replace(
        "const OpenLibrarySearch = lazy(() => import('../openlibrary/OpenLibrarySearch'));",
        "const OpenLibrarySearch = lazy(() => import('../openlibrary/OpenLibrarySearch'));\nconst FacilityManagement = lazy(() => import('../facilities/FacilityManagement'));"
    )
    
    route_patch = """                  <Route
                    path="/open-library"
                    element={
                      <motion.div key="openlibrary" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                        <ProtectedRoute allowedRoles={['ADMIN', 'LIBRARIAN']}>
                          <OpenLibrarySearch />
                        </ProtectedRoute>
                      </motion.div>
                    }
                  />
                  <Route
                    path="/facilities"
                    element={
                      <motion.div key="facilities" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                        <ProtectedRoute allowedRoles={['ADMIN', 'LIBRARIAN']}>
                          <FacilityManagement />
                        </ProtectedRoute>
                      </motion.div>
                    }
                  />"""
    dash_content = dash_content.replace(
        """                  <Route
                    path="/open-library"
                    element={
                      <motion.div key="openlibrary" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                        <ProtectedRoute allowedRoles={['ADMIN', 'LIBRARIAN']}>
                          <OpenLibrarySearch />
                        </ProtectedRoute>
                      </motion.div>
                    }
                  />""",
        route_patch
    )
    with open(dash_path, "w", encoding="utf-8") as f:
        f.write(dash_content)

# 3. Patch AdminSidebar.tsx
side_path = "C:/Users/hp/knust-library/frontend/src/components/admin/layout/AdminSidebar.tsx"
with open(side_path, "r", encoding="utf-8") as f:
    side_content = f.read()

if "Building2" not in side_content:
    side_content = side_content.replace("Wrench, // ✅ ADDED", "Wrench, Building2,")
    side_content = side_content.replace(
        "{ key: 'maintenance', label: 'Maintenance', icon: Wrench, path: '/admin/maintenance', roles: ['ADMIN', 'LIBRARIAN'] },",
        "{ key: 'maintenance', label: 'Maintenance', icon: Wrench, path: '/admin/maintenance', roles: ['ADMIN', 'LIBRARIAN'] },\n  { key: 'facilities', label: 'Facilities', icon: Building2, path: '/admin/facilities', roles: ['ADMIN', 'LIBRARIAN'] },"
    )
    with open(side_path, "w", encoding="utf-8") as f:
        f.write(side_content)

print("Patched facilities")
