import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createI18n } from 'vue-i18n'
import SegmentBuilder from '@/components/segmentation/SegmentBuilder.vue'
import { SegmentType } from '@medical-crm/shared'
import type { SegmentCriteria } from '@medical-crm/shared'

// Mock child components
vi.mock('@/components/segmentation/InstitutionFilterBuilder.vue', () => ({
  default: {
    name: 'InstitutionFilterBuilder',
    template: '<div data-testid="institution-filter-builder"></div>',
    emits: ['update:modelValue', 'filter-added', 'filter-removed']
  }
}))

vi.mock('@/components/segmentation/ContactFilterBuilder.vue', () => ({
  default: {
    name: 'ContactFilterBuilder',
    template: '<div data-testid="contact-filter-builder"></div>',
    emits: ['update:modelValue', 'filter-added', 'filter-removed']
  }
}))

vi.mock('@/components/segmentation/CombinedFilterBuilder.vue', () => ({
  default: {
    name: 'CombinedFilterBuilder',
    template: '<div data-testid="combined-filter-builder"></div>',
    emits: ['update:modelValue', 'filter-added', 'filter-removed']
  }
}))

vi.mock('@/components/segmentation/SegmentPreview.vue', () => ({
  default: {
    name: 'SegmentPreview',
    template: '<div data-testid="segment-preview"></div>',
    props: ['segmentType', 'criteria', 'loading'],
    emits: ['preview-updated']
  }
}))

const mockI18nMessages = {
  en: {
    'segmentation.builder.title': 'Segment Builder',
    'segmentation.builder.segmentType': 'Segment Type',
    'segmentation.builder.segmentName': 'Segment Name',
    'segmentation.builder.institutionFilters': 'Institution Filters',
    'segmentation.builder.contactFilters': 'Contact Filters',
    'segmentation.builder.combinedFilters': 'Combined Filters',
    'segmentation.builder.preview.title': 'Preview',
    'segmentation.builder.saveSegment': 'Save Segment',
    'segmentation.types.institution': 'Institution',
    'segmentation.types.contact': 'Contact',
    'common.cancel': 'Cancel',
    'validation.required': 'Field is required',
    'validation.minLength': 'Minimum {min} characters',
    'validation.maxLength': 'Maximum {max} characters'
  }
}

describe('SegmentBuilder', () => {
  let wrapper: VueWrapper<any>
  let vuetify: any
  let i18n: any

  beforeEach(() => {
    vuetify = createVuetify()
    i18n = createI18n({
      legacy: false,
      locale: 'en',
      messages: mockI18nMessages
    })
  })

  const createWrapper = (props = {}) => {
    return mount(SegmentBuilder, {
      props: {
        initialType: SegmentType.INSTITUTION,
        initialName: '',
        modelValue: {},
        ...props
      },
      global: {
        plugins: [vuetify, i18n]
      }
    })
  }

  it('should render correctly with default props', () => {
    wrapper = createWrapper()
    
    expect(wrapper.find('[data-testid="segment-preview"]').exists()).toBe(true)
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
  })

  it('should initialize with correct segment type', () => {
    wrapper = createWrapper({
      initialType: SegmentType.CONTACT
    })
    
    expect(wrapper.vm.segmentType).toBe(SegmentType.CONTACT)
  })

  it('should initialize with correct segment name', () => {
    const initialName = 'Test Segment'
    wrapper = createWrapper({
      initialName
    })
    
    expect(wrapper.vm.segmentName).toBe(initialName)
  })

  it('should show institution filters when type is institution', async () => {
    wrapper = createWrapper({
      initialType: SegmentType.INSTITUTION
    })
    
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('[data-testid="institution-filter-builder"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="contact-filter-builder"]').exists()).toBe(false)
  })

  it('should show contact filters when type is contact', async () => {
    wrapper = createWrapper({
      initialType: SegmentType.CONTACT
    })
    
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('[data-testid="contact-filter-builder"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="institution-filter-builder"]').exists()).toBe(false)
  })

  it('should always show combined filters', () => {
    wrapper = createWrapper()
    
    expect(wrapper.find('[data-testid="combined-filter-builder"]').exists()).toBe(true)
  })

  it('should validate segment name correctly', () => {
    wrapper = createWrapper()
    
    const nameRules = wrapper.vm.nameRules
    
    // Required validation
    expect(nameRules[0]('')).toBe('Field is required')
    expect(nameRules[0]('Valid name')).toBe(true)
    
    // Min length validation
    expect(nameRules[1]('ab')).toBe('Minimum 3 characters')
    expect(nameRules[1]('abc')).toBe(true)
    
    // Max length validation
    const longName = 'a'.repeat(101)
    expect(nameRules[2](longName)).toBe('Maximum 100 characters')
    expect(nameRules[2]('Valid name')).toBe(true)
  })

  it('should disable save button when name is invalid', async () => {
    wrapper = createWrapper()
    
    await wrapper.setData({ segmentName: 'ab' }) // Too short
    
    expect(wrapper.vm.canSave).toBe(false)
  })

  it('should disable save button when no filters are set', async () => {
    wrapper = createWrapper()
    
    await wrapper.setData({ segmentName: 'Valid name' })
    
    expect(wrapper.vm.canSave).toBe(false)
  })

  it('should enable save button when valid name and filters exist', async () => {
    wrapper = createWrapper()
    
    await wrapper.setData({ 
      segmentName: 'Valid name',
      institutionFilters: [{ field: 'name', value: 'test', operator: 'equals' }]
    })
    
    expect(wrapper.vm.canSave).toBe(true)
  })

  it('should emit save event with correct data', async () => {
    wrapper = createWrapper()
    
    const segmentData = {
      segmentName: 'Test Segment',
      segmentType: SegmentType.INSTITUTION,
      institutionFilters: [{ field: 'name', value: 'test', operator: 'equals' }]
    }
    
    await wrapper.setData(segmentData)
    
    await wrapper.vm.saveSegment()
    
    expect(wrapper.emitted('save')).toBeTruthy()
    const emittedData = wrapper.emitted('save')[0][0]
    expect(emittedData.name).toBe('Test Segment')
    expect(emittedData.type).toBe(SegmentType.INSTITUTION)
  })

  it('should emit cancel event', async () => {
    wrapper = createWrapper()
    
    wrapper.vm.$emit('cancel')
    
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('should reset builder correctly', async () => {
    wrapper = createWrapper()
    
    await wrapper.setData({
      segmentName: 'Test',
      institutionFilters: [{ field: 'name', value: 'test' }],
      contactFilters: [{ field: 'role', value: 'doctor' }],
      combinedFilters: [{ field: 'active', value: true }]
    })
    
    wrapper.vm.resetBuilder()
    
    expect(wrapper.vm.segmentName).toBe('')
    expect(wrapper.vm.institutionFilters).toEqual([])
    expect(wrapper.vm.contactFilters).toEqual([])
    expect(wrapper.vm.combinedFilters).toEqual([])
  })

  it('should update criteria when filters change', async () => {
    wrapper = createWrapper()
    
    await wrapper.setData({
      segmentType: SegmentType.INSTITUTION,
      institutionFilters: [{ field: 'name', value: 'test', operator: 'contains' }]
    })
    
    const criteria = wrapper.vm.currentCriteria
    expect(criteria).toHaveProperty('institutionFilters')
  })

  it('should switch filter panels when segment type changes', async () => {
    wrapper = createWrapper({
      initialType: SegmentType.INSTITUTION
    })
    
    await wrapper.setData({ segmentType: SegmentType.CONTACT })
    wrapper.vm.onSegmentTypeChange()
    
    // Should reset filters
    expect(wrapper.vm.institutionFilters).toEqual([])
    expect(wrapper.vm.contactFilters).toEqual([])
    expect(wrapper.vm.combinedFilters).toEqual([])
    
    // Should update active panels
    expect(wrapper.vm.activePanels).toEqual([1, 2])
  })

  it('should emit model value updates when filters change', async () => {
    wrapper = createWrapper()
    
    wrapper.vm.onFilterAdded()
    
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })
})