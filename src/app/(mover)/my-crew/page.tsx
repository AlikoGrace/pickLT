'use client'

import { useAuth, CrewMember } from '@/context/auth'
import {
  PlusIcon,
  PhoneIcon,
  TrashIcon,
  PencilIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import { useState } from 'react'

const MyCrewPage = () => {
  const { crewMembers, addCrewMember, removeCrewMember, updateCrewMember } = useAuth()
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [editingMember, setEditingMember] = useState<CrewMember | null>(null)
  const [viewingMember, setViewingMember] = useState<CrewMember | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [newMember, setNewMember] = useState<{
    name: string
    phone: string
    role: 'driver' | 'helper'
  }>({
    name: '',
    phone: '',
    role: 'helper',
  })

  const handleAddMember = async () => {
    if (newMember.name && newMember.phone) {
      setIsSaving(true)
      try {
        const res = await fetch('/api/crew', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMember),
        })
        if (res.ok) {
          const data = await res.json()
          addCrewMember({
            id: data.crewMember.$id,
            name: data.crewMember.name,
            phone: data.crewMember.phone,
            role: data.crewMember.role,
            isActive: true,
          })
        }
      } catch (err) {
        console.error('Failed to add crew member:', err)
      } finally {
        setNewMember({ name: '', phone: '', role: 'helper' })
        setIsAddingMember(false)
        setIsSaving(false)
      }
    }
  }

  const handleUpdateMember = async () => {
    if (editingMember) {
      setIsSaving(true)
      try {
        const res = await fetch(`/api/crew/${editingMember.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editingMember.name,
            phone: editingMember.phone,
            role: editingMember.role,
          }),
        })
        if (res.ok) {
          updateCrewMember(editingMember.id, {
            name: editingMember.name,
            phone: editingMember.phone,
            role: editingMember.role,
          })
        }
      } catch (err) {
        console.error('Failed to update crew member:', err)
      } finally {
        setEditingMember(null)
        setIsSaving(false)
      }
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      const res = await fetch(`/api/crew/${memberId}`, { method: 'DELETE' })
      if (res.ok) {
        removeCrewMember(memberId)
      }
    } catch (err) {
      console.error('Failed to remove crew member:', err)
    }
  }

  const roles: Array<{ value: 'driver' | 'helper'; label: string }> = [
    { value: 'helper', label: 'Helper' },
    { value: 'driver', label: 'Driver' },
  ]

  return (
    <div className="p-4 lg:p-6 pb-24 lg:pb-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            My Crew
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Manage your team members
          </p>
        </div>
        <button
          onClick={() => setIsAddingMember(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {/* Add Member Form */}
      {isAddingMember && (
        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm mb-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            Add New Crew Member
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newMember.name}
                onChange={(e) =>
                  setNewMember({ ...newMember, name: e.target.value })
                }
                placeholder="Enter name"
                className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={newMember.phone}
                onChange={(e) =>
                  setNewMember({ ...newMember, phone: e.target.value })
                }
                placeholder="Enter phone number"
                className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Role
              </label>
              <select
                value={newMember.role}
                onChange={(e) =>
                  setNewMember({ ...newMember, role: e.target.value as 'driver' | 'helper' })
                }
                className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsAddingMember(false)}
                className="flex-1 px-4 py-2 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Form */}
      {editingMember && (
        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm mb-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            Edit Crew Member
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={editingMember.name}
                onChange={(e) =>
                  setEditingMember({ ...editingMember, name: e.target.value })
                }
                placeholder="Enter name"
                className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={editingMember.phone}
                onChange={(e) =>
                  setEditingMember({ ...editingMember, phone: e.target.value })
                }
                placeholder="Enter phone number"
                className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Role
              </label>
              <select
                value={editingMember.role}
                onChange={(e) =>
                  setEditingMember({ ...editingMember, role: e.target.value as 'driver' | 'helper' })
                }
                className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditingMember(null)}
                className="flex-1 px-4 py-2 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateMember}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crew Members List */}
      <div className="space-y-3">
        {crewMembers && crewMembers.length > 0 ? (
          crewMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setViewingMember(member)}
            >
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex-shrink-0">
                  {member.photo ? (
                    <Image
                      src={member.photo}
                      alt={member.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <UserCircleIcon className="w-full h-full text-neutral-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    {member.name}
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 capitalize">
                    {member.role}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
                    <PhoneIcon className="w-3.5 h-3.5" />
                    <span>{member.phone}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setEditingMember(member)}
                    className="p-2 text-neutral-500 hover:text-primary-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-8 shadow-sm text-center">
            <UserCircleIcon className="w-16 h-16 mx-auto text-neutral-300 dark:text-neutral-600 mb-4" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              No Crew Members Yet
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 mb-4">
              Add your first crew member to start managing your team.
            </p>
            <button
              onClick={() => setIsAddingMember(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add First Member
            </button>
          </div>
        )}
      </div>

      {/* Crew Member Detail Popup */}
      {viewingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl w-full max-w-sm overflow-hidden relative">
            {/* Close button */}
            <button
              onClick={() => setViewingMember(null)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 z-10"
            >
              <XMarkIcon className="w-5 h-5 text-neutral-400" />
            </button>

            {/* Photo header */}
            <div className="bg-gradient-to-b from-primary-500 to-primary-600 pt-8 pb-12 flex items-center justify-center relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-white/20 border-4 border-white shadow-lg">
                {viewingMember.photo ? (
                  <Image
                    src={viewingMember.photo}
                    alt={viewingMember.name}
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <UserCircleIcon className="w-full h-full text-white/70" />
                )}
              </div>
            </div>

            {/* Info */}
            <div className="p-6 -mt-4">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                  {viewingMember.name}
                </h3>
                <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-medium capitalize bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                  {viewingMember.role}
                </span>
              </div>

              <div className="space-y-4">
                {/* Phone */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                    <PhoneIcon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Phone</p>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      {viewingMember.phone}
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        viewingMember.isActive ? 'bg-green-500' : 'bg-neutral-400'
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Status</p>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      {viewingMember.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mt-6">
                <a
                  href={`tel:${viewingMember.phone}`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  <PhoneIcon className="w-4 h-4" />
                  Call
                </a>
                <button
                  onClick={() => {
                    setViewingMember(null)
                    setEditingMember(viewingMember)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                >
                  <PencilIcon className="w-4 h-4" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyCrewPage
