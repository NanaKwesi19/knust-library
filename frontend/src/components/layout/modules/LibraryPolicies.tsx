import React from 'react';
import { Card } from '../../ui/Card';
import { Scale, Clock, AlertTriangle, BookOpen, GraduationCap, CalendarCheck } from 'lucide-react';

export default function LibraryPolicies() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Rules & Policies</h2>
        <p className="text-sm text-slate-500 mt-1">Official guidelines and processes for the KNUST Library System.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-[#7A1C2C]">
            <Scale className="w-5 h-5" />
            <h3 className="font-bold">Borrowing Limits</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Students are allowed to borrow up to 5 books at any given time. Books can be kept for a maximum of 14 days before they must be returned or renewed.
          </p>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-[#7A1C2C]">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold">Fines & Penalties</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Overdue books incur a daily fine. If a book is lost, the student is liable to pay a Lost Book Replacement Fee. Excessive unpaid fines may result in a registration block. Look out for "Amnesty Week" where minor fines are waived!
          </p>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-[#7A1C2C]">
            <GraduationCap className="w-5 h-5" />
            <h3 className="font-bold">Program Durations</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Your library account validity is tied to your academic program. Standard programs run for 4 years. Medical, Pharmacy, Optometry, and Architecture students are automatically granted 6-year access based on their registration details.
          </p>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-[#7A1C2C]">
            <CalendarCheck className="w-5 h-5" />
            <h3 className="font-bold">Study Rooms & Janitorial blocks</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Study rooms can be reserved for group sessions. However, the system blocks out all study rooms every Saturday morning (6 AM - 9 AM) for janitorial deep cleaning. Do not attempt to book spaces during this time.
          </p>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-[#7A1C2C]">
            <Clock className="w-5 h-5" />
            <h3 className="font-bold">Reservation Queues</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            If a book is currently borrowed, you can place a hold on it. If you wait in the queue for over 30 days, the system will ping you. Holds older than 45 days are automatically purged to keep the queue moving.
          </p>
        </Card>

      </div>
    </div>
  );
}
