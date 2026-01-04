import { useState, useEffect } from 'react';
import { seedModules, seedStandards, seedVBONRegulations as vbonSeedData } from '@/lib/data';
import { Link as LinkIcon, Edit2, BookOpen, Plus, Trash2, ExternalLink, GraduationCap, FileText, Shield, Check, AlertTriangle, X, Download, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import { FormField, Input, Textarea, Select } from '@/components/FormField';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  getAllCourses, addCourse, updateCourse, deleteCourse,
  getVBONRegulationsWithMappings, seedVBONRegulations, upsertVBONMapping, getVBONComplianceSummary,
  getAllLessonPlans
} from '@/lib/db';
import type { Course, VBONRegulationWithMapping, VBONMapping, VBONComplianceSummary, LessonPlan } from '@/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/Tabs';
import { Progress } from '@/components/Progress';
import jsPDF from 'jspdf';
import { generateText } from '@/lib/ai';

export default function CurriculumPage() {
  const [activeTab, setActiveTab] = useState('courses');
  const [modules, setModules] = useState(seedModules);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // VBON State
  const [vbonRegulations, setVbonRegulations] = useState<VBONRegulationWithMapping[]>([]);
  const [vbonSummary, setVbonSummary] = useState<VBONComplianceSummary | null>(null);
  const [vbonLoading, setVbonLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Curriculum Content']));
  const [selectedRegulation, setSelectedRegulation] = useState<VBONRegulationWithMapping | null>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [mappingForm, setMappingForm] = useState<Partial<VBONMapping>>({
    syllabusReference: '',
    lessonPlanIds: '',
    materialLinks: '',
    assessmentMethod: '',
    clinicalExperience: '',
    notes: '',
    coverageStatus: 'not_covered'
  });
  const [aiMappingSuggesting, setAiMappingSuggesting] = useState(false);

  // Module edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    week: 1,
    title: '',
    description: '',
    mappedNclexCategories: [] as string[]
  });

  // Course state
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const emptyCourseForm: Course = {
    id: '',
    code: '',
    name: '',
    description: '',
    syllabusUrl: '',
    contentOutlineUrl: '',
    clinicalManualUrl: '',
    semester: '',
    year: new Date().getFullYear(),
    isActive: 1,
    createdAt: '',
    updatedAt: ''
  };
  const [courseForm, setCourseForm] = useState<Course>(emptyCourseForm);

  const toast = useToast();

  useEffect(() => {
    loadCourses();
    loadVBONData();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await getAllCourses();
      setCourses(data);
    } catch (error) {
      console.error('Failed to load courses:', error);
      toast.error('Error', 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const loadVBONData = async () => {
    try {
      setVbonLoading(true);

      // Seed VBON regulations if not present
      await seedVBONRegulations(vbonSeedData);

      // Load regulations with mappings
      const regs = await getVBONRegulationsWithMappings();
      setVbonRegulations(regs);

      // Load summary
      const summary = await getVBONComplianceSummary();
      setVbonSummary(summary);

      // Load lesson plans for mapping
      const plans = await getAllLessonPlans();
      setLessonPlans(plans);
    } catch (error) {
      console.error('Failed to load VBON data:', error);
      toast.error('Error', 'Failed to load VBON compliance data');
    } finally {
      setVbonLoading(false);
    }
  };

  // Module handlers
  const handleEditModule = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (module) {
      setEditForm({
        id: module.id,
        week: module.week,
        title: module.title,
        description: module.description,
        mappedNclexCategories: [...module.mappedNclexCategories]
      });
      setShowEditModal(true);
    }
  };

  const handleSaveModule = () => {
    if (!editForm.title || !editForm.description) {
      toast.error('Missing Information', 'Please fill in all required fields');
      return;
    }

    setModules(modules.map(m =>
      m.id === editForm.id
        ? { ...m, ...editForm }
        : m
    ));
    toast.success('Module Updated', 'Curriculum module has been updated');
    setShowEditModal(false);
  };

  // Course handlers
  const handleAddCourse = () => {
    setCourseForm({
      ...emptyCourseForm,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setIsEditingCourse(false);
    setShowCourseModal(true);
  };

  const handleEditCourse = (course: Course) => {
    setCourseForm(course);
    setIsEditingCourse(true);
    setShowCourseModal(true);
  };

  const handleDeleteCourse = (course: Course) => {
    setSelectedCourse(course);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteCourse = async () => {
    if (!selectedCourse) return;
    try {
      await deleteCourse(selectedCourse.id);
      toast.success('Deleted', 'Course has been deleted');
      loadCourses();
    } catch (error) {
      toast.error('Error', 'Failed to delete course');
    } finally {
      setShowDeleteConfirm(false);
      setSelectedCourse(null);
    }
  };

  const handleSaveCourse = async () => {
    if (!courseForm.code || !courseForm.name) {
      toast.error('Missing Fields', 'Course code and name are required');
      return;
    }

    try {
      const updatedForm = {
        ...courseForm,
        updatedAt: new Date().toISOString()
      };

      if (isEditingCourse) {
        await updateCourse(updatedForm);
        toast.success('Updated', 'Course has been updated');
      } else {
        await addCourse(updatedForm);
        toast.success('Created', 'Course has been created');
      }
      loadCourses();
      setShowCourseModal(false);
    } catch (error) {
      toast.error('Error', 'Failed to save course');
    }
  };

  // VBON handlers
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleEditMapping = (reg: VBONRegulationWithMapping) => {
    setSelectedRegulation(reg);
    if (reg.mapping) {
      setMappingForm({
        id: reg.mapping.id,
        regulationId: reg.id,
        syllabusReference: reg.mapping.syllabusReference || '',
        lessonPlanIds: reg.mapping.lessonPlanIds || '',
        materialLinks: reg.mapping.materialLinks || '',
        assessmentMethod: reg.mapping.assessmentMethod || '',
        clinicalExperience: reg.mapping.clinicalExperience || '',
        notes: reg.mapping.notes || '',
        coverageStatus: reg.mapping.coverageStatus,
        lastReviewedDate: reg.mapping.lastReviewedDate,
        reviewedBy: reg.mapping.reviewedBy
      });
    } else {
      setMappingForm({
        id: crypto.randomUUID(),
        regulationId: reg.id,
        syllabusReference: '',
        lessonPlanIds: '',
        materialLinks: '',
        assessmentMethod: '',
        clinicalExperience: '',
        notes: '',
        coverageStatus: 'not_covered'
      });
    }
    setShowMappingModal(true);
  };

  const handleSaveMapping = async () => {
    if (!selectedRegulation) return;

    try {
      const mapping: VBONMapping = {
        id: mappingForm.id || crypto.randomUUID(),
        regulationId: selectedRegulation.id,
        syllabusReference: mappingForm.syllabusReference || undefined,
        lessonPlanIds: mappingForm.lessonPlanIds || undefined,
        materialLinks: mappingForm.materialLinks || undefined,
        assessmentMethod: mappingForm.assessmentMethod || undefined,
        clinicalExperience: mappingForm.clinicalExperience || undefined,
        notes: mappingForm.notes || undefined,
        coverageStatus: mappingForm.coverageStatus as 'not_covered' | 'partial' | 'covered',
        lastReviewedDate: new Date().toISOString(),
        reviewedBy: 'Instructor',
        createdAt: mappingForm.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await upsertVBONMapping(mapping);
      toast.success('Saved', 'Compliance mapping has been updated');
      setShowMappingModal(false);
      loadVBONData();
    } catch (error) {
      console.error('Failed to save mapping:', error);
      toast.error('Error', 'Failed to save compliance mapping');
    }
  };

  // AI-powered mapping suggestions
  const handleAIMapSuggestions = async () => {
    if (!selectedRegulation) return;

    setAiMappingSuggesting(true);

    try {
      // Build lesson plan context
      const lessonPlanContext = lessonPlans.length > 0
        ? lessonPlans.map(lp => `- ID:${lp.id} | ${lp.courseName} Week ${lp.weekNumber || '?'}: "${lp.topic}"${lp.chapter ? ` (${lp.chapter})` : ''}`).join('\n')
        : 'No lesson plans available';

      const prompt = `You are a nursing curriculum specialist. Analyze this VBON regulation requirement and suggest how it might be covered in the curriculum.

VBON REGULATION:
Code: ${selectedRegulation.code}
Title: ${selectedRegulation.title}
Description: ${selectedRegulation.description}
Category: ${selectedRegulation.category}

AVAILABLE LESSON PLANS:
${lessonPlanContext}

Based on the regulation and available lesson plans, provide suggestions in this exact JSON format:
{
  "coverageStatus": "covered" or "partial" or "not_covered",
  "matchingLessonPlanIds": ["id1", "id2"],
  "suggestedAssessment": "Suggested assessment method",
  "suggestedMaterials": "Suggested teaching materials",
  "suggestedClinical": "Suggested clinical experience if applicable",
  "notes": "Brief explanation of your recommendations"
}

Only output valid JSON. If no lesson plans match, set matchingLessonPlanIds to empty array and coverageStatus to "not_covered".`;

      const response = await generateText({ prompt });

      // Parse response
      try {
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const suggestions = JSON.parse(cleanResponse);

        // Apply suggestions to form
        setMappingForm(prev => ({
          ...prev,
          coverageStatus: suggestions.coverageStatus || prev.coverageStatus,
          lessonPlanIds: Array.isArray(suggestions.matchingLessonPlanIds)
            ? suggestions.matchingLessonPlanIds.join(',')
            : prev.lessonPlanIds,
          assessmentMethod: suggestions.suggestedAssessment || prev.assessmentMethod,
          materialLinks: suggestions.suggestedMaterials || prev.materialLinks,
          clinicalExperience: suggestions.suggestedClinical || prev.clinicalExperience,
          notes: suggestions.notes
            ? (prev.notes ? `${prev.notes}\n\nAI Suggestions: ${suggestions.notes}` : `AI Suggestions: ${suggestions.notes}`)
            : prev.notes
        }));

        toast.success('AI Suggestions Applied', 'Review and adjust the suggestions as needed');
      } catch {
        toast.error('Parse Error', 'Could not parse AI suggestions. Please try again.');
      }
    } catch (error) {
      console.error('AI mapping failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('API key')) {
        toast.error('API Key Required', 'Please configure your AI API key in Settings');
      } else {
        toast.error('AI Suggestions Failed', 'Could not generate suggestions. Please map manually.');
      }
    } finally {
      setAiMappingSuggesting(false);
    }
  };

  const getCoverageIcon = (status: string) => {
    switch (status) {
      case 'covered':
        return <Check className="w-5 h-5 text-green-600" />;
      case 'partial':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <X className="w-5 h-5 text-red-500" />;
    }
  };

  const getCoverageLabel = (status: string) => {
    switch (status) {
      case 'covered':
        return <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">Covered</span>;
      case 'partial':
        return <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded">Partial</span>;
      default:
        return <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">Missing</span>;
    }
  };

  // Group regulations by category
  const regulationsByCategory = vbonRegulations.reduce((acc, reg) => {
    if (!acc[reg.category]) {
      acc[reg.category] = [];
    }
    acc[reg.category].push(reg);
    return acc;
  }, {} as Record<string, VBONRegulationWithMapping[]>);

  // Export VBON Audit Report
  const exportVBONAuditReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('VBON Curriculum Compliance Report', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 20;

    // Summary
    if (vbonSummary) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Compliance Summary', 14, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Regulations: ${vbonSummary.totalRegulations}`, 14, yPos);
      yPos += 6;
      doc.text(`Fully Covered: ${vbonSummary.coveredCount}`, 14, yPos);
      yPos += 6;
      doc.text(`Partially Covered: ${vbonSummary.partialCount}`, 14, yPos);
      yPos += 6;
      doc.text(`Not Covered: ${vbonSummary.notCoveredCount}`, 14, yPos);
      yPos += 6;
      doc.text(`Overall Completion: ${vbonSummary.percentageComplete.toFixed(1)}%`, 14, yPos);
      yPos += 15;
    }

    // Regulations by Category
    Object.entries(regulationsByCategory).forEach(([category, regs]) => {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(category, 14, yPos);
      yPos += 8;

      regs.forEach(reg => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        const status = reg.mapping?.coverageStatus || 'not_covered';
        const statusSymbol = status === 'covered' ? '[✓]' : status === 'partial' ? '[~]' : '[✗]';

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${statusSymbol} ${reg.code}: ${reg.title}`, 20, yPos);
        yPos += 5;

        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(reg.description, pageWidth - 40);
        doc.text(descLines, 24, yPos);
        yPos += descLines.length * 4 + 2;

        if (reg.mapping) {
          if (reg.mapping.syllabusReference) {
            doc.text(`Syllabus: ${reg.mapping.syllabusReference}`, 24, yPos);
            yPos += 4;
          }
          if (reg.mapping.assessmentMethod) {
            doc.text(`Assessment: ${reg.mapping.assessmentMethod}`, 24, yPos);
            yPos += 4;
          }
          if (reg.mapping.clinicalExperience) {
            doc.text(`Clinical: ${reg.mapping.clinicalExperience}`, 24, yPos);
            yPos += 4;
          }
        }
        yPos += 4;
      });
      yPos += 5;
    });

    doc.save('vbon-compliance-report.pdf');
    toast.success('Exported', 'VBON Audit Report has been downloaded');
  };

  return (
    <div className="min-h-screen">
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 bg-linear-to-br from-teal-600 to-cyan-600 rounded-2xl shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black bg-linear-to-r from-gray-900 via-teal-900 to-cyan-900 bg-clip-text text-transparent mb-1">
              Curriculum Management
            </h1>
            <p className="text-gray-600 text-lg font-medium">Manage courses, modules, and VBON compliance</p>
          </div>
        </div>
      </header>

      <Tabs defaultValue="courses" value={activeTab} onValueChange={setActiveTab}>
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-1 mb-6 inline-flex">
          <TabsList>
            <TabsTrigger value="courses">
              <BookOpen className="w-4 h-4 mr-2" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="modules">
              <FileText className="w-4 h-4 mr-2" />
              NCLEX Alignment
            </TabsTrigger>
            <TabsTrigger value="vbon">
              <Shield className="w-4 h-4 mr-2" />
              VBON Compliance
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Courses Tab */}
        <TabsContent value="courses">
          <div className="flex justify-end mb-4">
            <button onClick={handleAddCourse} className="btn btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Course
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          ) : courses.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Courses Configured</h3>
              <p className="text-gray-500 mb-4">Add your first course to get started with curriculum management.</p>
              <button onClick={handleAddCourse} className="btn btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Course
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courses.map(course => (
                <div key={course.id} className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded inline-block mb-2">
                        {course.code}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">{course.name}</h3>
                      {course.semester && course.year && (
                        <p className="text-sm text-gray-500">{course.semester} {course.year}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditCourse(course)}
                        className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {course.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                  )}

                  <div className="border-t pt-4 space-y-2">
                    {course.syllabusUrl && (
                      <a
                        href={course.syllabusUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-800"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Syllabus
                      </a>
                    )}
                    {course.contentOutlineUrl && (
                      <a
                        href={course.contentOutlineUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-800"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Content Outline
                      </a>
                    )}
                    {course.clinicalManualUrl && (
                      <a
                        href={course.clinicalManualUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-800"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Clinical Manual
                      </a>
                    )}
                    {!course.syllabusUrl && !course.contentOutlineUrl && !course.clinicalManualUrl && (
                      <p className="text-xs text-gray-400 italic">No documents linked</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* NCLEX Alignment Tab */}
        <TabsContent value="modules">
          <div className="space-y-6">
            {modules.map((module) => (
              <div key={module.id} className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-xs font-bold text-[#0f4c75] bg-blue-50 px-2 py-1 rounded inline-block mb-2">
                      Week {module.week}
                    </div>
                    <h2 className="text-xl font-bold text-[#2d3436]">{module.title}</h2>
                    <p className="text-gray-600 mt-1">{module.description}</p>
                  </div>
                  <button
                    onClick={() => handleEditModule(module.id)}
                    className="btn btn-outline text-xs flex items-center gap-2"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit Alignment
                  </button>
                </div>

                <div className="border-t pt-4 mt-2">
                   <h3 className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2 mb-3">
                     <LinkIcon className="w-3 h-3" />
                     Mapped Standards
                   </h3>
                   <div className="grid gap-2">
                     {module.mappedNclexCategories.length > 0 ? (
                       module.mappedNclexCategories.map(catId => {
                         const standard = seedStandards.find(s => s.id === catId);
                         return (
                           <div key={catId} className="flex gap-3 items-center text-sm p-2 bg-gray-50 rounded border border-gray-100">
                              <span className="font-mono text-xs bg-white border px-1 rounded text-gray-500">{standard?.code}</span>
                              <span className="text-gray-700">{standard?.description}</span>
                           </div>
                         );
                       })
                     ) : (
                       <div className="text-sm text-gray-400 italic p-2">No standards mapped yet</div>
                     )}
                   </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* VBON Compliance Tab */}
        <TabsContent value="vbon">
          {vbonLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Compliance Dashboard */}
              {vbonSummary && (
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-teal-600" />
                        VBON Compliance Dashboard
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Virginia Board of Nursing (18VAC90-27) Requirements
                      </p>
                    </div>
                    <button
                      onClick={exportVBONAuditReport}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export Audit Report
                    </button>
                  </div>

                  {/* Progress Overview */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Overall Compliance</span>
                      <span className="text-lg font-bold text-teal-600">{vbonSummary.percentageComplete.toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={vbonSummary.percentageComplete}
                      max={100}
                      className="h-4"
                      indicatorClassName={
                        vbonSummary.percentageComplete >= 90 ? 'bg-green-500' :
                        vbonSummary.percentageComplete >= 70 ? 'bg-amber-500' :
                        'bg-red-500'
                      }
                    />
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-gray-900">{vbonSummary.totalRegulations}</div>
                      <div className="text-xs text-gray-500 uppercase font-semibold">Total Requirements</div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{vbonSummary.coveredCount}</div>
                      <div className="text-xs text-green-600 uppercase font-semibold flex items-center justify-center gap-1">
                        <Check className="w-3 h-3" />
                        Covered
                      </div>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-amber-600">{vbonSummary.partialCount}</div>
                      <div className="text-xs text-amber-600 uppercase font-semibold flex items-center justify-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Partial
                      </div>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">{vbonSummary.notCoveredCount}</div>
                      <div className="text-xs text-red-600 uppercase font-semibold flex items-center justify-center gap-1">
                        <X className="w-3 h-3" />
                        Missing
                      </div>
                    </div>
                  </div>

                  {/* Category Breakdown */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Compliance by Category</h3>
                    <div className="space-y-2">
                      {vbonSummary.regulationsByCategory.map(cat => {
                        const percentage = cat.total > 0 ? ((cat.covered * 100 + cat.partial * 50) / cat.total) : 0;
                        return (
                          <div key={cat.category} className="flex items-center gap-3">
                            <span className="text-sm text-gray-700 w-40 truncate">{cat.category}</span>
                            <div className="flex-1">
                              <Progress
                                value={percentage}
                                max={100}
                                className="h-2"
                                indicatorClassName={
                                  percentage >= 90 ? 'bg-green-500' :
                                  percentage >= 70 ? 'bg-amber-500' :
                                  'bg-red-500'
                                }
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-500 w-12 text-right">{percentage.toFixed(0)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Regulations List by Category */}
              <div className="space-y-4">
                {Object.entries(regulationsByCategory).map(([category, regs]) => {
                  const isExpanded = expandedCategories.has(category);
                  const categoryStats = vbonSummary?.regulationsByCategory.find(c => c.category === category);

                  return (
                    <div key={category} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                          <h3 className="text-lg font-bold text-gray-900">{category}</h3>
                          <span className="text-sm text-gray-500">({regs.length} requirements)</span>
                        </div>
                        {categoryStats && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-green-600">{categoryStats.covered} ✓</span>
                            <span className="text-xs font-medium text-amber-600">{categoryStats.partial} ~</span>
                            <span className="text-xs font-medium text-red-600">{categoryStats.notCovered} ✗</span>
                          </div>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t divide-y">
                          {regs.map(reg => {
                            const status = reg.mapping?.coverageStatus || 'not_covered';
                            return (
                              <div
                                key={reg.id}
                                className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                onClick={() => handleEditMapping(reg)}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-start gap-3 flex-1">
                                    {getCoverageIcon(status)}
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-sm font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                                          {reg.code}
                                        </span>
                                        <span className="font-semibold text-gray-900">{reg.title}</span>
                                      </div>
                                      <p className="text-sm text-gray-600">{reg.description}</p>

                                      {reg.mapping && (
                                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                          {reg.mapping.syllabusReference && (
                                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                                              Syllabus: {reg.mapping.syllabusReference}
                                            </span>
                                          )}
                                          {reg.mapping.assessmentMethod && (
                                            <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                                              Assessment: {reg.mapping.assessmentMethod}
                                            </span>
                                          )}
                                          {reg.mapping.clinicalExperience && (
                                            <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded">
                                              Clinical
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {getCoverageLabel(status)}
                                    <Edit2 className="w-4 h-4 text-gray-400" />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Module Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Curriculum Module"
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveModule}
              disabled={!editForm.title || !editForm.description}
              className="btn btn-primary px-8 shadow-md whitespace-nowrap disabled:opacity-50"
            >
              Save Changes
            </button>
          </div>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSaveModule(); }} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Week" required>
              <Input
                type="number"
                min="1"
                max="52"
                value={editForm.week}
                onChange={(e) => setEditForm({ ...editForm, week: parseInt(e.target.value) || 1 })}
                required
              />
            </FormField>
          </div>

          <FormField label="Module Title" required>
            <Input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              placeholder="e.g. Foundations of Nursing Practice"
              required
            />
          </FormField>

          <FormField label="Description" required>
            <Textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={4}
              placeholder="Module description and learning objectives..."
              required
            />
          </FormField>

          <FormField label="Mapped NCLEX Standards">
            <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {seedStandards.map(standard => (
                <label key={standard.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.mappedNclexCategories.includes(standard.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEditForm({
                          ...editForm,
                          mappedNclexCategories: [...editForm.mappedNclexCategories, standard.id]
                        });
                      } else {
                        setEditForm({
                          ...editForm,
                          mappedNclexCategories: editForm.mappedNclexCategories.filter(id => id !== standard.id)
                        });
                      }
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{standard.code}</div>
                    <div className="text-xs text-gray-500">{standard.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </FormField>
        </form>
      </Modal>

      {/* Course Modal */}
      <Modal
        isOpen={showCourseModal}
        onClose={() => setShowCourseModal(false)}
        title={isEditingCourse ? 'Edit Course' : 'Add Course'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowCourseModal(false)}
              className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCourse}
              disabled={!courseForm.code || !courseForm.name}
              className="btn btn-primary disabled:opacity-50"
            >
              {isEditingCourse ? 'Save Changes' : 'Create Course'}
            </button>
          </div>
        }
      >
        <form onSubmit={e => { e.preventDefault(); handleSaveCourse(); }} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Course Code" required>
              <Input
                type="text"
                value={courseForm.code}
                onChange={e => setCourseForm({ ...courseForm, code: e.target.value })}
                placeholder="e.g., NUR 101"
                required
              />
            </FormField>
            <FormField label="Semester">
              <Select
                value={courseForm.semester || ''}
                onChange={e => setCourseForm({ ...courseForm, semester: e.target.value })}
              >
                <option value="">Select Semester</option>
                <option value="Fall">Fall</option>
                <option value="Spring">Spring</option>
                <option value="Summer">Summer</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Course Name" required>
            <Input
              type="text"
              value={courseForm.name}
              onChange={e => setCourseForm({ ...courseForm, name: e.target.value })}
              placeholder="e.g., Fundamentals of Nursing"
              required
            />
          </FormField>

          <FormField label="Description">
            <Textarea
              value={courseForm.description || ''}
              onChange={e => setCourseForm({ ...courseForm, description: e.target.value })}
              rows={3}
              placeholder="Course description..."
            />
          </FormField>

          <div className="border-t pt-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Document Links</h3>
            <div className="space-y-4">
              <FormField label="Syllabus URL">
                <Input
                  type="url"
                  value={courseForm.syllabusUrl || ''}
                  onChange={e => setCourseForm({ ...courseForm, syllabusUrl: e.target.value })}
                  placeholder="https://drive.google.com/..."
                />
              </FormField>
              <FormField label="Content Outline URL">
                <Input
                  type="url"
                  value={courseForm.contentOutlineUrl || ''}
                  onChange={e => setCourseForm({ ...courseForm, contentOutlineUrl: e.target.value })}
                  placeholder="https://drive.google.com/..."
                />
              </FormField>
              <FormField label="Clinical Manual URL">
                <Input
                  type="url"
                  value={courseForm.clinicalManualUrl || ''}
                  onChange={e => setCourseForm({ ...courseForm, clinicalManualUrl: e.target.value })}
                  placeholder="https://drive.google.com/..."
                />
              </FormField>
            </div>
          </div>
        </form>
      </Modal>

      {/* VBON Mapping Modal */}
      <Modal
        isOpen={showMappingModal}
        onClose={() => setShowMappingModal(false)}
        title={`Map Compliance: ${selectedRegulation?.code}`}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowMappingModal(false)}
              className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveMapping}
              className="btn btn-primary"
            >
              Save Mapping
            </button>
          </div>
        }
      >
        {selectedRegulation && (
          <div className="space-y-6">
            {/* Regulation Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-sm font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                      {selectedRegulation.code}
                    </span>
                    <span className="font-semibold text-gray-900">{selectedRegulation.title}</span>
                  </div>
                  <p className="text-sm text-gray-600">{selectedRegulation.description}</p>
                  <p className="text-xs text-gray-400 mt-2">Section: {selectedRegulation.section}</p>
                </div>
                <button
                  onClick={handleAIMapSuggestions}
                  disabled={aiMappingSuggesting}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shrink-0 ml-4"
                  title="Get AI suggestions for mapping this regulation"
                >
                  {aiMappingSuggesting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      AI Suggest
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Coverage Status */}
            <FormField label="Coverage Status" required>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="coverageStatus"
                    value="covered"
                    checked={mappingForm.coverageStatus === 'covered'}
                    onChange={() => setMappingForm({ ...mappingForm, coverageStatus: 'covered' })}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="flex items-center gap-1 text-green-600">
                    <Check className="w-4 h-4" /> Covered
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="coverageStatus"
                    value="partial"
                    checked={mappingForm.coverageStatus === 'partial'}
                    onChange={() => setMappingForm({ ...mappingForm, coverageStatus: 'partial' })}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="w-4 h-4" /> Partial
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="coverageStatus"
                    value="not_covered"
                    checked={mappingForm.coverageStatus === 'not_covered'}
                    onChange={() => setMappingForm({ ...mappingForm, coverageStatus: 'not_covered' })}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span className="flex items-center gap-1 text-red-600">
                    <X className="w-4 h-4" /> Not Covered
                  </span>
                </label>
              </div>
            </FormField>

            {/* Where Covered Fields */}
            <FormField label="Syllabus Reference" hint="e.g., Page 12, Section 3.2">
              <Input
                type="text"
                value={mappingForm.syllabusReference || ''}
                onChange={e => setMappingForm({ ...mappingForm, syllabusReference: e.target.value })}
                placeholder="Page number or section reference"
              />
            </FormField>

            <FormField label="Linked Lesson Plans" hint="Select lessons that cover this requirement">
              {lessonPlans.length > 0 ? (
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                  {lessonPlans.map(plan => {
                    const selectedIds = (mappingForm.lessonPlanIds || '').split(',').filter(Boolean);
                    const isSelected = selectedIds.includes(plan.id);
                    return (
                      <label key={plan.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newIds = e.target.checked
                              ? [...selectedIds, plan.id]
                              : selectedIds.filter(id => id !== plan.id);
                            setMappingForm({ ...mappingForm, lessonPlanIds: newIds.join(',') });
                          }}
                          className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {plan.topic}
                          </div>
                          <div className="text-xs text-gray-500">
                            {plan.courseName} • Week {plan.weekNumber || '—'}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic p-2">No lesson plans created yet</p>
              )}
            </FormField>

            <FormField label="Teaching Materials" hint="PowerPoint, videos, or other resources">
              <Textarea
                value={mappingForm.materialLinks || ''}
                onChange={e => setMappingForm({ ...mappingForm, materialLinks: e.target.value })}
                rows={2}
                placeholder="e.g., Med Admin PPT (slides 15-30), ATI Module 4"
              />
            </FormField>

            <FormField label="Assessment Method" hint="How students are tested on this">
              <Input
                type="text"
                value={mappingForm.assessmentMethod || ''}
                onChange={e => setMappingForm({ ...mappingForm, assessmentMethod: e.target.value })}
                placeholder="e.g., Unit 3 Exam, Skills Check-off, Clinical Eval"
              />
            </FormField>

            <FormField label="Clinical Experience" hint="Clinical sites and hours">
              <Textarea
                value={mappingForm.clinicalExperience || ''}
                onChange={e => setMappingForm({ ...mappingForm, clinicalExperience: e.target.value })}
                rows={2}
                placeholder="e.g., Med-Surg rotation at Memorial Hospital (40 hours)"
              />
            </FormField>

            <FormField label="Notes">
              <Textarea
                value={mappingForm.notes || ''}
                onChange={e => setMappingForm({ ...mappingForm, notes: e.target.value })}
                rows={2}
                placeholder="Additional notes or documentation..."
              />
            </FormField>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteCourse}
        title="Delete Course"
        message={`Are you sure you want to delete "${selectedCourse?.code} - ${selectedCourse?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
