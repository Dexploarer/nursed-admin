import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  BookOpen, FileText, Video, ExternalLink, Plus, Edit2, Trash2,
  GraduationCap, FileSpreadsheet, Link as LinkIcon, Clock, StickyNote
} from 'lucide-react';
import {
  getTodaysLessonPlan, createLessonPlan, updateLessonPlan,
  addTeachingMaterial, deleteTeachingMaterial
} from '@/lib/db';
import { LessonPlanWithMaterials, LessonPlan, TeachingMaterial } from '@/types';
import { Modal } from './Modal';
import { FormField, Input, Textarea } from './FormField';
import { useToast } from './Toast';
import { Card } from './Card';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

const MATERIAL_ICONS: Record<string, React.ReactNode> = {
  powerpoint: <FileText className="w-4 h-4" />,
  worksheet: <FileSpreadsheet className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  ati: <GraduationCap className="w-4 h-4" />,
  link: <LinkIcon className="w-4 h-4" />,
  pdf: <FileText className="w-4 h-4" />
};

const MATERIAL_COLORS: Record<string, string> = {
  powerpoint: 'bg-amber-100 text-amber-700 border-amber-200',
  worksheet: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  video: 'bg-rose-100 text-rose-700 border-rose-200',
  ati: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  link: 'bg-violet-100 text-violet-700 border-violet-200',
  pdf: 'bg-slate-100 text-slate-700 border-slate-200'
};

export default function TodaysTeachingView() {
  const [lessonPlan, setLessonPlan] = useState<LessonPlanWithMaterials | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const { success: showSuccess, error: showError } = useToast();

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayFormatted = format(new Date(), 'EEEE, MMMM do, yyyy');

  const [newLesson, setNewLesson] = useState({
    courseName: '',
    chapter: '',
    topic: '',
    notes: '',
    lastTaughtNotes: ''
  });

  const [newMaterial, setNewMaterial] = useState({
    materialType: 'powerpoint' as TeachingMaterial['materialType'],
    title: '',
    url: '',
    description: ''
  });

  useEffect(() => {
    loadTodaysLesson();
  }, []);

  const loadTodaysLesson = async () => {
    try {
      const plan = await getTodaysLessonPlan(today);
      setLessonPlan(plan);
      if (plan) {
        setNewLesson({
          courseName: plan.plan.courseName,
          chapter: plan.plan.chapter || '',
          topic: plan.plan.topic,
          notes: plan.plan.notes || '',
          lastTaughtNotes: plan.plan.lastTaughtNotes || ''
        });
      }
    } catch (error) {
      console.error('Failed to load lesson plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLesson = async () => {
    if (!newLesson.courseName || !newLesson.topic) {
      showError('Missing Information', 'Please enter course name and topic');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const lesson: LessonPlan = {
        id: lessonPlan?.plan.id || `LP-${Date.now()}`,
        date: today,
        courseName: newLesson.courseName,
        chapter: newLesson.chapter || undefined,
        topic: newLesson.topic,
        notes: newLesson.notes || undefined,
        lastTaughtNotes: newLesson.lastTaughtNotes || undefined,
        createdAt: lessonPlan?.plan.createdAt || now,
        updatedAt: now
      };

      if (lessonPlan) {
        await updateLessonPlan(lesson);
        showSuccess('Lesson Updated', 'Today\'s lesson plan has been updated');
      } else {
        await createLessonPlan(lesson);
        showSuccess('Lesson Created', 'Today\'s lesson plan has been created');
      }

      await loadTodaysLesson();
      setShowLessonModal(false);
    } catch (error) {
      console.error('Failed to save lesson:', error);
      showError('Save Failed', 'Failed to save lesson plan');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMaterial = async () => {
    if (!lessonPlan || !newMaterial.title || !newMaterial.url) {
      showError('Missing Information', 'Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const material: TeachingMaterial = {
        id: `MAT-${Date.now()}`,
        lessonPlanId: lessonPlan.plan.id,
        materialType: newMaterial.materialType,
        title: newMaterial.title,
        url: newMaterial.url,
        description: newMaterial.description || undefined,
        sortOrder: (lessonPlan.materials?.length || 0) + 1
      };

      await addTeachingMaterial(material);
      showSuccess('Material Added', 'Teaching material has been added');
      await loadTodaysLesson();
      setShowMaterialModal(false);
      setNewMaterial({
        materialType: 'powerpoint',
        title: '',
        url: '',
        description: ''
      });
    } catch (error) {
      console.error('Failed to add material:', error);
      showError('Failed', 'Could not add teaching material');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      await deleteTeachingMaterial(id);
      showSuccess('Removed', 'Material has been removed');
      await loadTodaysLesson();
    } catch (error) {
      console.error('Failed to delete material:', error);
      showError('Failed', 'Could not remove material');
    }
  };

  const openExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <Card padding="lg">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        title="Today's Teaching"
        subtitle={todayFormatted}
        headerAction={
          <Button
            variant="primary"
            size="sm"
            icon={lessonPlan ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            onClick={() => setShowLessonModal(true)}
          >
            {lessonPlan ? 'Edit Lesson' : 'Plan Today'}
          </Button>
        }
      >
        {lessonPlan ? (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold border border-slate-800">
                  {lessonPlan.plan.courseName}
                </span>
                {lessonPlan.plan.chapter && (
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200">
                    {lessonPlan.plan.chapter}
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{lessonPlan.plan.topic}</h3>
            </div>

            {lessonPlan.plan.notes && (
              <div className="bg-gradient-to-br from-amber-50/80 to-amber-100/40 border-2 border-amber-500/30 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <StickyNote className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Teaching Notes</span>
                </div>
                <p className="text-sm text-amber-900 leading-relaxed font-medium">{lessonPlan.plan.notes}</p>
              </div>
            )}

            {lessonPlan.plan.lastTaughtNotes && (
              <div className="bg-gradient-to-br from-cyan-50/80 to-cyan-100/40 border-2 border-cyan-500/30 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-cyan-600" />
                  <span className="text-xs font-bold text-cyan-700 uppercase tracking-wide">Notes from Last Time</span>
                </div>
                <p className="text-sm text-cyan-900 leading-relaxed font-medium">{lessonPlan.plan.lastTaughtNotes}</p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Teaching Materials</h4>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setShowMaterialModal(true)}
                >
                  Add Material
                </Button>
              </div>

              {lessonPlan.materials && lessonPlan.materials.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {lessonPlan.materials.map((material) => (
                    <div
                      key={material.id}
                      className="group relative bg-white/80 backdrop-blur-sm border-2 border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => openExternalLink(material.url)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg shrink-0 border ${MATERIAL_COLORS[material.materialType]}`}>
                          {MATERIAL_ICONS[material.materialType]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="font-bold text-sm text-slate-900 truncate">{material.title}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                          </div>
                          <span className="text-xs text-slate-500 capitalize font-medium">{material.materialType}</span>
                          {material.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1 font-medium">{material.description}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMaterial(material.id);
                        }}
                        className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<FileText className="w-12 h-12 text-slate-300" />}
                  title="No materials added yet"
                  action={{
                    label: 'Add your first material',
                    onClick: () => setShowMaterialModal(true),
                    variant: 'outline',
                  }}
                />
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<BookOpen className="w-16 h-16 text-slate-300" />}
            title="No Lesson Planned"
            description="Plan what you're teaching today to stay organized"
            action={{
              label: "Plan Today's Lesson",
              onClick: () => setShowLessonModal(true),
            }}
          />
        )}
      </Card>

      {/* Lesson Plan Modal */}
      <Modal
        isOpen={showLessonModal}
        onClose={() => setShowLessonModal(false)}
        title={lessonPlan ? 'Edit Today\'s Lesson' : 'Plan Today\'s Lesson'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowLessonModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveLesson} loading={saving}>
              Save Lesson Plan
            </Button>
          </div>
        }
      >
        <form className="space-y-6">
          <FormField label="Course Name" required>
            <Input
              type="text"
              value={newLesson.courseName}
              onChange={(e) => setNewLesson({ ...newLesson, courseName: e.target.value })}
              placeholder="e.g., Fundamentals of Nursing"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Chapter/Unit">
              <Input
                type="text"
                value={newLesson.chapter}
                onChange={(e) => setNewLesson({ ...newLesson, chapter: e.target.value })}
                placeholder="e.g., Chapter 12"
              />
            </FormField>
            <FormField label="Topic" required>
              <Input
                type="text"
                value={newLesson.topic}
                onChange={(e) => setNewLesson({ ...newLesson, topic: e.target.value })}
                placeholder="e.g., Medication Administration"
              />
            </FormField>
          </div>

          <FormField label="Teaching Notes">
            <Textarea
              value={newLesson.notes}
              onChange={(e) => setNewLesson({ ...newLesson, notes: e.target.value })}
              rows={3}
              placeholder="Key points to cover, demonstrations to show..."
            />
          </FormField>

          <FormField label="Notes from Last Time (Reference)">
            <Textarea
              value={newLesson.lastTaughtNotes}
              onChange={(e) => setNewLesson({ ...newLesson, lastTaughtNotes: e.target.value })}
              rows={3}
              placeholder="What worked, what to improve, student questions..."
            />
          </FormField>
        </form>
      </Modal>

      {/* Add Material Modal */}
      <Modal
        isOpen={showMaterialModal}
        onClose={() => setShowMaterialModal(false)}
        title="Add Teaching Material"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowMaterialModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddMaterial} loading={saving}>
              Add Material
            </Button>
          </div>
        }
      >
        <form className="space-y-6">
          <FormField label="Material Type" required>
            <select
              value={newMaterial.materialType}
              onChange={(e) => setNewMaterial({ ...newMaterial, materialType: e.target.value as TeachingMaterial['materialType'] })}
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all"
            >
              <option value="powerpoint">PowerPoint</option>
              <option value="worksheet">Worksheet</option>
              <option value="video">Video (YouTube)</option>
              <option value="ati">ATI Resource</option>
              <option value="pdf">PDF Document</option>
              <option value="link">Other Link</option>
            </select>
          </FormField>

          <FormField label="Title" required>
            <Input
              type="text"
              value={newMaterial.title}
              onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
              placeholder="e.g., Med Admin Slides"
            />
          </FormField>

          <FormField label="URL" required>
            <Input
              type="url"
              value={newMaterial.url}
              onChange={(e) => setNewMaterial({ ...newMaterial, url: e.target.value })}
              placeholder="https://drive.google.com/..."
            />
          </FormField>

          <FormField label="Description (Optional)">
            <Input
              type="text"
              value={newMaterial.description}
              onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
              placeholder="Brief description..."
            />
          </FormField>
        </form>
      </Modal>
    </>
  );
}
