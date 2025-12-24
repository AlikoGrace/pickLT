'use client'

import { useAuth, CrewMember } from '@/context/auth'
import {
  PlusIcon,
  PhoneIcon,
  TrashIcon,
  PencilIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import { useState } from 'react'

const MyCrewPage = () => {
  const { crewMembers, addCrewMember, removeCrewMember, updateCrewMember } = useAuth()
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [editingMember, setEditingMember] = useState<CrewMember | null>(null)
  const [newMember, setNewMember] = useState<{
    name: string
    phone: string
    role: 'driver' | 'helper'
  }>({
    name: '',
    phone: '',
    role: 'helper',
  })

  const handleAddMember = () => {
    if (newMember.name && newMember.phone) {
      addCrewMember({
        id: Date.now().toString(),
        name: newMember.name,
        phone: newMember.phone,
        role: newMember.role,
        isActive: true,
      })
      setNewMember({ name: '', phone: '', role: 'helper' })
      setIsAddingMember(false)
    }
  }

  const handleUpdateMember = () => {
    if (editingMember) {
      updateCrewMember(editingMember.id, {
        name: editingMember.name,
        phone: editingMember.phone,
        role: editingMember.role,
      })
      setEditingMember(null)
    }
  }

  const roles: Array<{ value: 'driver' | 'helper'; label: string }> = [
    { value: 'helper', label: 'Helper' },
    { value: 'driver', label: 'Driver' },
  ]

  return (
    <div className="p-4 lg:p-6 pb-24 lg:pb-6">
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
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                Add Member
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
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                Save Changes
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
              className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm"
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingMember(member)}
                    className="p-2 text-neutral-500 hover:text-primary-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => removeCrewMember(member.id)}
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
    </div>
  )
}

export default MyCrewPage
