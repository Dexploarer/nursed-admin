import { useState, useEffect } from 'react';
import { FileText, Plus, Search, Edit2, Trash2, Calendar, BookOpen } from 'lucide-react';
import { getAllLessonPlans, getAllCourses, createLessonPlan, updateLessonPlan, deleteLessonPlan, addTeachingMaterial, getMaterialsForLesson, deleteTeachingMaterial } from '@/lib/db';
import type { Course, LessonPlan, TeachingMaterial } from '@/types';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import { FormField, Input, Textarea, Select } from '@/components/FormField';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function AllLessonPlans() {
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourseId, setFilterCourseId] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);
  const [materials, setMaterials] = useState<TeachingMaterial[]>([]);
  const toast = useToast();

  const emptyForm: LessonPlan = {
    id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    courseId: '',
    courseName: '',
    weekNumber: 1,
    chapter: '',
    topic: '',
    topicsCovered: '',
    assessmentMethod: '',
    vbonTags: '',
    notes: '',
    lastTaughtNotes: '',
    notesForNextTime: '',
    createdAt: '',
    updatedAt: ''
  };

  const [form, setForm] = useState<LessonPlan>(emptyForm);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansData, coursesData] = await Promise.all([
        getAllLessonPlans(),
        getAllCourses()
      ]);
      setLessonPlans(plansData);
      setCourses(coursesData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Error', 'Failed to load lesson plans');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlans = lessonPlans.filter(plan => {
    const matchesSearch =
      !searchQuery ||
      plan.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plan.chapter && plan.chapter.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCourse = !filterCourseId || plan.courseId === filterCourseId;

    return matchesSearch && matchesCourse;
  });

  const handleAdd = () => {
    setForm({
      ...emptyForm,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setMaterials([]);
    setShowAddModal(true);
  };

  const handleEdit = async (plan: LessonPlan) => {
    setForm(plan);
    try {
      const mats = await getMaterialsForLesson(plan.id);
      setMaterials(mats);
    } catch {
      setMaterials([]);
    }
    setShowEditModal(true);
  };

  const handleDelete = (plan: LessonPlan) => {
    setSelectedPlan(plan);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedPlan) return;
    try {
      await deleteLessonPlan(selectedPlan.id);
      toast.success('Deleted', 'Lesson plan has been deleted');
      loadData();
    } catch (error) {
      toast.error('Error', 'Failed to delete lesson plan');
    } finally {
      setShowDeleteConfirm(false);
      setSelectedPlan(null);
    }
  };

  const handleSave = async () => {
    if (!form.topic || !form.courseName) {
      toast.error('Missing Fields', 'Topic and course name are required');
      return;
    }

    try {
      const updatedForm = {
        ...form,
        updatedAt: new Date().toISOString()
      };

      if (showAddModal) {
        await createLessonPlan(updatedForm);
        toast.success('Created', 'Lesson plan has been created');
      } else {
        await updateLessonPlan(updatedForm);
        toast.success('Updated', 'Lesson plan has been updated');
      }

      // Save materials
      for (const material of materials) {
        if (!material.id.startsWith('temp_')) {
          continue; // Already saved
        }
        const newMaterial = {
          ...material,
          id: crypto.randomUUID(),
          lessonPlanId: form.id
        };
        await addTeachingMaterial(newMaterial);
      }

      loadData();
      setShowAddModal(false);
      setShowEditModal(false);
    } catch (error) {
      toast.error('Error', 'Failed to save lesson plan');
    }
  };

  const handleCourseChange = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    setForm({
      ...form,
      courseId,
      courseName: course?.name || form.courseName
    });
  };

  const addMaterial = () => {
    const newMaterial: TeachingMaterial = {
      id: `temp_${crypto.randomUUID()}`,
      lessonPlanId: form.id,
      materialType: 'link',
      title: '',
      url: '',
      description: '',
      sortOrder: materials.length
    };
    setMaterials([...materials, newMaterial]);
  };

  const updateMaterial = (index: number, updates: Partial<TeachingMaterial>) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], ...updates };
    setMaterials(updated);
  };

  const removeMaterial = async (index: number) => {
    const material = materials[index];
    if (!material.id.startsWith('temp_')) {
      try {
        await deleteTeachingMaterial(material.id);
      } catch (error) {
        toast.error('Error', 'Failed to remove material');
        return;
      }
    }
    setMaterials(materials.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-linear-to-br from-teal-600 to-cyan-600 rounded-2xl shadow-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black bg-linear-to-r from-gray-900 via-teal-900 to-cyan-900 bg-clip-text text-transparent mb-1">
                Lesson Plans
              </h1>
              <p className="text-gray-600 text-lg font-medium">{lessonPlans.length} lesson plans</p>
            </div>
          </div>
          <button onClick={handleAdd} className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Lesson Plan
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search topics, courses..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterCourseId}
            onChange={e => setFilterCourseId(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="">All Courses</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.code} - {course.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        {filteredPlans.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Lesson Plans Found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || filterCourseId
                ? 'Try adjusting your search or filters.'
                : 'Create your first lesson plan to get started.'}
            </p>
            {!searchQuery && !filterCourseId && (
              <button onClick={handleAdd} className="btn btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Lesson Plan
              </button>
            )}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Week</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Course</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Topic</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Assessment</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPlans.map((plan) => (
                <tr key={plan.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{format(parseISO(plan.date), 'MMM d, yyyy')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-teal-50 text-teal-700 rounded text-sm font-medium">
                      {plan.weekNumber ? `Week ${plan.weekNumber}` : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-gray-400" />
                      <span>{plan.courseName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{plan.topic}</div>
                    {plan.chapter && (
                      <div className="text-xs text-gray-500">Chapter: {plan.chapter}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{plan.assessmentMethod || '—'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(plan)}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(plan)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
        }}
        title={showAddModal ? 'Add Lesson Plan' : 'Edit Lesson Plan'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
              }}
              className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.topic || !form.courseName}
              className="btn btn-primary disabled:opacity-50"
            >
              {showAddModal ? 'Create' : 'Save Changes'}
            </button>
          </div>
        }
      >
        <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date" required>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Week Number">
              <Input
                type="number"
                min="1"
                max="52"
                value={form.weekNumber || ''}
                onChange={e => setForm({ ...form, weekNumber: parseInt(e.target.value) || undefined })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Course" required>
              <Select
                value={form.courseId || ''}
                onChange={e => handleCourseChange(e.target.value)}
              >
                <option value="">Select or enter course...</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Course Name" required>
              <Input
                type="text"
                value={form.courseName}
                onChange={e => setForm({ ...form, courseName: e.target.value })}
                placeholder="e.g., Fundamentals of Nursing"
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Chapter">
              <Input
                type="text"
                value={form.chapter || ''}
                onChange={e => setForm({ ...form, chapter: e.target.value })}
                placeholder="e.g., Chapter 5"
              />
            </FormField>
            <FormField label="Assessment Method">
              <Input
                type="text"
                value={form.assessmentMethod || ''}
                onChange={e => setForm({ ...form, assessmentMethod: e.target.value })}
                placeholder="e.g., Quiz on Schoology"
              />
            </FormField>
          </div>

          <FormField label="Topic" required>
            <Input
              type="text"
              value={form.topic}
              onChange={e => setForm({ ...form, topic: e.target.value })}
              placeholder="e.g., Vital Signs Assessment"
              required
            />
          </FormField>

          <FormField label="Topics Covered">
            <Textarea
              value={form.topicsCovered || ''}
              onChange={e => setForm({ ...form, topicsCovered: e.target.value })}
              rows={2}
              placeholder="List specific topics covered in this lesson..."
            />
          </FormField>

          <FormField label="Notes">
            <Textarea
              value={form.notes || ''}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="General notes for this lesson..."
            />
          </FormField>

          <FormField label="Notes for Next Time">
            <Textarea
              value={form.notesForNextTime || ''}
              onChange={e => setForm({ ...form, notesForNextTime: e.target.value })}
              rows={2}
              placeholder="What to do differently next time..."
              className="bg-amber-50 border-amber-200"
            />
          </FormField>

          {/* Materials Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700 uppercase">Teaching Materials</h3>
              <button
                type="button"
                onClick={addMaterial}
                className="text-sm text-teal-600 hover:text-teal-800 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Material
              </button>
            </div>

            {materials.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No materials added yet</p>
            ) : (
              <div className="space-y-3">
                {materials.map((material, idx) => (
                  <div key={material.id} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg">
                    <select
                      value={material.materialType}
                      onChange={e => updateMaterial(idx, { materialType: e.target.value as TeachingMaterial['materialType'] })}
                      className="w-28 px-2 py-1 text-sm border border-gray-200 rounded"
                    >
                      <option value="link">Link</option>
                      <option value="powerpoint">PowerPoint</option>
                      <option value="worksheet">Worksheet</option>
                      <option value="video">Video</option>
                      <option value="ati">ATI</option>
                      <option value="pdf">PDF</option>
                    </select>
                    <input
                      type="text"
                      value={material.title}
                      onChange={e => updateMaterial(idx, { title: e.target.value })}
                      placeholder="Title"
                      className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                    />
                    <input
                      type="url"
                      value={material.url}
                      onChange={e => updateMaterial(idx, { url: e.target.value })}
                      placeholder="URL"
                      className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                    />
                    <button
                      type="button"
                      onClick={() => removeMaterial(idx)}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Lesson Plan"
        message={`Are you sure you want to delete "${selectedPlan?.topic}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
