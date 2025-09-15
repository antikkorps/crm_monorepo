import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createI18n } from 'vue-i18n'
import { createRouter, createWebHistory } from 'vue-router'
import SegmentationView from '@/views/segmentation/SegmentationView.vue'
import { SegmentType, SegmentVisibility } from '@medical-crm/shared'
import type { Segment } from '@medical-crm/shared'

// Mock the composable
vi.mock('@/composables/useSegmentation', () => ({
  useSegmentation: () => ({
    segments: { value: mockSegments },
    loading: { value: false },
    error: { value: null },
    loadSegments: vi.fn(),
    createSegment: vi.fn(),
    updateSegment: vi.fn(),
    deleteSegment: vi.fn(),
    duplicateSegment: vi.fn(),
    shareSegment: vi.fn(),
    clearError: vi.fn()
  })
}))

// Mock child components
vi.mock('@/components/layout/AppLayout.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'AppLayout',
      template: '<div><slot /></div>'
    })
  }
})

vi.mock('@/components/segmentation/SavedSegmentsManager.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'SavedSegmentsManager',
      template: '<div data-testid="saved-segments-manager"></div>',
      props: ['segments', 'loading'],
      emits: ['view', 'edit', 'duplicate', 'share', 'delete', 'create-new']
    })
  }
})

vi.mock('@/components/segmentation/SegmentBuilder.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'SegmentBuilder',
      template: '<div data-testid="segment-builder"></div>',
      props: ['modelValue', 'initialType', 'initialName'],
      emits: ['save', 'cancel']
    })
  }
})

vi.mock('@/components/segmentation/SegmentAnalyticsDashboard.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'SegmentAnalyticsDashboard',
      template: '<div data-testid="segment-analytics"></div>',
      props: ['segmentId']
    })
  }
})

vi.mock('@/components/segmentation/SegmentComparisonTool.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'SegmentComparisonTool',
      template: '<div data-testid="segment-comparison"></div>',
      props: ['segments'],
      emits: ['segments-selected']
    })
  }
})

vi.mock('@/components/segmentation/BulkActionsDialog.vue', async () => {
  const { defineComponent } = await import('vue')
  return {
    default: defineComponent({
      name: 'BulkActionsDialog',
      template: '<div data-testid="bulk-actions-dialog"></div>',
      props: ['segment'],
      emits: ['close', 'action-completed']
    })
  }
})

const mockSegments: Segment[] = [
  {
    id: '1',
    name: 'Test Segment 1',
    type: SegmentType.INSTITUTION,
    criteria: {},
    description: 'Test description 1',
    visibility: SegmentVisibility.PRIVATE,
    ownerId: 'user1',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Test Segment 2',
    type: SegmentType.CONTACT,
    criteria: {},
    description: 'Test description 2',
    visibility: SegmentVisibility.PUBLIC,
    ownerId: 'user2',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

const mockI18nMessages = {
  en: {
    'segmentation.title': 'Segmentation',
    'segmentation.createSegment': 'Create Segment',
    'segmentation.tabs.list': 'List',
    'segmentation.tabs.builder': 'Builder',
    'segmentation.tabs.analytics': 'Analytics',
    'segmentation.tabs.comparison': 'Comparison',
    'segmentation.builder.empty.title': 'No segment selected',
    'segmentation.builder.empty.message': 'Create a new segment to get started',
    'segmentation.builder.createNew': 'Create New Segment',
    'segmentation.confirmDelete': 'Delete {name}?'
  }
}

describe('SegmentationView', () => {
  let wrapper: VueWrapper<any>
  let vuetify: any
  let i18n: any
  let router: any

  beforeEach(async () => {
    vuetify = createVuetify()
    i18n = createI18n({
      legacy: false,
      locale: 'en',
      messages: mockI18nMessages
    })
    
    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/segmentation', component: SegmentationView }
      ]
    })
    
    wrapper = mount(SegmentationView, {
      global: {
        plugins: [vuetify, i18n, router]
      }
    })
    
    await router.push('/segmentation')
    await wrapper.vm.$nextTick()
  })

  it('should render correctly', () => {
    expect(wrapper.find('.segmentation-view').exists()).toBe(true)
    expect(wrapper.find('[data-testid="saved-segments-manager"]').exists()).toBe(true)
  })

  it('should display correct title', () => {
    expect(wrapper.text()).toContain('Segmentation')
  })

  it('should show create segment button', () => {
    const createButton = wrapper.find('button')
    expect(createButton.exists()).toBe(true)
    expect(createButton.text()).toContain('Create Segment')
  })

  it('should display tabs correctly', () => {
    const tabs = wrapper.findAll('.v-tab')
    expect(tabs).toHaveLength(4)
    expect(tabs[0].text()).toContain('List')
    expect(tabs[1].text()).toContain('Builder')
    expect(tabs[2].text()).toContain('Analytics')
    expect(tabs[3].text()).toContain('Comparison')
  })

  it('should start with list tab active', () => {
    expect(wrapper.vm.activeTab).toBe('list')
  })

  it('should show saved segments manager in list tab', () => {
    expect(wrapper.find('[data-testid="saved-segments-manager"]').exists()).toBe(true)
  })

  it('should switch to builder tab when creating segment', async () => {
    await wrapper.vm.startCreateSegment()
    
    expect(wrapper.vm.activeTab).toBe('builder')
    expect(wrapper.vm.showCreateDialog).toBe(true)
    expect(wrapper.vm.editingSegment).toBeNull()
  })

  it('should switch to analytics tab when viewing segment', async () => {
    const segment = mockSegments[0]
    await wrapper.vm.viewSegment(segment)
    
    expect(wrapper.vm.activeTab).toBe('analytics')
    expect(wrapper.vm.selectedSegment).toBe(segment)
  })

  it('should show builder when editing segment', async () => {
    const segment = mockSegments[0]
    await wrapper.vm.editSegment(segment)
    
    expect(wrapper.vm.showCreateDialog).toBe(true)
    expect(wrapper.vm.editingSegment).toBe(segment)
  })

  it('should show empty state in builder when no dialog', async () => {
    wrapper.vm.activeTab = 'builder'
    wrapper.vm.showCreateDialog = false
    await wrapper.vm.$nextTick()
    
    expect(wrapper.text()).toContain('No segment selected')
    expect(wrapper.text()).toContain('Create a new segment to get started')
  })

  it('should show segment builder when dialog is open', async () => {
    wrapper.vm.activeTab = 'builder'
    wrapper.vm.showCreateDialog = true
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('[data-testid="segment-builder"]').exists()).toBe(true)
  })

  it('should show segment builder when editing', async () => {
    const segment = mockSegments[0]
    wrapper.vm.editingSegment = segment
    wrapper.vm.showCreateDialog = true
    wrapper.vm.activeTab = 'builder'
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="segment-builder"]').exists()).toBe(true)
  })

  it('should show analytics dashboard with selected segment', async () => {
    const segment = mockSegments[0]
    wrapper.vm.selectedSegment = segment
    wrapper.vm.activeTab = 'analytics'
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="segment-analytics"]').exists()).toBe(true)
  })

  it('should show comparison tool with segments', async () => {
    wrapper.vm.activeTab = 'comparison'
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="segment-comparison"]').exists()).toBe(true)
  })

  it('should handle segment save correctly', async () => {
    const segmentData = {
      name: 'New Segment',
      type: SegmentType.INSTITUTION,
      criteria: {}
    }
    
    await wrapper.vm.onSegmentSave(segmentData)
    
    expect(wrapper.vm.showCreateDialog).toBe(false)
    expect(wrapper.vm.editingSegment).toBeNull()
  })

  it('should handle bulk action completion', async () => {
    wrapper.vm.showBulkDialog = true
    
    await wrapper.vm.onBulkActionCompleted()
    
    expect(wrapper.vm.showBulkDialog).toBe(false)
  })

  it('should confirm before deleting segment', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const segment = mockSegments[0]
    
    await wrapper.vm.handleDeleteSegment(segment)
    
    expect(confirmSpy).toHaveBeenCalledWith('Delete Test Segment 1?')
    confirmSpy.mockRestore()
  })

  it('should show error banner when error exists', async () => {
    const { useSegmentation } = await import('@/composables/useSegmentation')
    const composable = useSegmentation()
    composable.error.value = 'Test error'
    
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.error-banner').exists()).toBe(true)
    expect(wrapper.text()).toContain('Test error')
  })

  it('should show loading indicator when loading', async () => {
    const { useSegmentation } = await import('@/composables/useSegmentation')
    const composable = useSegmentation()
    composable.loading.value = true
    
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.v-progress-linear').exists()).toBe(true)
  })
})